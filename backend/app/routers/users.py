from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from ldap3 import MODIFY_REPLACE, MODIFY_ADD
import ldap3
from datetime import datetime, timedelta
import logging
import re
import platform
import subprocess
import base64

from app.core.config import settings
from app.core.database import get_ldap_connection
from app.routers.auth import verify_token, get_client_ip
from app.core.cache import cached_response, invalidate_cache
from app.core.activity_log import activity_logger

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models
class UserCreate(BaseModel):
    cn: str
    sAMAccountName: str
    password: str
    mail: EmailStr
    displayName: Optional[str] = None
    givenName: Optional[str] = None
    sn: Optional[str] = None
    title: Optional[str] = None
    telephoneNumber: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    employeeID: Optional[str] = None
    physicalDeliveryOfficeName: Optional[str] = None
    streetAddress: Optional[str] = None
    l: Optional[str] = None  # city/locality in AD
    st: Optional[str] = None  # state in AD
    postalCode: Optional[str] = None
    co: Optional[str] = None  # country in AD
    description: Optional[str] = None
    # New fields for enhanced user creation
    ou: Optional[str] = None  # OU DN where user will be created
    groups: Optional[List[str]] = []  # List of group DNs to add user to
    mustChangePassword: Optional[bool] = False  # User must change password at next logon
    passwordNeverExpires: Optional[bool] = False  # Password never expires
    accountDisabled: Optional[bool] = False  # Create account as disabled

class UserUpdate(BaseModel):
    cn: Optional[str] = None
    password: Optional[str] = None  # For password reset
    mail: Optional[EmailStr] = None
    displayName: Optional[str] = None
    givenName: Optional[str] = None
    sn: Optional[str] = None
    title: Optional[str] = None
    telephoneNumber: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    employeeID: Optional[str] = None
    physicalDeliveryOfficeName: Optional[str] = None
    streetAddress: Optional[str] = None
    l: Optional[str] = None  # city/locality in AD
    st: Optional[str] = None  # state in AD
    postalCode: Optional[str] = None
    co: Optional[str] = None  # country in AD
    description: Optional[str] = None

class UserResponse(BaseModel):
    dn: str
    cn: str
    sAMAccountName: str
    mail: str
    displayName: str
    givenName: Optional[str] = None
    sn: Optional[str] = None
    title: Optional[str] = None
    telephoneNumber: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    employeeID: Optional[str] = None
    physicalDeliveryOfficeName: Optional[str] = None
    streetAddress: Optional[str] = None
    l: Optional[str] = None  # city/locality in AD
    st: Optional[str] = None  # state in AD
    postalCode: Optional[str] = None
    co: Optional[str] = None  # country in AD
    description: Optional[str] = None
    userAccountControl: int
    memberOf: List[str]
    isEnabled: bool
    whenCreated: Optional[str] = None
    whenChanged: Optional[str] = None
    lastLogon: Optional[str] = None
    pwdLastSet: Optional[str] = None

# Helper functions
def is_account_disabled(user_account_control: int) -> bool:
    """Check if user account is disabled"""
    return bool(user_account_control & 0x2)

def format_user_data(entry: tuple, full_details: bool = True) -> Dict[str, Any]:
    """Format LDAP entry data for response
    
    Args:
        entry: LDAP entry tuple (dn, attrs)
        full_details: If True, include all attributes. If False, only essential for list view.
    """
    dn, attrs = entry
    
    def get_attr(attr_name: str, default: str = "") -> str:
        """Helper to get first value from attribute"""
        val = attrs.get(attr_name, [default])
        return val[0] if val else default
    
    user_account_control = int(attrs.get("userAccountControl", ["0"])[0]) if attrs.get("userAccountControl") else 0
    
    # Always include basic info
    result = {
        "dn": dn,
        "cn": get_attr("cn"),
        "sAMAccountName": get_attr("sAMAccountName"),
        "mail": get_attr("mail"),
        "displayName": get_attr("displayName"),
        "department": get_attr("department") or None,
        "physicalDeliveryOfficeName": get_attr("physicalDeliveryOfficeName") or None,
        "title": get_attr("title") or None,
        "description": get_attr("description") or None,
        "userAccountControl": user_account_control,
        "isEnabled": not is_account_disabled(user_account_control),
    }
    
    # Only include full details when requested (single user view)
    if full_details:
        result.update({
            "givenName": get_attr("givenName") or None,
            "sn": get_attr("sn") or None,
            "telephoneNumber": get_attr("telephoneNumber") or None,
            "mobile": get_attr("mobile") or None,
            "company": get_attr("company") or None,
            "employeeID": get_attr("employeeID") or None,
            "streetAddress": get_attr("streetAddress") or None,
            "l": get_attr("l") or None,
            "st": get_attr("st") or None,
            "postalCode": get_attr("postalCode") or None,
            "co": get_attr("co") or None,
            "memberOf": attrs.get("memberOf", []),
            "whenCreated": get_attr("whenCreated") or None,
            "whenChanged": get_attr("whenChanged") or None,
            "lastLogon": get_attr("lastLogon") or None,
            "pwdLastSet": get_attr("pwdLastSet") or None,
        })
    else:
        # ⚡ Include whenCreated for sorting even in list view
        result.update({
            "givenName": None,
            "sn": None,
            "telephoneNumber": None,
            "mobile": None,
            "company": None,
            "employeeID": None,
            "streetAddress": None,
            "l": None,
            "st": None,
            "postalCode": None,
            "co": None,
            "memberOf": [],
            "whenCreated": get_attr("whenCreated") or None,  # ⚡ Include for sorting
            "whenChanged": None,
            "lastLogon": None,
            "pwdLastSet": None,
        })
    
    return result

# Routes
@router.get("/", response_model=List[UserResponse])
@cached_response(ttl_seconds=600)  # ⚡ Cache for 10 minutes (เพิ่มความเร็ว)
async def get_users(
    q: Optional[str] = None,
    department: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50000),  # Increased limit to 50000
    # Advanced search parameters
    search_mode: Optional[str] = Query("contains", regex="^(contains|starts_with|exact|ends_with)$"),
    search_name: Optional[str] = None,
    search_username: Optional[str] = None,
    search_email: Optional[str] = None,
    search_display_name: Optional[str] = None,
    search_title: Optional[str] = None,
    search_department: Optional[str] = None,
    search_office: Optional[str] = None,
    token: str = Depends(verify_token)
):
    """Get all users from Active Directory with advanced search support
    
    Search Modes:
    - contains: *text* (default)
    - starts_with: text*
    - exact: text
    - ends_with: *text
    
    Advanced Search: Use search_name, search_username, search_email, etc. for field-specific search
    Basic Search: Use 'q' for general search across name, username, and email
    """
    ldap_conn = get_ldap_connection()
    
    try:
        def ldap_escape(value: str) -> str:
            return (
                value.replace("\\", r"\\5c")
                .replace("*", r"\\2a")
                .replace("(", r"\\28")
                .replace(")", r"\\29")
                .replace("\x00", r"\\00")
            )
        
        def apply_search_mode(value: str, mode: str) -> str:
            """Apply search mode to value (add wildcards)"""
            escaped = ldap_escape(value)
            if mode == "contains":
                return f"*{escaped}*"
            elif mode == "starts_with":
                return f"{escaped}*"
            elif mode == "exact":
                return escaped
            elif mode == "ends_with":
                return f"*{escaped}"
            return f"*{escaped}*"  # default to contains

        # Build search filters
        search_filters = []
        
        # Advanced search - field-specific
        if search_name:
            pattern = apply_search_mode(search_name, search_mode)
            search_filters.append(f"(cn={pattern})")
        
        if search_username:
            pattern = apply_search_mode(search_username, search_mode)
            search_filters.append(f"(sAMAccountName={pattern})")
        
        if search_email:
            pattern = apply_search_mode(search_email, search_mode)
            search_filters.append(f"(mail={pattern})")
        
        if search_display_name:
            pattern = apply_search_mode(search_display_name, search_mode)
            search_filters.append(f"(displayName={pattern})")
        
        if search_title:
            pattern = apply_search_mode(search_title, search_mode)
            search_filters.append(f"(title={pattern})")
        
        if search_department:
            pattern = apply_search_mode(search_department, search_mode)
            search_filters.append(f"(department={pattern})")
        
        if search_office:
            pattern = apply_search_mode(search_office, search_mode)
            search_filters.append(f"(physicalDeliveryOfficeName={pattern})")
        
        # Basic search (backward compatible) - OR across common fields
        if q and not search_filters:
            s = apply_search_mode(q, search_mode)
            base_filter = f"(&(objectClass=user)(|(cn={s})(sAMAccountName={s})(mail={s})(displayName={s})))"
        elif search_filters:
            # Advanced search - AND all specified fields
            combined_filters = "".join(search_filters)
            base_filter = f"(&(objectClass=user){combined_filters})"
        else:
            base_filter = "(objectClass=user)"

        # Legacy department filter (for backward compatibility)
        if department:
            d = apply_search_mode(department, search_mode)
            filter_str = f"(&{base_filter}(department={d}))"
        else:
            filter_str = base_filter

        # ⚡ PERFORMANCE: Fetch only essential fields (5x faster!)
        logger.info(f"🔍 Searching users with filter: {filter_str} (mode: {search_mode})")
        results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            filter_str,
            ["cn", "sAMAccountName", "mail", "displayName", "department", 
             "physicalDeliveryOfficeName", "description", "userAccountControl", "whenCreated"]
        )
        
        if results is None:
            raise HTTPException(status_code=500, detail="Failed to search users")
        
        logger.info(f"✅ LDAP returned {len(results)} raw results from AD")
        
        # ⚡ PERFORMANCE: Use lightweight format (faster processing!)
        users_all = [format_user_data(entry, full_details=False) for entry in results]
        
        # ⚡ Sort by whenCreated (newest first)
        users_all.sort(key=lambda u: u.get('whenCreated') or '', reverse=True)
        logger.info(f"📊 Formatted and sorted {len(users_all)} users by creation date (newest first)")
        
        # Return all users if page_size is 1000 or more (frontend requests)
        if page_size >= 1000:
            logger.info(f"🚀 Returning ALL {len(users_all)} users to frontend (no pagination)")
            return users_all
        start = (page - 1) * page_size
        end = start + page_size
        return users_all[start:end]
        
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve users")


@router.get("/departments", response_model=List[str])
async def get_departments(token: str = Depends(verify_token)):
    """Return unique list of departments found in AD users"""
    ldap_conn = get_ldap_connection()
    try:
        # Optimized: Only fetch users with department attribute
        results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            "(&(objectClass=user)(department=*))",
            ["department"]
        )

        if results is None:
            raise HTTPException(status_code=500, detail="Failed to search departments")

        deps = set()
        for entry in results:
            dn, attrs = entry
            dept = attrs.get("department")
            if dept:
                # department may be list
                if isinstance(dept, list):
                    for d in dept:
                        if d:
                            deps.add(d)
                else:
                    deps.add(dept)

        sorted_deps = sorted([d for d in deps if d])
        
        return sorted_deps
    except Exception as e:
        logger.error(f"Error getting departments: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve departments")


@router.get("/groups", response_model=List[Dict[str, str]])
async def get_groups(token: str = Depends(verify_token)):
    """Return list of groups (cn and dn) from AD"""
    ldap_conn = get_ldap_connection()
    try:
        results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            "(objectClass=group)",
            ["cn", "member"]
        )

        if results is None:
            raise HTTPException(status_code=500, detail="Failed to search groups")

        groups = []
        for entry in results:
            dn, attrs = entry
            cn = attrs.get("cn", [None])[0] if attrs.get("cn") else None
            groups.append({"dn": dn, "cn": cn})

        # Optionally sort by cn
        groups.sort(key=lambda g: (g.get('cn') or '').lower())
        return groups
    except Exception as e:
        logger.error(f"Error getting groups: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve groups")


@router.get("/groups/members", response_model=List[UserResponse])
async def get_group_members(group_dn: str, token: str = Depends(verify_token)):
    """Return members of a given group DN"""
    ldap_conn = get_ldap_connection()
    try:
        # Search the group to get member attribute values (DNs)
        results = ldap_conn.search(
            group_dn,
            "(objectClass=group)",
            ["member"]
        )

        if not results:
            return []

        dn, attrs = results[0]
        members = attrs.get("member", [])
        user_entries = []
        # For each member DN, fetch user attributes
        for member_dn in members:
            user_res = ldap_conn.search(
                member_dn,
                "(objectClass=user)",
                ["cn", "sAMAccountName", "mail", "displayName", "givenName", "sn", 
                 "title", "telephoneNumber", "mobile", "department", "company", 
                 "employeeID", "physicalDeliveryOfficeName", "streetAddress", "l", 
                 "st", "postalCode", "co", "description",
                 "userAccountControl", "memberOf", "whenCreated", "whenChanged", 
                 "lastLogon", "pwdLastSet"]
            )
            if user_res:
                user_entries.append(format_user_data(user_res[0]))

        return user_entries
    except Exception as e:
        logger.error(f"Error getting members for group {group_dn}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve group members")

@router.get("/{dn}", response_model=UserResponse)
async def get_user(dn: str, token_data = Depends(verify_token)):
    """Get specific user by DN with full details"""
    ldap_conn = get_ldap_connection()
    
    try:
        # Fetch all attributes for single user view
        results = ldap_conn.search(
            dn,
            "(objectClass=user)",
            ["cn", "sAMAccountName", "mail", "displayName", "givenName", "sn", 
             "title", "telephoneNumber", "mobile", "department", "company", 
             "employeeID", "physicalDeliveryOfficeName", "streetAddress", "l", 
             "st", "postalCode", "co", "description",
             "userAccountControl", "memberOf", "whenCreated", "whenChanged", 
             "lastLogon", "pwdLastSet"]
        )
        
        if not results:
            raise HTTPException(status_code=404, detail="User not found")
        
        return format_user_data(results[0], full_details=True)
        
    except Exception as e:
        logger.error(f"Error getting user {dn}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user")

@router.post("/", response_model=Dict[str, Any])
async def create_user(user_data: UserCreate, request: Request, token_data = Depends(verify_token)):
    """Create new user in Active Directory"""
    # 🔍 DEBUG: Log incoming data (without password for security)
    logger.info(f"📥 Received user creation request")
    logger.info(f"   cn: {user_data.cn}")
    logger.info(f"   sAMAccountName: {user_data.sAMAccountName}")
    logger.info(f"   mail: {user_data.mail}")
    logger.info(f"   password: {'***SET***' if user_data.password else 'NOT SET'}")
    logger.info(f"   ou: {user_data.ou}")
    logger.info(f"   groups: {len(user_data.groups) if user_data.groups else 0}")
    
    ldap_conn = get_ldap_connection()
    
    try:
        # Determine OU for user creation
        if user_data.ou:
            # Use specified OU
            user_dn = f"CN={user_data.cn},{user_data.ou}"
            logger.info(f"📍 Creating user in custom OU: {user_data.ou}")
        else:
            # Default to CN=Users
            user_dn = f"CN={user_data.cn},CN=Users,{settings.LDAP_BASE_DN}"
            logger.info(f"📍 Creating user in default location: CN=Users")
        
        # Determine userAccountControl based on account options
        # Base: 512 = Normal account
        # +2 = Disabled (ACCOUNTDISABLE)
        # +32 = Password not required (for initial creation)
        # +65536 = Don't expire password (DONT_EXPIRE_PASSWD)
        
        uac = 544  # Start with disabled + password not required (512 + 32)
        
        if user_data.accountDisabled:
            # Keep disabled
            logger.info("🔒 Account will be created as DISABLED")
        else:
            # Will be enabled after password is set
            logger.info("✅ Account will be ENABLED after password is set")
        
        if user_data.passwordNeverExpires:
            uac |= 65536  # Add DONT_EXPIRE_PASSWD flag
            logger.info("⏳ Password set to NEVER EXPIRE")
        
        # Prepare user attributes
        user_attrs = {
            "objectClass": ["top", "person", "organizationalPerson", "user"],
            "cn": [user_data.cn],
            "sAMAccountName": [user_data.sAMAccountName],
            "mail": [user_data.mail],
            "displayName": [user_data.displayName or user_data.cn],
            "userPrincipalName": [f"{user_data.sAMAccountName}@{settings.LDAP_BASE_DN.replace('DC=', '').replace(',DC=', '.')}"],
            "userAccountControl": [str(uac)]
        }
        
        # Add optional attributes
        if user_data.givenName:
            user_attrs["givenName"] = [user_data.givenName]
        if user_data.sn:
            user_attrs["sn"] = [user_data.sn]
        if user_data.title:
            user_attrs["title"] = [user_data.title]
        if user_data.telephoneNumber:
            user_attrs["telephoneNumber"] = [user_data.telephoneNumber]
        if user_data.mobile:
            user_attrs["mobile"] = [user_data.mobile]
        if user_data.department:
            user_attrs["department"] = [user_data.department]
        if user_data.company:
            user_attrs["company"] = [user_data.company]
        if user_data.employeeID:
            user_attrs["employeeID"] = [user_data.employeeID]
        if user_data.physicalDeliveryOfficeName:
            user_attrs["physicalDeliveryOfficeName"] = [user_data.physicalDeliveryOfficeName]
        if user_data.streetAddress:
            user_attrs["streetAddress"] = [user_data.streetAddress]
        if user_data.l:
            user_attrs["l"] = [user_data.l]
        if user_data.st:
            user_attrs["st"] = [user_data.st]
        if user_data.postalCode:
            user_attrs["postalCode"] = [user_data.postalCode]
        if user_data.co:
            user_attrs["co"] = [user_data.co]
        if user_data.description:
            user_attrs["description"] = [user_data.description]
        
        # Create user
        if not ldap_conn.add_entry(user_dn, user_attrs):
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        logger.info(f"✅ User entry created (disabled): {user_dn}")
        
        # Try to set password and enable account
        password_set_success = False
        account_enabled = False
        password_method = None
        
        # Method 1: Try LDAP password setting
        try:
            logger.info(f"🔑 Method 1: Setting password via LDAP...")
            password_mod = [(MODIFY_REPLACE, "unicodePwd", [f'"{user_data.password}"'.encode("utf-16le")])]
            
            if ldap_conn.modify_entry(user_dn, password_mod):
                logger.info(f"✅ Password set via LDAP")
                password_set_success = True
                password_method = "LDAP"
            else:
                logger.warning(f"⚠️ LDAP password failed (LDAPS may not be configured)")
                
        except Exception as pwd_error:
            logger.warning(f"⚠️ LDAP password error: {pwd_error}")
        
        # Method 2: Try PowerShell ADSI (Windows only, no AD module required)
        if not password_set_success and platform.system() == "Windows":
            logger.info(f"🔑 Method 2: Setting password via PowerShell ADSI...")
            try:
                if set_password_via_powershell(user_dn, user_data.password):
                    password_set_success = True
                    password_method = "PowerShell ADSI"
                    logger.info(f"✅ Password set via PowerShell ADSI")
            except Exception as ps_error:
                logger.warning(f"⚠️ PowerShell ADSI password failed: {ps_error}")
        
        # Enable account if password was set successfully (unless accountDisabled is True)
        if password_set_success and not user_data.accountDisabled:
            try:
                # Calculate final UAC value
                final_uac = 512  # Normal account, enabled
                
                if user_data.passwordNeverExpires:
                    final_uac |= 65536  # Add DONT_EXPIRE_PASSWD
                
                enable_mod = [(MODIFY_REPLACE, "userAccountControl", [str(final_uac)])]
                if ldap_conn.modify_entry(user_dn, enable_mod):
                    account_enabled = True
                    logger.info(f"✅ Account enabled for {user_dn}")
                else:
                    logger.warning(f"⚠️ Failed to enable account")
            except Exception as enable_error:
                logger.warning(f"⚠️ Enable account error: {enable_error}")
        elif user_data.accountDisabled:
            logger.info(f"🔒 Account remains DISABLED as requested")
        
        # Add user to groups if specified
        groups_assigned = []
        groups_failed = []
        
        if user_data.groups and len(user_data.groups) > 0:
            logger.info(f"👥 Assigning user to {len(user_data.groups)} groups...")
            
            for group_dn in user_data.groups:
                try:
                    # Add user DN to group's member attribute
                    group_mod = [(ldap3.MODIFY_ADD, "member", [user_dn])]
                    
                    if ldap_conn.modify_entry(group_dn, group_mod):
                        groups_assigned.append(group_dn)
                        logger.info(f"  ✅ Added to group: {group_dn}")
                    else:
                        groups_failed.append(group_dn)
                        logger.warning(f"  ⚠️ Failed to add to group: {group_dn}")
                        
                except Exception as group_error:
                    groups_failed.append(group_dn)
                    logger.warning(f"  ⚠️ Error adding to group {group_dn}: {group_error}")
            
            logger.info(f"📊 Group assignment: {len(groups_assigned)} successful, {len(groups_failed)} failed")
        
        # Build response message
        response_message = "User created successfully"
        if password_set_success:
            response_message += f" with password ({password_method})"
            if account_enabled:
                response_message += " and enabled"
            elif user_data.accountDisabled:
                response_message += " but account is disabled (as requested)"
            else:
                response_message += " but account is disabled (please enable manually)"
        else:
            response_message += " but password NOT set (account disabled - please set password in AD and enable)"
            logger.warning(f"⚠️ User {user_dn} created WITHOUT password. Admin must set password manually in AD.")
        
        # Add group assignment info to message
        if groups_assigned:
            response_message += f". Assigned to {len(groups_assigned)} group(s)"
        if groups_failed:
            response_message += f". Failed to assign to {len(groups_failed)} group(s)"
        
        # Invalidate cache after user creation
        invalidate_cache("get_users")
        
        # Log activity
        activity_logger.log_activity(
            user_id=token_data.username,
            action_type="user_create",
            target_type="user",
            target_id=user_dn,
            target_name=user_data.displayName or user_data.cn,
            details={
                "sAMAccountName": user_data.sAMAccountName,
                "mail": user_data.mail,
                "ou": user_data.ou or f"CN=Users,{settings.LDAP_BASE_DN}",
                "groups_assigned": len(groups_assigned),
                "password_set": password_set_success,
                "account_enabled": account_enabled
            },
            ip_address=get_client_ip(request),
            status="success"
        )
        
        return {
            "success": True,
            "message": response_message,
            "passwordSet": password_set_success,
            "accountEnabled": account_enabled,
            "groupsAssigned": len(groups_assigned),
            "groupsFailed": len(groups_failed),
            "user": {
                "dn": user_dn,
                "cn": user_data.cn,
                "sAMAccountName": user_data.sAMAccountName,
                "mail": user_data.mail,
                "ou": user_data.ou or f"CN=Users,{settings.LDAP_BASE_DN}"
            }
        }
        
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.put("/{dn}", response_model=Dict[str, Any])
async def update_user(dn: str, user_data: UserUpdate, request: Request, token_data = Depends(verify_token)):
    """Update user in Active Directory"""
    ldap_conn = get_ldap_connection()
    
    try:
        logger.info(f"📝 Updating user: {dn}")
        logger.info(f"📝 Update data received: {user_data.dict(exclude_unset=True)}")
        
        # Get current user data BEFORE modification (for logging changes)
        old_data = {}
        try:
            current_user = ldap_conn.search(dn, "(objectClass=user)", ["*"])
            if current_user and len(current_user) > 0:
                old_attrs = current_user[0][1]
                user_dict = user_data.dict(exclude_unset=True)
                for field in user_dict.keys():
                    field_value = old_attrs.get(field, [])
                    old_data[field] = field_value[0] if field_value and len(field_value) > 0 else None
        except Exception as e:
            logger.warning(f"Could not fetch old data for logging: {e}")
        
        modifications = []
        changes = []  # Track changes for detailed logging
        password_changed = False
        
        # Prepare modifications - only for fields that are explicitly set
        user_dict = user_data.dict(exclude_unset=True)
        
        for field, value in user_dict.items():
            if value is not None and value != "":
                # Skip cn as it requires renaming the entry
                if field == "cn":
                    logger.warning(f"⚠️ Skipping CN modification (requires entry rename)")
                    continue
                
                # 🔒 Handle password reset - skip here, do it separately after user update
                if field == "password":
                    password_changed = True
                    continue
                    
                modifications.append((MODIFY_REPLACE, field, [value]))
                logger.info(f"  • {field} = {value}")
                
                # Track change details
                old_value = old_data.get(field)
                if old_value != value:
                    changes.append({
                        "field": field,
                        "old_value": old_value,
                        "new_value": value
                    })
        
        # Handle password reset separately (requires LDAPS or PowerShell)
        password_reset_success = False
        password_value = user_dict.get("password")
        
        if password_changed and password_value:
            logger.info(f"🔐 Attempting password reset for user: {dn}")
            logger.info(f"🔐 Password value received (length: {len(password_value)} chars)")
            
            # Extract sAMAccountName from DN
            sam_account_name = None
            try:
                # Get current user to extract sAMAccountName
                current_user = ldap_conn.search(dn, "(objectClass=user)", ["sAMAccountName"])
                if current_user and len(current_user) > 0:
                    attrs = current_user[0][1]
                    sam_account_name = attrs.get("sAMAccountName", [None])[0]
            except Exception as e:
                logger.warning(f"Could not extract sAMAccountName: {e}")
            
            # Method 1: Try LDAP (only works with LDAPS)
            try:
                logger.info(f"🔑 Method 1: Setting password via LDAP...")
                encoded_password = f'"{password_value}"'.encode("utf-16le")
                password_mod = [(MODIFY_REPLACE, "unicodePwd", [encoded_password])]
                
                if ldap_conn.modify_entry(dn, password_mod):
                    logger.info(f"✅ Password set via LDAP")
                    password_reset_success = True
                    changes.append({
                        "field": "password",
                        "old_value": "***",
                        "new_value": "*** (changed via LDAP)"
                    })
                else:
                    logger.warning(f"⚠️ LDAP password failed (LDAPS may not be configured)")
                    
            except Exception as pwd_error:
                logger.warning(f"⚠️ LDAP password error: {pwd_error}")
            
            # Method 2: Try PowerShell ADSI (Windows only, no AD module required)
            if not password_reset_success and platform.system() == "Windows":
                logger.info(f"🔑 Method 2: Setting password via PowerShell ADSI")
                try:
                    if set_password_via_powershell(dn, password_value):
                        password_reset_success = True
                        logger.info(f"✅ Password set via PowerShell ADSI successfully")
                        changes.append({
                            "field": "password",
                            "old_value": "***",
                            "new_value": "*** (changed via PowerShell ADSI)"
                        })
                    else:
                        logger.error(f"❌ PowerShell ADSI returned False")
                except Exception as ps_error:
                    logger.error(f"⚠️ PowerShell ADSI password exception: {ps_error}")
                    import traceback
                    traceback.print_exc()
            
            if not password_reset_success:
                logger.error(f"❌ Failed to reset password using all methods")
                raise HTTPException(
                    status_code=500, 
                    detail="Failed to reset password. LDAPS not configured and PowerShell unavailable."
                )
        
        # Apply other modifications (if any)
        if modifications:
            logger.info(f"📤 Applying {len(modifications)} modifications to {dn}")
            
            if not ldap_conn.modify_entry(dn, modifications):
                logger.error(f"❌ Failed to modify entry: {ldap_conn.connection.last_error if ldap_conn.connection else 'Unknown error'}")
                raise HTTPException(status_code=500, detail=f"Failed to update user: {ldap_conn.connection.last_error if ldap_conn.connection else 'Unknown error'}")
            
            logger.info(f"✅ User updated successfully: {dn}")
        
        # Invalidate cache after user update
        invalidate_cache("get_users")
        
        # Log activity with detailed changes
        action_type = "password_reset" if password_changed else "user_update"
        activity_logger.log_activity(
            user_id=token_data.username,
            action_type=action_type,
            target_type="user",
            target_id=dn,
            target_name=dn.split(',')[0].replace('CN=', ''),
            details={
                "fields_updated": list(user_dict.keys()),
                "changes": changes  # Detailed before/after values
            },
            ip_address=get_client_ip(request),
            status="success"
        )
        
        message = "Password reset successfully" if password_changed else "User updated successfully"
        return {
            "success": True,
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating user {dn}: {e}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

@router.patch("/{dn}/toggle-status", response_model=Dict[str, Any])
async def toggle_user_status(dn: str, request: Request, token_data = Depends(verify_token)):
    """Enable/Disable user account"""
    ldap_conn = get_ldap_connection()
    
    try:
        # Get current user account control
        results = ldap_conn.search(dn, "(objectClass=user)", ["userAccountControl"])
        
        if not results:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_uac = int(results[0][1].get("userAccountControl", ["0"])[0])
        is_disabled = is_account_disabled(current_uac)
        
        # Toggle status
        if is_disabled:
            new_uac = current_uac & ~0x2  # Enable account
        else:
            new_uac = current_uac | 0x2   # Disable account
        
        modifications = [(MODIFY_REPLACE, "userAccountControl", [str(new_uac)])]
        
        if not ldap_conn.modify_entry(dn, modifications):
            raise HTTPException(status_code=500, detail="Failed to toggle user status")
        
        # Invalidate cache after status toggle
        invalidate_cache("get_users")
        
        # Log activity
        activity_logger.log_activity(
            user_id=token_data.username,
            action_type="user_status_change",
            target_type="user",
            target_id=dn,
            target_name=dn.split(',')[0].replace('CN=', ''),
            details={"new_status": "enabled" if is_disabled else "disabled"},
            ip_address=get_client_ip(request),
            status="success"
        )
        
        return {
            "success": True,
            "message": f"User {'enabled' if is_disabled else 'disabled'} successfully",
            "isEnabled": not is_disabled
        }
        
    except Exception as e:
        logger.error(f"Error toggling user status for {dn}: {e}")
        raise HTTPException(status_code=500, detail="Failed to toggle user status")

@router.delete("/{dn}", response_model=Dict[str, Any])
async def delete_user(dn: str, request: Request, token_data = Depends(verify_token)):
    """Delete user from Active Directory"""
    ldap_conn = get_ldap_connection()
    
    try:
        user_name = dn.split(',')[0].replace('CN=', '')
        
        if not ldap_conn.delete_entry(dn):
            raise HTTPException(status_code=500, detail="Failed to delete user")
        
        # Invalidate cache after user deletion
        invalidate_cache("get_users")
        
        # Log activity
        activity_logger.log_activity(
            user_id=token_data.username,
            action_type="user_delete",
            target_type="user",
            target_id=dn,
            target_name=user_name,
            ip_address=get_client_ip(request),
            status="success"
        )
        
        return {
            "success": True,
            "message": "User deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting user {dn}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user")


@router.get("/{dn}/password-expiry", response_model=Dict[str, Any])
async def get_password_expiry(dn: str, token_data = Depends(verify_token)):
    """Get password expiry information for a user"""
    ldap_conn = get_ldap_connection()
    
    try:
        results = ldap_conn.search(
            dn,
            "(objectClass=user)",
            ["pwdLastSet", "userAccountControl"]
        )
        
        if not results:
            raise HTTPException(status_code=404, detail="User not found")
        
        _, attrs = results[0]
        pwd_last_set = attrs.get("pwdLastSet", [None])[0]
        
        # Mock data for now - AD password policies would need to be queried separately
        if pwd_last_set and pwd_last_set != "0":
            # Convert Windows filetime to datetime
            # For now, return mock data
            created_date = datetime.now() - timedelta(days=30)
            expiry_date = datetime.now() + timedelta(days=60)
            days_remaining = 60
        else:
            created_date = None
            expiry_date = None
            days_remaining = None
        
        return {
            "createdDate": created_date.isoformat() if created_date else None,
            "expiryDate": expiry_date.isoformat() if expiry_date else None,
            "daysRemaining": days_remaining
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting password expiry for {dn}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve password expiry information")


def set_password_via_powershell(user_dn: str, password: str) -> bool:
    """Set user password using PowerShell ADSI (Windows only, no AD module required)"""
    try:
        # Only works on Windows
        if platform.system() != "Windows":
            logger.warning("PowerShell password reset only works on Windows")
            return False
        
        # Escape password and DN for PowerShell
        escaped_password = password.replace("'", "''").replace('"', '""')
        escaped_dn = user_dn.replace("'", "''")
        
        # PowerShell script using ADSI (doesn't require AD module)
        ps_script = f"""
        try {{
            $user = [ADSI]"LDAP://{escaped_dn}"
            $user.SetPassword('{escaped_password}')
            $user.SetInfo()
            Write-Output "SUCCESS"
            exit 0
        }} catch {{
            Write-Error $_.Exception.Message
            exit 1
        }}
        """
        
        logger.info(f"Setting password via PowerShell ADSI for: {user_dn}")
        
        # Execute PowerShell command
        result = subprocess.run(
            ["powershell", "-Command", ps_script],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and "SUCCESS" in result.stdout:
            logger.info(f"✅ Password set successfully via PowerShell ADSI")
            return True
        else:
            logger.error(f"PowerShell ADSI error: {result.stderr}")
            logger.error(f"PowerShell ADSI stdout: {result.stdout}")
            return False
            
    except Exception as e:
        logger.error(f"PowerShell ADSI password setting failed: {e}")
        return False


def get_last_login_ip_from_eventlog(username: str) -> Optional[str]:
    """Try to get last login IP from Windows Event Log (Event ID 4624)"""
    # DISABLED: This query is too slow and requires admin privileges
    # To enable: uncomment the code below and ensure backend runs with admin rights
    return None
    
    # try:
    #     # Only works on Windows
    #     if platform.system() != "Windows":
    #         return None
    #     
    #     # PowerShell script to query Event Log
    #     ps_script = f"""
    #     $events = Get-WinEvent -FilterHashtable @{{
    #         LogName='Security'
    #         ID=4624
    #     }} -MaxEvents 50 -ErrorAction SilentlyContinue | Where-Object {{
    #         $_.Properties[5].Value -eq '{username}'
    #     }} | Select-Object -First 1
    #     
    #     if ($events) {{
    #         $ipAddress = $events.Properties[18].Value
    #         if ($ipAddress -and $ipAddress -ne '-' -and $ipAddress -ne '::1' -and $ipAddress -ne '127.0.0.1') {{
    #             Write-Output $ipAddress
    #         }}
    #     }}
    #     """
    #     
    #     # Execute PowerShell command with shorter timeout
    #     result = subprocess.run(
    #         ["powershell", "-Command", ps_script],
    #         capture_output=True,
    #         text=True,
    #         timeout=2  # Reduced from 5 to 2 seconds
    #     )
    #     
    #     if result.returncode == 0 and result.stdout.strip():
    #         return result.stdout.strip()
    #     
    #     return None
    #     
    # except Exception as e:
    #     logger.debug(f"Could not query Event Log for IP: {e}")
    #     return None


@router.get("/{dn}/login-history", response_model=List[Dict[str, Any]])
async def get_login_history(dn: str, token_data = Depends(verify_token)):
    """Get login history for a user"""
    ldap_conn = get_ldap_connection()
    
    def convert_filetime_to_datetime(filetime_str):
        """Convert Windows FILETIME to datetime"""
        try:
            if not filetime_str or filetime_str == "0":
                return None
            
            # Convert to integer
            filetime = int(filetime_str)
            
            if filetime == 0 or filetime == 9223372036854775807:  # Max int64 means never
                return None
            
            # Windows FILETIME is 100-nanosecond intervals since 1601-01-01
            # Convert to seconds
            timestamp_seconds = filetime / 10000000.0
            
            # Windows epoch: January 1, 1601
            # Unix epoch: January 1, 1970
            # Difference in seconds: 11644473600
            unix_timestamp = timestamp_seconds - 11644473600
            
            # Convert to datetime
            from datetime import datetime, timezone
            dt = datetime.fromtimestamp(unix_timestamp, tz=timezone.utc)
            return dt
        except Exception as e:
            logger.error(f"Error converting filetime {filetime_str}: {e}")
            return None
    
    try:
        results = ldap_conn.search(
            dn,
            "(objectClass=user)",
            [
                "lastLogon", 
                "lastLogonTimestamp", 
                "logonCount",
                "badPasswordTime",
                "userWorkstations",
                "sAMAccountName",
                "cn"
            ]
        )
        
        if not results:
            # Return friendly message instead of 404
            return [{
                "id": 1,
                "loginTime": datetime.now().isoformat(),
                "ipAddress": "-",
                "status": "info",
                "source": "-",
                "note": "ไม่พบข้อมูลผู้ใช้ในระบบ AD"
            }]
        
        _, attrs = results[0]
        
        login_history = []
        
        # Get user info
        username = attrs.get("sAMAccountName", [None])[0]
        cn = attrs.get("cn", [None])[0]
        logon_count = attrs.get("logonCount", ["0"])[0] or "0"
        
        # Get raw values for debugging
        last_logon_raw = attrs.get("lastLogon", [None])[0]
        last_logon_timestamp_raw = attrs.get("lastLogonTimestamp", [None])[0]
        
        logger.info(f"Login history for {username}: lastLogon={last_logon_raw}, lastLogonTimestamp={last_logon_timestamp_raw}, logonCount={logon_count}")
        
        # Try lastLogon first (more accurate but not replicated)
        login_time = convert_filetime_to_datetime(last_logon_raw)
        time_source = "lastLogon"
        
        # Fallback to lastLogonTimestamp (replicated but less accurate)
        if not login_time:
            login_time = convert_filetime_to_datetime(last_logon_timestamp_raw)
            time_source = "lastLogonTimestamp"
        
        # Try multiple sources for IP/workstation info
        ip_info = "-"
        ip_source = "-"
        
        # Note: Event Log query is disabled for performance
        # AD does not store IP addresses - they're only in Security Event Logs
        
        # Try workstation name from AD
        workstations = attrs.get("userWorkstations", [None])[0]
        if workstations:
            ip_info = f"Workstation: {workstations}"
            ip_source = "AD"
        
        # Build response
        if login_time:
            login_history.append({
                "id": 1,
                "loginTime": login_time.isoformat(),
                "ipAddress": ip_info,
                "status": "success",
                "source": f"AD ({time_source})",
                "note": f"จำนวนครั้งที่ Login ทั้งหมด: {logon_count} ครั้ง"
            })
        else:
            # No login time found
            login_history.append({
                "id": 1,
                "loginTime": "-",
                "ipAddress": ip_info,
                "status": "info",
                "source": "AD",
                "note": f"ไม่พบประวัติ Login ใน AD (Account: {username}, logonCount: {logon_count})"
            })
        
        return login_history
        
    except Exception as e:
        logger.error(f"Error getting login history for {dn}: {e}")
        # Return friendly error instead of raising exception
        return [{
            "id": 1,
            "loginTime": "-",
            "ipAddress": "-",
            "status": "error",
            "source": "-",
            "note": f"เกิดข้อผิดพลาด: Active Directory ไม่เก็บประวัติ Login แบบเต็มรูปแบบ (มีเฉพาะ Login ครั้งล่าสุด)"
        }]


@router.get("/{dn}/groups", response_model=List[Dict[str, Any]])
async def get_user_groups(dn: str, token_data = Depends(verify_token)):
    """Get groups that a user is a member of"""
    ldap_conn = get_ldap_connection()
    
    try:
        results = ldap_conn.search(
            dn,
            "(objectClass=user)",
            ["memberOf"]
        )
        
        if not results:
            raise HTTPException(status_code=404, detail="User not found")
        
        _, attrs = results[0]
        member_of = attrs.get("memberOf", [])
        
        groups = []
        for group_dn in member_of:
            # Extract CN from DN
            match = re.match(r'CN=([^,]+)', group_dn)
            cn = match.group(1) if match else group_dn
            groups.append({
                "id": group_dn,
                "dn": group_dn,
                "cn": cn,
                "description": f"Group: {cn}"
            })
        
        return groups
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting groups for {dn}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user groups")


@router.get("/{dn}/permissions", response_model=List[Dict[str, Any]])
async def get_user_permissions(dn: str, token_data = Depends(verify_token)):
    """Get permissions for a user based on AD groups"""
    ldap_conn = get_ldap_connection()
    
    try:
        results = ldap_conn.search(
            dn,
            "(objectClass=user)",
            ["memberOf", "userAccountControl"]
        )
        
        if not results:
            raise HTTPException(status_code=404, detail="User not found")
        
        _, attrs = results[0]
        member_of = attrs.get("memberOf", [])
        user_account_control = int(attrs.get("userAccountControl", ["0"])[0])
        
        permissions = []
        
        # Check if user is admin based on groups
        admin_groups = ["Domain Admins", "Administrators", "Enterprise Admins"]
        is_admin = any(
            any(admin_group.lower() in group.lower() for admin_group in admin_groups)
            for group in member_of
        )
        
        # Add permissions based on groups
        if is_admin:
            permissions.append({
                "id": 1,
                "name": "domain_admin",
                "description": "ผู้ดูแลระบบโดเมน",
                "level": "admin",
                "source": "AD Group"
            })
        
        # Add group-based permissions
        for idx, group_dn in enumerate(member_of, start=len(permissions) + 1):
            match = re.match(r'CN=([^,]+)', group_dn)
            group_name = match.group(1) if match else group_dn
            
            # Determine permission level based on group name
            if any(admin in group_name.lower() for admin in ["admin", "administrator"]):
                level = "admin"
            elif any(mgr in group_name.lower() for mgr in ["manager", "supervisor"]):
                level = "manager"
            else:
                level = "user"
            
            permissions.append({
                "id": idx,
                "name": group_name,
                "description": f"สมาชิกกลุ่ม {group_name}",
                "level": level,
                "source": "AD Group"
            })
        
        # If no groups, add basic user permission
        if not permissions:
            permissions.append({
                "id": 1,
                "name": "domain_user",
                "description": "ผู้ใช้ในโดเมน",
                "level": "user",
                "source": "AD Default"
            })
        
        return permissions
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting permissions for {dn}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve permissions")
