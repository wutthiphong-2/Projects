from fastapi import APIRouter, Depends, Query, Request, status
from typing import List, Optional, Dict, Any, Union
from ldap3 import MODIFY_REPLACE, MODIFY_ADD, MODIFY_DELETE
import logging
import json
import time
from pathlib import Path

from app.core.config import settings
from app.core.database import get_ldap_connection
from app.core.exceptions import NotFoundError, InternalServerError, ValidationError
from app.routers.auth import verify_token, verify_token_or_api_key, get_client_ip, check_api_key_permission
from app.core.activity_log import activity_log_manager
from app.core.cache import cached_response, invalidate_cache
from app.core.responses import create_paginated_response
from app.schemas.common import PaginatedResponse
from datetime import datetime, timedelta, timezone
from app.schemas.groups import (
    GroupCreate, GroupUpdate, GroupResponse, GroupMemberAdd, GroupMemberRemove,
    GroupMemberResponse, GroupCreateResponse, GroupUpdateResponse, GroupDeleteResponse,
    GroupMemberAddResponse, GroupMemberRemoveResponse, CategorizedGroupsResponse
)
from app.schemas.ous import DefaultGroupsByOUResponse

router = APIRouter()
logger = logging.getLogger(__name__)

# PSO (Password Settings Object) attributes
PSO_ATTRIBUTES = [
    "cn",
    "description",
    "msDS-MaximumPasswordAge",  # Maximum password age (in days, stored as negative seconds)
    "msDS-MinimumPasswordAge",  # Minimum password age
    "msDS-PasswordSettingsPrecedence",  # Precedence (lower = higher priority)
    "msDS-PasswordComplexityEnabled",  # Password complexity required
    "msDS-PasswordReversibleEncryptionEnabled",  # Store password using reversible encryption
    "msDS-MinimumPasswordLength",  # Minimum password length
    "msDS-PasswordHistoryLength",  # Password history length
    "msDS-LockoutThreshold",  # Account lockout threshold
    "msDS-LockoutObservationWindow",  # Lockout observation window
    "msDS-LockoutDuration",  # Lockout duration
    "msDS-PSOAppliesTo"  # Groups/users this PSO applies to
]

# Helper functions
def format_group_data(entry: tuple) -> Dict[str, Any]:
    """Format LDAP group entry data for response with permissions info"""
    dn, attrs = entry
    
    members = attrs.get("member", [])
    member_count = len(members)
    
    # Parse groupType (AD stores as integer)
    # https://docs.microsoft.com/en-us/windows/win32/adschema/a-grouptype
    group_type_int = int(attrs.get("groupType", ["0"])[0]) if attrs.get("groupType") else 0
    
    # Determine group type and scope
    group_type = "Unknown"
    group_scope = "Unknown"
    
    if group_type_int:
        # Check if it's a security group (bit 31 set = -2147483648)
        is_security = group_type_int < 0
        group_type = "Security" if is_security else "Distribution"
        
        # Determine scope (bits 0-3)
        abs_type = abs(group_type_int)
        if abs_type & 0x00000002:  # Global
            group_scope = "Global"
        elif abs_type & 0x00000004:  # Domain Local
            group_scope = "Domain Local"
        elif abs_type & 0x00000008:  # Universal
            group_scope = "Universal"
        else:
            group_scope = "Unknown"
    
    # Get managed by
    managed_by_dn = attrs.get("managedBy", [""])[0] if attrs.get("managedBy") else ""
    managed_by = ""
    if managed_by_dn:
        # Extract CN from DN
        managed_by = managed_by_dn.split(',')[0].replace('CN=', '')
    
    # Extract OU path from DN for tree structure
    # DN format: CN=GroupName,OU=SubOU,OU=ParentOU,DC=domain,DC=com
    # or: CN=GroupName,CN=Users,DC=domain,DC=com (for built-in containers)
    ou_path = ""
    parent_ou = ""
    
    if ',' in dn:
        parts = dn.split(',')
        # Skip the CN part (the group itself), get container parts
        container_parts = [p for p in parts[1:] if p.startswith('OU=') or p.startswith('CN=')]
        
        if container_parts:
            # Get immediate parent (first OU or CN after the group CN)
            first_container = container_parts[0]
            
            # Extract container name (remove OU= or CN= prefix)
            if first_container.startswith('OU='):
                parent_ou = first_container.replace('OU=', '')
            elif first_container.startswith('CN='):
                parent_ou = first_container.replace('CN=', '')
            
            # Full path (for nested OUs)
            if len(container_parts) > 1:
                # Reverse to show from root to leaf (e.g., "TBKK Groups > FileShare")
                path_parts = [p.replace('OU=', '').replace('CN=', '') for p in container_parts]
                path_parts.reverse()
                ou_path = ' > '.join(path_parts)
            else:
                ou_path = parent_ou
        else:
            # No OU or CN container, must be in root
            parent_ou = "Root"
            ou_path = "Root"
    
    return {
        "dn": dn,
        "cn": attrs.get("cn", [""])[0] if attrs.get("cn") else "",
        "description": attrs.get("description", [""])[0] if attrs.get("description") else "",
        "member": members,
        "memberCount": member_count,
        "groupType": group_type,
        "groupScope": group_scope,
        "managedBy": managed_by if managed_by else None,
        "ouPath": ou_path if ou_path else None,
        "parentOU": parent_ou if parent_ou else "Root"
    }

def format_user_data(entry: tuple) -> Dict[str, Any]:
    """Format LDAP user entry data for response"""
    dn, attrs = entry
    
    # Check if user account is disabled
    user_account_control = int(attrs.get("userAccountControl", ["0"])[0]) if attrs.get("userAccountControl") else 0
    is_disabled = bool(user_account_control & 0x2)
    
    # Get sAMAccountName for backup display name
    sam_account_name = attrs.get("sAMAccountName", [""])[0] if attrs.get("sAMAccountName") else ""
    cn = attrs.get("cn", [""])[0] if attrs.get("cn") else ""
    display_name = attrs.get("displayName", [""])[0] if attrs.get("displayName") else ""
    
    # Use the best available name
    best_name = cn or display_name or sam_account_name or "Unknown"
    
    return {
        "dn": dn,
        "cn": best_name,
        "sAMAccountName": sam_account_name,
        "mail": attrs.get("mail", [""])[0] if attrs.get("mail") else "",
        "department": attrs.get("department", [""])[0] if attrs.get("department") else None,
        "isEnabled": not is_disabled
    }

# Routes
@router.get(
    "",
    response_model=Union[PaginatedResponse[GroupResponse], List[GroupResponse]],
    summary="Get all groups",
    description="Retrieve a paginated list of groups from Active Directory with search capabilities",
    tags=["groups"]
)
@cached_response(ttl_seconds=600)  # ⚡ Cache for 10 minutes
async def get_groups(
    token_data = Depends(verify_token_or_api_key),
    _ = Depends(check_api_key_permission),
    q: str | None = Query(default=None, description="Search text for cn/description"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=50000),  # Increased to 50000
    format: Optional[str] = Query("paginated", regex="^(paginated|simple)$"),  # Backward compatibility
):
    """Get all groups from Active Directory with real-time data"""
    ldap_conn = get_ldap_connection()
    
    try:
        # Use centralized LDAP escape function from security module
        from app.core.ldap_security import ldap_escape

        if q:
            s = ldap_escape(q)
            filter_str = f"(&(objectClass=group)(|(cn=*{s}*)(description=*{s}*)))"
        else:
            filter_str = "(objectClass=group)"

        logger.info(f"🔍 Searching groups with filter: {filter_str}")
        
        results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            filter_str,
            ["cn", "description", "member", "groupType", "managedBy", "distinguishedName"]
        )
        
        if results is None:
            raise InternalServerError("Failed to search groups")
        
        logger.info(f"✅ LDAP returned {len(results)} groups from AD")
        
        groups_all = [format_group_data(entry) for entry in results]
        
        logger.info(f"📊 Formatted {len(groups_all)} groups (page_size={page_size})")
        
        # Log unique parent OUs for debugging
        unique_ous = set([g['parentOU'] for g in groups_all])
        logger.info(f"📁 Found {len(unique_ous)} unique containers: {sorted(unique_ous)}")
        
        total_groups = len(groups_all)
        
        # Backward compatibility: Return simple array if format=simple or page_size >= 1000
        if format == "simple" or page_size >= 1000:
            logger.info(f"🚀 Returning ALL {total_groups} groups to frontend (simple format)")
            return groups_all
        
        # Return paginated response
        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = groups_all[start:end]
        
        return create_paginated_response(
            items=paginated_items,
            total=total_groups,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"Error getting groups: {e}")
        raise InternalServerError("Failed to retrieve groups")

@router.get("/categorized", response_model=CategorizedGroupsResponse)
async def get_categorized_groups(token_data = Depends(verify_token)):
    """Get groups organized by category for user creation form"""
    ldap_conn = get_ldap_connection()
    
    try:
        filter_str = "(objectClass=group)"
        
        results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            filter_str,
            ["cn", "description", "member", "groupType", "managedBy", "distinguishedName"]
        )
        
        if results is None:
            raise InternalServerError("Failed to search groups")
        
        logger.info(f"🔍 Categorizing {len(results)} groups...")
        
        # Initialize categories
        categories = {
            "Internet": [],
            "VPN": [],
            "USB": [],
            "WiFi": [],
            "FileShare": [],
            "PasswordPolicy": [],
            "Remote": [],
            "Aliases": [],
            "Others": []
        }
        
        for entry in results:
            group_data = format_group_data(entry)
            cn = group_data["cn"].lower()
            dn = group_data["dn"].lower()
            
            # Categorize based on group name and DN
            categorized = False
            
            # Internet Access
            if any(keyword in cn for keyword in ["internet", "allowall", "webaccess"]):
                categories["Internet"].append(group_data)
                categorized = True
            
            # VPN Access
            elif any(keyword in cn for keyword in ["vpn", "remote access"]) and "ou=vpn" in dn:
                categories["VPN"].append(group_data)
                categorized = True
            
            # USB Access
            elif any(keyword in cn for keyword in ["usb", "removable"]):
                categories["USB"].append(group_data)
                categorized = True
            
            # WiFi Access
            elif any(keyword in cn for keyword in ["wifi", "wi-fi", "mac qc wifi", "mac authen", "wireless"]):
                categories["WiFi"].append(group_data)
                categorized = True
            
            # File Share (check if in FileShare OU)
            elif "ou=fileshare" in dn:
                categories["FileShare"].append(group_data)
                categorized = True
            
            # Password Policy
            elif any(keyword in cn for keyword in ["pso-", "password policy", "pwdpolicy"]):
                categories["PasswordPolicy"].append(group_data)
                categorized = True
            
            # Remote Access (Remote Desktop, etc.)
            elif any(keyword in cn for keyword in ["remote desktop", "rdp", "terminal server"]):
                categories["Remote"].append(group_data)
                categorized = True
            
            # Aliases (Email Distribution)
            elif "ou=aliases" in dn or cn.startswith("al_"):
                categories["Aliases"].append(group_data)
                categorized = True
            
            # Others (everything else)
            if not categorized:
                categories["Others"].append(group_data)
        
        # Log category counts
        for category, groups in categories.items():
            logger.info(f"  📁 {category}: {len(groups)} groups")
        
        return CategorizedGroupsResponse(
            categories=categories,
            totalGroups=len(results)
        )
        
    except Exception as e:
        logger.error(f"Error getting categorized groups: {e}")
        raise InternalServerError("Failed to retrieve categorized groups")

@router.get("/{dn}", response_model=GroupResponse)
async def get_group(
    dn: str, 
    token_data = Depends(verify_token_or_api_key),
    _ = Depends(check_api_key_permission)
):
    """Get specific group by DN"""
    ldap_conn = get_ldap_connection()
    
    try:
        results = ldap_conn.search(
            dn,
            "(objectClass=group)",
            ["*"]
        )
        
        if not results:
            raise NotFoundError("Group", dn)
        
        return format_group_data(results[0])
        
    except Exception as e:
        logger.error(f"Error getting group {dn}: {e}")
        raise InternalServerError("Failed to retrieve group")

@router.post("", response_model=GroupCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate, 
    token_data = Depends(verify_token_or_api_key),
    _ = Depends(check_api_key_permission)
):
    """Create new group in Active Directory with full AD support"""
    ldap_conn = get_ldap_connection()
    
    try:
        # Determine container for group
        if group_data.ou_dn:
            container = group_data.ou_dn
        else:
            # Default to CN=Users if no OU specified
            container = f"CN=Users,{settings.LDAP_BASE_DN}"
        
        # Prepare group DN
        group_dn = f"CN={group_data.cn},{container}"
        
        logger.info(f"📝 Creating group: {group_dn}")
        logger.info(f"   Type: {group_data.groupType}, Scope: {group_data.groupScope}")
        
        # Calculate groupType integer based on Type and Scope
        # https://docs.microsoft.com/en-us/windows/win32/adschema/a-grouptype
        group_type_map = {
            # Security groups (negative values)
            ("Security", "Global"): -2147483646,
            ("Security", "Domain Local"): -2147483644,
            ("Security", "Universal"): -2147483640,
            # Distribution groups (positive values)
            ("Distribution", "Global"): 2,
            ("Distribution", "Domain Local"): 4,
            ("Distribution", "Universal"): 8,
        }
        
        group_type_value = group_type_map.get(
            (group_data.groupType, group_data.groupScope),
            -2147483646  # Default to Security Global
        )
        
        logger.info(f"   GroupType value: {group_type_value}")

        # Prepare sAMAccountName (pre-Windows 2000 group name)
        sam_account_name = group_data.sAMAccountName or group_data.cn
        # Remove special characters not allowed in sAMAccountName
        sam_account_name = sam_account_name.replace(" ", "").replace(",", "")[:20]
        
        # Prepare group attributes as dictionary of string lists
        group_attrs = {
            "objectClass": ["top", "group"],
            "cn": [group_data.cn],
            "sAMAccountName": [sam_account_name],
            "groupType": [str(group_type_value)],
        }

        # Add optional attributes
        if group_data.description:
            group_attrs["description"] = [group_data.description]
        
        if group_data.mail:
            group_attrs["mail"] = [group_data.mail]
        
        if group_data.info:
            group_attrs["info"] = [group_data.info]
        
        if group_data.managedBy:
            group_attrs["managedBy"] = [group_data.managedBy]

        logger.info(f"   Attributes: {list(group_attrs.keys())}")

        # Create group
        if not ldap_conn.add_entry(group_dn, group_attrs):
            error_msg = ldap_conn.connection.last_error if ldap_conn.connection else "Unknown error"
            logger.error(f"❌ Failed to create group: {error_msg}")
            raise InternalServerError(f"Failed to create group: {error_msg}")
        
        logger.info(f"✅ Group created successfully: {group_dn}")
        
        # ⚡ Invalidate cache after creation
        invalidate_cache("get_groups")
        
        return GroupCreateResponse(
            success=True,
            message="Group created successfully",
            group={
                "dn": group_dn,
                "cn": group_data.cn,
                "sAMAccountName": sam_account_name,
                "description": group_data.description or "",
                "groupType": group_data.groupType,
                "groupScope": group_data.groupScope
            }
        )
        
    except (NotFoundError, InternalServerError, ValidationError):
        raise
    except Exception as e:
        logger.error(f"❌ Error creating group: {e}")
        raise InternalServerError(str(e))

@router.put("/{dn}", response_model=GroupUpdateResponse)
async def update_group(
    dn: str, 
    group_data: GroupUpdate, 
    token_data = Depends(verify_token_or_api_key),
    _ = Depends(check_api_key_permission)
):
    """Update group in Active Directory"""
    ldap_conn = get_ldap_connection()
    
    try:
        modifications = []

        if group_data.description is not None:
            modifications.append((MODIFY_REPLACE, "description", [group_data.description]))

        if not modifications:
            raise ValidationError("No fields to update")

        if not ldap_conn.modify_entry(dn, modifications):
            raise InternalServerError("Failed to update group")
        
        # ⚡ Invalidate cache after update
        invalidate_cache("get_groups")
        
        return GroupUpdateResponse(
            success=True,
            message="Group updated successfully"
        )
        
    except (NotFoundError, InternalServerError, ValidationError):
        raise
    except Exception as e:
        logger.error(f"Error updating group {dn}: {e}")
        raise InternalServerError("Failed to update group")

@router.delete("/{dn}", response_model=GroupDeleteResponse)
async def delete_group(
    dn: str, 
    token_data = Depends(verify_token_or_api_key),
    _ = Depends(check_api_key_permission)
):
    """Delete group from Active Directory"""
    ldap_conn = get_ldap_connection()
    
    try:
        if not ldap_conn.delete_entry(dn):
            raise InternalServerError("Failed to delete group")
        
        # ⚡ Invalidate cache after deletion
        invalidate_cache("get_groups")
        
        return {
            "success": True,
            "message": "Group deleted successfully"
        }
        
    except (NotFoundError, InternalServerError, ValidationError):
        raise
    except Exception as e:
        logger.error(f"Error deleting group {dn}: {e}")
        raise InternalServerError("Failed to delete group")

# Group Member Management Endpoints
@router.get("/{group_dn}/members", response_model=List[GroupMemberResponse])
async def get_group_members(
    group_dn: str, 
    token_data = Depends(verify_token_or_api_key),
    _ = Depends(check_api_key_permission)
):
    """Get all members of a specific group"""
    ldap_conn = get_ldap_connection()
    
    try:
        # First get the group to find its members
        group_results = ldap_conn.search(
            group_dn,
            "(objectClass=group)",
            ["member"]
        )
        
        if not group_results:
            raise NotFoundError("Group", dn)
        
        group_entry = group_results[0]
        member_dns = group_entry[1].get("member", [])
        
        if not member_dns:
            return []
        
        # Get detailed information for each member
        members = []
        for member_dn in member_dns:
            try:
                user_results = ldap_conn.search(
                    member_dn,
                    "(objectClass=user)",
                    ["cn", "sAMAccountName", "displayName", "mail", "department", "userAccountControl"]
                )
                
                if user_results:
                    members.append(format_user_data(user_results[0]))
            except Exception as e:
                logger.warning(f"Could not fetch details for member {member_dn}: {e}")
                # Add basic info if detailed fetch fails
                members.append({
                    "dn": member_dn,
                    "cn": member_dn.split(',')[0].replace('CN=', ''),
                    "sAMAccountName": None,
                    "mail": "",
                    "department": None,
                    "isEnabled": True
                })
        
        return members
        
    except Exception as e:
        logger.error(f"Error getting group members for {group_dn}: {e}")
        raise InternalServerError("Failed to retrieve group members")

@router.post("/{group_dn}/members", response_model=GroupMemberAddResponse, status_code=status.HTTP_201_CREATED)
async def add_group_member(
    group_dn: str, 
    member_data: GroupMemberAdd, 
    request: Request, 
    token_data = Depends(verify_token_or_api_key),
    _ = Depends(check_api_key_permission)
):
    """Add a user to a group and verify memberOf is updated in AD"""
    ldap_conn = get_ldap_connection()
    
    try:
        logger.info(f"Adding user to group: {member_data.user_dn} -> {group_dn}")
        
        # Verify that the user exists and get current memberOf
        user_results = ldap_conn.search(
            member_data.user_dn,
            "(objectClass=user)",
            ["cn", "sAMAccountName", "memberOf"]
        )
        
        if not user_results:
            raise NotFoundError("User", member_data.user_dn)
        
        user_cn = user_results[0][1].get("cn", ["Unknown"])[0]
        user_sam = user_results[0][1].get("sAMAccountName", ["Unknown"])[0]
        old_member_of = user_results[0][1].get("memberOf", [])
        
        logger.info(f"User before: {user_sam} is member of {len(old_member_of)} groups")
        
        # Check if user is already a member of this group
        if group_dn in old_member_of:
            logger.info(f"User {user_sam} is already a member of group {group_dn}. Returning success (idempotent operation).")
            group_cn = group_dn.split(',')[0].replace('CN=', '')
            return GroupMemberAddResponse(
                success=True,
                message=f"User {user_sam} is already a member of this group.",
                user_dn=member_data.user_dn,
                user_cn=user_cn,
                groups_before=len(old_member_of),
                groups_after=len(old_member_of),
                already_member=True
            )
        
        # Add user to group by modifying the group's member attribute
        modifications = [(MODIFY_ADD, "member", [member_data.user_dn])]
        
        if not ldap_conn.modify_entry(group_dn, modifications):
            error_msg = ldap_conn.connection.last_error if ldap_conn.connection else "Unknown error"
            
            # Check if error is due to entry already existing (race condition or AD replication delay)
            if "entryAlreadyExists" in error_msg or "entry already exists" in error_msg.lower():
                logger.info(f"User {user_sam} appears to already be a member (entryAlreadyExists). Verifying...")
                
                # Verify current membership status
                time.sleep(0.3)  # Brief wait for AD replication
                
                user_results_check = ldap_conn.search(
                    member_data.user_dn,
                    "(objectClass=user)",
                    ["memberOf"]
                )
                
                if user_results_check:
                    current_member_of = user_results_check[0][1].get("memberOf", [])
                    if group_dn in current_member_of:
                        logger.info(f"Verified: User {user_sam} is already a member. Returning success.")
                        group_cn = group_dn.split(',')[0].replace('CN=', '')
                        return GroupMemberAddResponse(
                            success=True,
                            message=f"User {user_sam} is already a member of this group.",
                            user_dn=member_data.user_dn,
                            user_cn=user_cn,
                            groups_before=len(old_member_of),
                            groups_after=len(current_member_of),
                            already_member=True
                        )
            
            # If not an entryAlreadyExists error, raise the error
            logger.error(f"Failed to add member: {error_msg}")
            raise InternalServerError(f"Failed to add member to group: {error_msg}")
        
        logger.info(f"Successfully modified group {group_dn}")
        
        # Verify that memberOf was updated in AD (check after modification)
        time.sleep(0.5)  # Wait for AD to update memberOf attribute
        
        user_results_after = ldap_conn.search(
            member_data.user_dn,
            "(objectClass=user)",
            ["memberOf"]
        )
        
        if user_results_after:
            new_member_of = user_results_after[0][1].get("memberOf", [])
            logger.info(f"User after: {user_sam} is now member of {len(new_member_of)} groups")
            
            # Check if the group DN is in memberOf
            if group_dn in new_member_of:
                logger.info(f"Verified: memberOf attribute updated in AD for {user_sam}")
                
                # ⚡ Auto-update accountExpires for PSO-OU-90Days group
                group_cn = group_dn.split(',')[0].replace('CN=', '')
                if group_cn == "PSO-OU-90Days":
                    try:
                        # Get user's pwdLastSet (password last set date)
                        user_pwd_results = ldap_conn.search(
                            member_data.user_dn,
                            "(objectClass=user)",
                            ["pwdLastSet"]
                        )
                        
                        if user_pwd_results:
                            pwd_last_set_raw = user_pwd_results[0][1].get("pwdLastSet", [None])[0]
                            
                            if pwd_last_set_raw and pwd_last_set_raw != "0":
                                # Import helper functions from users router
                                from app.routers.users import ad_timestamp_to_datetime, datetime_to_filetime
                                
                                # Parse pwdLastSet to datetime
                                pwd_last_set_dt = ad_timestamp_to_datetime(pwd_last_set_raw)
                                
                                if pwd_last_set_dt:
                                    # Calculate expiration: pwdLastSet + 90 days
                                    expiry_date = pwd_last_set_dt + timedelta(days=90)
                                    
                                    # Convert to Windows FILETIME format
                                    filetime_str = datetime_to_filetime(expiry_date)
                                    
                                    # Update accountExpires attribute
                                    user_modifications = [(MODIFY_REPLACE, "accountExpires", [filetime_str])]
                                    if ldap_conn.modify_entry(member_data.user_dn, user_modifications):
                                        logger.info(f"✅ Updated accountExpires to {expiry_date.strftime('%Y-%m-%d')} (90 days from pwdLastSet {pwd_last_set_dt.strftime('%Y-%m-%d')}) for user {user_sam}")
                                    else:
                                        logger.warning(f"⚠️ Failed to update accountExpires for user {user_sam}: {ldap_conn.connection.last_error if ldap_conn.connection else 'Unknown error'}")
                                else:
                                    logger.warning(f"⚠️ Could not parse pwdLastSet for user {user_sam}, skipping accountExpires update")
                            else:
                                logger.warning(f"⚠️ User {user_sam} has no pwdLastSet (password never set), skipping accountExpires update")
                        else:
                            logger.warning(f"⚠️ Could not fetch user data for {user_sam}, skipping accountExpires update")
                    except Exception as exp_error:
                        logger.error(f"Error updating accountExpires for user {user_sam}: {exp_error}")
            else:
                logger.warning(f"Warning: memberOf not yet updated (may take a moment for AD replication)")
        
        # Log activity
        group_cn = group_dn.split(',')[0].replace('CN=', '')
        activity_log_manager.log_activity(
            user_id=token_data.username,
            action_type="group_member_add",
            target_type="group",
            target_id=group_dn,
            target_name=group_cn,
            details={"user_added": user_sam, "user_dn": member_data.user_dn},
            ip_address=get_client_ip(request),
            status="success"
        )
        
        return GroupMemberAddResponse(
            success=True,
            message=f"Member added to group successfully. User {user_sam} is now a member.",
            user_dn=member_data.user_dn,
            user_cn=user_cn,
            groups_before=len(old_member_of),
            groups_after=len(new_member_of) if user_results_after else len(old_member_of)
        )
        
    except (NotFoundError, InternalServerError, ValidationError):
        raise
    except Exception as e:
        logger.error(f"Error adding member to group {group_dn}: {e}")
        raise InternalServerError("Failed to add member to group")

@router.delete("/{group_dn}/members", response_model=GroupMemberRemoveResponse)
async def remove_group_member(
    group_dn: str, 
    member_data: GroupMemberRemove, 
    request: Request, 
    token_data = Depends(verify_token_or_api_key),
    _ = Depends(check_api_key_permission)
):
    """Remove a user from a group and verify memberOf is updated in AD"""
    ldap_conn = get_ldap_connection()
    
    try:
        logger.info(f"Removing user from group: {member_data.user_dn} -> {group_dn}")
        
        # Get current memberOf before removal
        user_results = ldap_conn.search(
            member_data.user_dn,
            "(objectClass=user)",
            ["cn", "sAMAccountName", "memberOf"]
        )
        
        user_cn = "Unknown"
        user_sam = "Unknown"
        old_member_of = []
        
        if user_results:
            user_cn = user_results[0][1].get("cn", ["Unknown"])[0]
            user_sam = user_results[0][1].get("sAMAccountName", ["Unknown"])[0]
            old_member_of = user_results[0][1].get("memberOf", [])
            logger.info(f"User before: {user_sam} is member of {len(old_member_of)} groups")
        
        # Remove user from group by modifying the group's member attribute
        modifications = [(MODIFY_DELETE, "member", [member_data.user_dn])]
        
        if not ldap_conn.modify_entry(group_dn, modifications):
            error_msg = ldap_conn.connection.last_error if ldap_conn.connection else "Unknown error"
            logger.error(f"Failed to remove member: {error_msg}")
            raise InternalServerError(f"Failed to remove member from group: {error_msg}")
        
        logger.info(f"Successfully removed from group {group_dn}")
        
        # Verify that memberOf was updated in AD
        import time
        time.sleep(0.5)  # Wait for AD to update memberOf attribute
        
        user_results_after = ldap_conn.search(
            member_data.user_dn,
            "(objectClass=user)",
            ["memberOf"]
        )
        
        if user_results_after:
            new_member_of = user_results_after[0][1].get("memberOf", [])
            logger.info(f"User after: {user_sam} is now member of {len(new_member_of)} groups")
            
            # Check if the group DN is NOT in memberOf
            if group_dn not in new_member_of:
                logger.info(f"Verified: memberOf attribute updated in AD for {user_sam}")
                
                # ⚡ Reset accountExpires when removed from PSO-OU-90Days group
                group_cn = group_dn.split(',')[0].replace('CN=', '')
                if group_cn == "PSO-OU-90Days":
                    try:
                        # Reset accountExpires to 0 (never expires)
                        user_modifications = [(MODIFY_REPLACE, "accountExpires", ["0"])]
                        if ldap_conn.modify_entry(member_data.user_dn, user_modifications):
                            logger.info(f"✅ Reset accountExpires (never expires) for user {user_sam} after removing from PSO-OU-90Days")
                        else:
                            logger.warning(f"⚠️ Failed to reset accountExpires for user {user_sam}: {ldap_conn.connection.last_error if ldap_conn.connection else 'Unknown error'}")
                    except Exception as exp_error:
                        logger.error(f"Error resetting accountExpires for user {user_sam}: {exp_error}")
            else:
                logger.warning(f"Warning: memberOf still shows group (may take a moment for AD replication)")
        
        # Log activity
        group_cn = group_dn.split(',')[0].replace('CN=', '')
        activity_log_manager.log_activity(
            user_id=token_data.username,
            action_type="group_member_remove",
            target_type="group",
            target_id=group_dn,
            target_name=group_cn,
            details={"user_removed": user_sam, "user_dn": member_data.user_dn},
            ip_address=get_client_ip(request),
            status="success"
        )
        
        return {
            "success": True,
            "message": f"Member removed from group successfully. User {user_sam} is no longer a member.",
            "user_dn": member_data.user_dn,
            "user_cn": user_cn,
            "groups_before": len(old_member_of),
            "groups_after": len(new_member_of) if user_results_after else len(old_member_of)
        }
        
    except Exception as e:
        logger.error(f"Error removing member from group {group_dn}: {e}")
        raise InternalServerError("Failed to remove member from group")

@router.get("/{group_dn}/available-users", response_model=List[GroupMemberResponse])
async def get_available_users_for_group(
    group_dn: str, 
    token_data = Depends(verify_token_or_api_key),
    _ = Depends(check_api_key_permission)
):
    """Get users that can be added to the group (not already members)"""
    ldap_conn = get_ldap_connection()
    
    try:
        logger.info(f"👥 Getting available users for group: {group_dn}")
        
        # First get current group members
        group_results = ldap_conn.search(
            group_dn,
            "(objectClass=group)",
            ["member"]
        )
        
        if not group_results:
            raise NotFoundError("Group", dn)
        
        group_entry = group_results[0]
        current_member_dns = set(group_entry[1].get("member", []))
        logger.info(f"  Current members: {len(current_member_dns)}")
        
        # Get all users (force fresh query, no cache)
        # Search in ALL possible locations (CN=Users, OUs, etc.)
        user_results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            "(objectClass=user)",
            ["cn", "sAMAccountName", "displayName", "mail", "department", "userAccountControl"]
        )
        
        if not user_results:
            logger.warning("  No users found in AD")
            return []
        
        logger.info(f"  Total users in AD: {len(user_results)}")
        
        # Log all user DNs for debugging
        all_user_dns = [entry[0] for entry in user_results]
        logger.info(f"  User locations (sample): {all_user_dns[:5]}")
        
        # Check if specific user exists (for debugging)
        finaltest_users = [dn for dn in all_user_dns if 'finaltest' in dn.lower()]
        if finaltest_users:
            logger.info(f"  🔍 Found users with 'finaltest': {finaltest_users}")
        
        # Filter out users who are already members
        available_users = []
        for user_entry in user_results:
            user_dn = user_entry[0]
            user_attrs = user_entry[1]
            
            if user_dn not in current_member_dns:
                formatted = format_user_data(user_entry)
                available_users.append(formatted)
                
                # Log newly created users
                sam = user_attrs.get("sAMAccountName", [""])[0]
                if sam and 'test' in sam.lower():
                    logger.info(f"  • Found test user: {formatted['cn']} ({sam})")
        
        logger.info(f"✅ Available users (not in group): {len(available_users)}")
        if len(available_users) > 0:
            logger.info(f"  Sample available users: {', '.join([u['cn'] for u in available_users[:10]])}")
        
        return available_users
        
    except Exception as e:
        logger.error(f"❌ Error getting available users for group {group_dn}: {e}")
        raise InternalServerError("Failed to retrieve available users")

@router.get("/pso/{group_name}")
async def get_pso_settings(group_name: str, token_data = Depends(verify_token)):
    """Get Password Settings Object (PSO) configuration for a specific group"""
    ldap_conn = get_ldap_connection()
    
    try:
        # Search for PSO object in AD
        # PSO objects are typically in CN=Password Settings Container,CN=System,<BASE_DN>
        pso_base = f"CN=Password Settings Container,CN=System,{settings.LDAP_BASE_DN}"
        
        # Search for PSO by name
        pso_filter = f"(&(objectClass=msDS-PasswordSettings)(cn={group_name}))"
        
        logger.info(f"Searching for PSO: {group_name} in {pso_base}")
        
        pso_results = ldap_conn.search(
            pso_base,
            pso_filter,
            PSO_ATTRIBUTES
        )
        
        if not pso_results or len(pso_results) == 0:
            # Try searching in entire domain if not found in default location
            logger.info(f"PSO not found in default location, searching entire domain...")
            pso_results = ldap_conn.search(
                settings.LDAP_BASE_DN,
                pso_filter,
                PSO_ATTRIBUTES
            )
        
        if not pso_results or len(pso_results) == 0:
            raise NotFoundError("PSO", group_name)
        
        pso_entry = pso_results[0]
        dn, attrs = pso_entry
        
        # Parse PSO attributes
        def get_attr(name, default=None):
            value = attrs.get(name, [default])[0] if attrs.get(name) else default
            return value
        
        # Convert msDS-MaximumPasswordAge from negative seconds to days
        max_age_seconds = get_attr("msDS-MaximumPasswordAge")
        max_age_days = None
        if max_age_seconds and max_age_seconds != "0":
            try:
                # AD stores as negative seconds, convert to positive days
                max_age_days = abs(int(max_age_seconds)) // 86400
            except (ValueError, TypeError):
                pass
        
        # Convert msDS-MinimumPasswordAge from negative seconds to days
        min_age_seconds = get_attr("msDS-MinimumPasswordAge")
        min_age_days = None
        if min_age_seconds and min_age_seconds != "0":
            try:
                min_age_days = abs(int(min_age_seconds)) // 86400
            except (ValueError, TypeError):
                pass
        
        # Convert lockout duration and observation window from negative seconds to minutes
        lockout_duration_seconds = get_attr("msDS-LockoutDuration")
        lockout_duration_minutes = None
        if lockout_duration_seconds and lockout_duration_seconds != "0":
            try:
                lockout_duration_minutes = abs(int(lockout_duration_seconds)) // 60
            except (ValueError, TypeError):
                pass
        
        lockout_window_seconds = get_attr("msDS-LockoutObservationWindow")
        lockout_window_minutes = None
        if lockout_window_seconds and lockout_window_seconds != "0":
            try:
                lockout_window_minutes = abs(int(lockout_window_seconds)) // 60
            except (ValueError, TypeError):
                pass
        
        pso_data = {
            "dn": dn,
            "cn": get_attr("cn", "Unknown"),
            "description": get_attr("description", ""),
            "precedence": get_attr("msDS-PasswordSettingsPrecedence", 0),
            "passwordPolicy": {
                "maximumPasswordAge": {
                    "seconds": max_age_seconds,
                    "days": max_age_days
                },
                "minimumPasswordAge": {
                    "seconds": min_age_seconds,
                    "days": min_age_days
                },
                "minimumPasswordLength": get_attr("msDS-MinimumPasswordLength", 0),
                "passwordHistoryLength": get_attr("msDS-PasswordHistoryLength", 0),
                "passwordComplexityEnabled": bool(get_attr("msDS-PasswordComplexityEnabled", False)),
                "passwordReversibleEncryptionEnabled": bool(get_attr("msDS-PasswordReversibleEncryptionEnabled", False))
            },
            "lockoutPolicy": {
                "lockoutThreshold": get_attr("msDS-LockoutThreshold", 0),
                "lockoutDuration": {
                    "seconds": lockout_duration_seconds,
                    "minutes": lockout_duration_minutes
                },
                "lockoutObservationWindow": {
                    "seconds": lockout_window_seconds,
                    "minutes": lockout_window_minutes
                }
            },
            "appliesTo": get_attr("msDS-PSOAppliesTo", [])
        }
        
        logger.info(f"✅ Retrieved PSO settings for {group_name}")
        return pso_data
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting PSO settings for {group_name}: {e}")
        raise InternalServerError(f"Failed to retrieve PSO settings: {str(e)}")

@router.post("/pso/{group_name}/sync-account-expires")
async def sync_account_expires_for_pso_group(group_name: str, token_data = Depends(verify_token)):
    """Update accountExpires for all users in PSO group based on their pwdLastSet + 90 days"""
    ldap_conn = get_ldap_connection()
    
    try:
        from app.routers.users import ad_timestamp_to_datetime, datetime_to_filetime
        
        # Find the group DN
        group_results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            f"(&(objectClass=group)(cn={group_name}))",
            ["member", "cn"]
        )
        
        if not group_results or len(group_results) == 0:
            raise NotFoundError("Group", group_name)
        
        group_entry = group_results[0]
        group_dn = group_entry[0]
        members = group_entry[1].get("member", [])
        
        if not members:
            return {
                "success": True,
                "message": f"No members in group {group_name}",
                "updated": 0,
                "failed": 0
            }
        
        logger.info(f"Found {len(members)} members in group {group_name}")
        
        updated_count = 0
        failed_count = 0
        skipped_count = 0
        
        for member_dn in members:
            try:
                # Get user's pwdLastSet
                user_results = ldap_conn.search(
                    member_dn,
                    "(objectClass=user)",
                    ["pwdLastSet", "sAMAccountName"]
                )
                
                if not user_results:
                    skipped_count += 1
                    continue
                
                user_attrs = user_results[0][1]
                user_sam = user_attrs.get("sAMAccountName", ["Unknown"])[0]
                pwd_last_set_raw = user_attrs.get("pwdLastSet", [None])[0]
                
                if not pwd_last_set_raw or pwd_last_set_raw == "0":
                    logger.info(f"Skipping {user_sam}: no pwdLastSet")
                    skipped_count += 1
                    continue
                
                # Parse pwdLastSet and calculate expiry
                pwd_last_set_dt = ad_timestamp_to_datetime(pwd_last_set_raw)
                if not pwd_last_set_dt:
                    logger.warning(f"Could not parse pwdLastSet for {user_sam}")
                    skipped_count += 1
                    continue
                
                # Calculate: pwdLastSet + 90 days
                expiry_date = pwd_last_set_dt + timedelta(days=90)
                filetime_str = datetime_to_filetime(expiry_date)
                
                # Update accountExpires
                user_modifications = [(MODIFY_REPLACE, "accountExpires", [filetime_str])]
                if ldap_conn.modify_entry(member_dn, user_modifications):
                    logger.info(f"✅ Updated accountExpires for {user_sam}: {expiry_date.strftime('%Y-%m-%d')}")
                    updated_count += 1
                else:
                    logger.warning(f"⚠️ Failed to update accountExpires for {user_sam}")
                    failed_count += 1
                    
            except Exception as e:
                logger.error(f"Error processing member {member_dn}: {e}")
                failed_count += 1
        
        return {
            "success": True,
            "message": f"Sync completed for group {group_name}",
            "total_members": len(members),
            "updated": updated_count,
            "failed": failed_count,
            "skipped": skipped_count
        }
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error syncing accountExpires for group {group_name}: {e}")
        raise InternalServerError(f"Failed to sync accountExpires: {str(e)}")

@router.get("/default-groups-by-ou", response_model=DefaultGroupsByOUResponse)
async def get_default_groups_by_ou(ou_dn: str):
    """
    ดึงรายชื่อกลุ่มที่แนะนำตาม OU
    อ่านจากไฟล์ config โดยตรง ไม่ต้อง authentication
    """
    try:
        logger.info(f"🔍 API called with ou_dn: {ou_dn}")
        
        # อ่านไฟล์ config
        config_path = Path("department_defaults_config.json")
        
        logger.info(f"📁 Looking for config at: {config_path.absolute()}")
        
        if not config_path.exists():
            logger.error(f"❌ Config file NOT found")
            return DefaultGroupsByOUResponse(department=None, group_names=[], total_users=0)
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        
        logger.info(f"✅ Config loaded successfully")
        
        # แยก department code จาก OU DN
        department_code = None
        parts = ou_dn.split(',')
        
        logger.info(f"🔍 Parsing OU parts...")
        for part in parts:
            part = part.strip()
            logger.info(f"   Part: {part}")
            if part.startswith('OU=') and '-K1' in part:
                department_code = part.replace('OU=', '')
                logger.info(f"✅ Found department: {department_code}")
                break
        
        if not department_code:
            logger.error(f"❌ Could not extract department code from: {ou_dn}")
            return DefaultGroupsByOUResponse(department=None, group_names=[], total_users=0)
        
        # ดึงข้อมูลจาก config
        dept_config = config_data.get('departments', {}).get(department_code, {})
        group_names = dept_config.get('default_groups', [])
        total_users = dept_config.get('total_users_analyzed', 0)
        
        logger.info(f"✅ Default groups for {department_code}: {len(group_names)} groups - {group_names}")
        
        return DefaultGroupsByOUResponse(
            department=department_code,
            group_names=group_names,
            total_users=total_users
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting default groups: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return DefaultGroupsByOUResponse(department=None, group_names=[], total_users=0)
