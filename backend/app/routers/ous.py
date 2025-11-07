from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from ldap3 import MODIFY_REPLACE
import logging

from app.core.config import settings
from app.core.database import get_ldap_connection
from app.routers.auth import verify_token, get_client_ip
from app.core.activity_log import activity_logger
from app.core.cache import cached_response, invalidate_cache

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models
class OUCreate(BaseModel):
    name: str
    description: Optional[str] = None

class OUResponse(BaseModel):
    dn: str
    name: str
    description: str

class OUUpdate(BaseModel):
    description: Optional[str] = None

# Helper functions
def format_ou_data(entry: tuple) -> Dict[str, Any]:
    """Format LDAP OU entry data for response"""
    dn, attrs = entry
    
    return {
        "dn": dn,
        "name": attrs.get("ou", [""])[0] if attrs.get("ou") else "",
        "description": attrs.get("description", [""])[0] if attrs.get("description") else ""
    }

# Routes
@router.get("/", response_model=List[OUResponse])
@cached_response(ttl_seconds=600)  # ⚡ Cache for 10 minutes
async def get_ous(
    token_data = Depends(verify_token),
    q: str | None = Query(default=None, description="Search text for ou/description"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=50000),  # Increased to support large OU lists
):
    """Get all Organizational Units from Active Directory"""
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

        if q:
            s = ldap_escape(q)
            filter_str = f"(&(objectClass=organizationalUnit)(|(ou=*{s}*)(description=*{s}*)))"
        else:
            filter_str = "(objectClass=organizationalUnit)"

        results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            filter_str,
            ["ou", "description"]
        )
        
        if results is None:
            raise HTTPException(status_code=500, detail="Failed to search OUs")
        
        ous_all = [format_ou_data(entry) for entry in results]
        # Return all OUs if page_size is 1000 or more (frontend requests)
        if page_size >= 1000:
            return ous_all
        start = (page - 1) * page_size
        end = start + page_size
        return ous_all[start:end]
        
    except Exception as e:
        logger.error(f"Error getting OUs: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve OUs")

@router.get("/user-ous", response_model=List[Dict[str, Any]])
async def get_user_ous(token_data = Depends(verify_token)):
    """Get OUs suitable for creating users (excludes Computers, Groups, Wifi, etc.)"""
    ldap_conn = get_ldap_connection()
    
    try:
        filter_str = "(objectClass=organizationalUnit)"
        
        results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            filter_str,
            ["ou", "description"]
        )
        
        if results is None:
            raise HTTPException(status_code=500, detail="Failed to search OUs")
        
        # Whitelist for specific Wifi OUs that should be included
        wifi_whitelist = [
            "OU=MST,OU=Wifi,DC=TBKK,DC=CO,DC=TH",
            "OU=TBKK,OU=Wifi,DC=TBKK,DC=CO,DC=TH",
            "OU=TBKK-FA,OU=Wifi,DC=TBKK,DC=CO,DC=TH",
            "OU=TBKK-IOT,OU=Wifi,DC=TBKK,DC=CO,DC=TH",
            "OU=TBKK-Mobile,OU=Wifi,DC=TBKK,DC=CO,DC=TH",
            "OU=TBKK-PD,OU=Wifi,DC=TBKK,DC=CO,DC=TH",
            "OU=TBKT,OU=Wifi,DC=TBKK,DC=CO,DC=TH",
            "OU=UNIFI,OU=Wifi,DC=TBKK,DC=CO,DC=TH"
        ]
        
        # Filter out OUs that are for Computers, Groups, Wifi, etc.
        exclude_keywords = [
            "computer", "computers", "comp",
            "group", "groups",
            "wifi", "wlan",
            "vpn device", "unifi",
            "domain controller",
            "disable", "disabled", "inactive"
        ]
        
        user_ous = []
        for entry in results:
            dn, attrs = entry
            name = attrs.get("ou", [""])[0] if attrs.get("ou") else ""
            description = attrs.get("description", [""])[0] if attrs.get("description") else ""
            
            # Check if OU name or DN contains excluded keywords
            combined_text = f"{dn.lower()} {name.lower()}"
            
            # Check if OU is in whitelist first (bypass exclusion rules)
            if dn in wifi_whitelist or not any(keyword in combined_text for keyword in exclude_keywords):
                # Build full path for display
                # Extract OU path from DN
                ou_parts = []
                dn_parts = dn.split(",")
                for part in dn_parts:
                    if part.startswith("OU="):
                        ou_parts.append(part.replace("OU=", ""))
                
                # Reverse to show from top to bottom
                ou_parts.reverse()
                full_path = " > ".join(ou_parts)
                
                user_ous.append({
                    "dn": dn,
                    "name": name,
                    "fullPath": full_path,
                    "description": description
                })
        
        # Sort by full path for better hierarchy display
        user_ous.sort(key=lambda x: x["fullPath"])
        
        logger.info(f"✅ Found {len(user_ous)} OUs suitable for user creation")
        return user_ous
        
    except Exception as e:
        logger.error(f"Error getting user OUs: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user OUs")

@router.get("/{dn}/suggested-groups", response_model=Dict[str, Any])
async def get_suggested_groups_for_ou(
    dn: str, 
    threshold: float = Query(default=0.6, ge=0.0, le=1.0, description="Minimum percentage threshold (0.0-1.0)"),
    token_data = Depends(verify_token)
):
    """
    Analyze users in an OU and suggest groups based on what majority of users have.
    Returns groups where >= threshold% of users are members.
    """
    ldap_conn = get_ldap_connection()
    
    try:
        logger.info(f"🔍 Analyzing groups for OU: {dn} (threshold: {threshold*100}%)")
        
        # Step 1: Get all users in this OU (search in subtree - SUBTREE is default in wrapper)
        user_results = ldap_conn.search(
            dn,
            "(objectClass=user)",
            ["cn", "sAMAccountName", "memberOf"]
        )
        
        if not user_results or len(user_results) == 0:
            logger.warning(f"⚠️ No users found in OU: {dn}")
            return {
                "ou": dn,
                "totalUsers": 0,
                "suggestedGroups": [],
                "message": "No users found in this OU to analyze"
            }
        
        total_users = len(user_results)
        logger.info(f"👥 Found {total_users} users in OU")
        
        # Step 2: Count group memberships
        group_counts = {}  # {group_dn: count}
        
        for user_entry in user_results:
            user_dn, user_attrs = user_entry
            member_of = user_attrs.get("memberOf", [])
            
            for group_dn in member_of:
                if group_dn not in group_counts:
                    group_counts[group_dn] = 0
                group_counts[group_dn] += 1
        
        logger.info(f"📊 Found {len(group_counts)} unique groups across all users")
        
        # Step 3: Calculate percentages and filter by threshold
        suggested_groups = []
        
        for group_dn, count in group_counts.items():
            percentage = count / total_users
            
            if percentage >= threshold:
                # Get group details
                try:
                    group_results = ldap_conn.search(
                        group_dn,
                        "(objectClass=group)",
                        ["cn", "description"]
                    )
                    
                    if group_results:
                        group_attrs = group_results[0][1]
                        cn = group_attrs.get("cn", ["Unknown"])[0]
                        description = group_attrs.get("description", [""])[0]
                        
                        suggested_groups.append({
                            "dn": group_dn,
                            "cn": cn,
                            "description": description,
                            "userCount": count,
                            "totalUsers": total_users,
                            "percentage": round(percentage * 100, 1)
                        })
                except Exception as e:
                    logger.warning(f"Could not fetch details for group {group_dn}: {e}")
        
        # Step 4: Sort by percentage (highest first)
        suggested_groups.sort(key=lambda x: x["percentage"], reverse=True)
        
        logger.info(f"✅ Returning {len(suggested_groups)} suggested groups (threshold: {threshold*100}%)")
        
        return {
            "ou": dn,
            "totalUsers": total_users,
            "threshold": threshold,
            "suggestedGroups": suggested_groups
        }
        
    except Exception as e:
        logger.error(f"Error analyzing OU {dn}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze OU: {str(e)}")

@router.get("/{dn}", response_model=OUResponse)
async def get_ou(dn: str, token_data = Depends(verify_token)):
    """Get specific OU by DN"""
    ldap_conn = get_ldap_connection()
    
    try:
        results = ldap_conn.search(
            dn,
            "(objectClass=organizationalUnit)",
            ["*"]
        )
        
        if not results:
            raise HTTPException(status_code=404, detail="OU not found")
        
        return format_ou_data(results[0])
        
    except Exception as e:
        logger.error(f"Error getting OU {dn}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve OU")

@router.post("/", response_model=Dict[str, Any])
async def create_ou(ou_data: OUCreate, request: Request, token_data = Depends(verify_token)):
    """Create new Organizational Unit in Active Directory"""
    ldap_conn = get_ldap_connection()
    
    try:
        # Prepare OU DN
        ou_dn = f"OU={ou_data.name},{settings.LDAP_BASE_DN}"

        # Prepare OU attributes (dictionary of string lists)
        ou_attrs = {
            "objectClass": ["top", "organizationalUnit"],
            "ou": [ou_data.name],
        }

        if ou_data.description:
            ou_attrs["description"] = [ou_data.description]

        # Create OU
        if not ldap_conn.add_entry(ou_dn, ou_attrs):
            raise HTTPException(status_code=500, detail="Failed to create OU")
        
        # ⚡ Invalidate cache after creation
        invalidate_cache("get_ous")
        
        # Log activity
        activity_logger.log_activity(
            user_id=token_data.username,
            action_type="ou_create",
            target_type="ou",
            target_id=ou_dn,
            target_name=ou_data.name,
            details={"description": ou_data.description or ""},
            ip_address=get_client_ip(request),
            status="success"
        )
        
        return {
            "success": True,
            "message": "OU created successfully",
            "ou": {
                "dn": ou_dn,
                "name": ou_data.name,
                "description": ou_data.description or ""
            }
        }
        
    except Exception as e:
        logger.error(f"Error creating OU: {e}")
        raise HTTPException(status_code=500, detail="Failed to create OU")

@router.put("/{dn}", response_model=Dict[str, Any])
async def update_ou(dn: str, ou_data: OUUpdate, request: Request, token_data = Depends(verify_token)):
    """Update Organizational Unit in Active Directory"""
    ldap_conn = get_ldap_connection()
    
    try:
        modifications = []

        if ou_data.description is not None:
            modifications.append((MODIFY_REPLACE, "description", [ou_data.description]))

        if not modifications:
            raise HTTPException(status_code=400, detail="No fields to update")

        if not ldap_conn.modify_entry(dn, modifications):
            raise HTTPException(status_code=500, detail="Failed to update OU")
        
        # ⚡ Invalidate cache after update
        invalidate_cache("get_ous")
        
        # Log activity
        ou_name = dn.split(',')[0].replace('OU=', '')
        activity_logger.log_activity(
            user_id=token_data.username,
            action_type="ou_update",
            target_type="ou",
            target_id=dn,
            target_name=ou_name,
            details={"description": ou_data.description},
            ip_address=get_client_ip(request),
            status="success"
        )
        
        return {
            "success": True,
            "message": "OU updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating OU {dn}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update OU")

@router.delete("/{dn}", response_model=Dict[str, Any])
async def delete_ou(dn: str, request: Request, token_data = Depends(verify_token)):
    """Delete Organizational Unit from Active Directory"""
    ldap_conn = get_ldap_connection()
    
    try:
        ou_name = dn.split(',')[0].replace('OU=', '')
        
        if not ldap_conn.delete_entry(dn):
            raise HTTPException(status_code=500, detail="Failed to delete OU")
        
        # ⚡ Invalidate cache after deletion
        invalidate_cache("get_ous")
        
        # Log activity
        activity_logger.log_activity(
            user_id=token_data.username,
            action_type="ou_delete",
            target_type="ou",
            target_id=dn,
            target_name=ou_name,
            ip_address=get_client_ip(request),
            status="success"
        )
        
        return {
            "success": True,
            "message": "OU deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting OU {dn}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete OU")
