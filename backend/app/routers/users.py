from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from ldap3 import MODIFY_REPLACE, MODIFY_ADD
import ldap3
from datetime import datetime, timedelta, timezone
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
    userCannotChangePassword: Optional[bool] = False  # Prevent user from changing password
    passwordNeverExpires: Optional[bool] = False  # Password never expires
    storePasswordUsingReversibleEncryption: Optional[bool] = False  # Store password using reversible encryption
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

class AccountOptionsResponse(BaseModel):
    mustChangePassword: bool = False
    userCannotChangePassword: bool = False
    passwordNeverExpires: bool = False
    storePasswordUsingReversibleEncryption: bool = False


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
    accountOptions: AccountOptionsResponse = AccountOptionsResponse()
    whenCreated: Optional[str] = None
    whenChanged: Optional[str] = None
    lastLogon: Optional[str] = None
    pwdLastSet: Optional[str] = None

class UserStatsResponse(BaseModel):
    total_users: int
    enabled_users: int
    disabled_users: int
    fetched_at: datetime

class LoginInsightEntry(BaseModel):
    dn: str
    display_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    last_login: Optional[datetime] = None
    first_login: Optional[datetime] = None
    when_created: Optional[datetime] = None
    logon_count: Optional[int] = None

# Helper functions
THAILAND_TZ = timezone(timedelta(hours=7))
WINDOWS_EPOCH_OFFSET_SECONDS = 11644473600
MAX_FILETIME = 9223372036854775807

def is_account_disabled(user_account_control: int) -> bool:
    """Check if user account is disabled"""
    return bool(user_account_control & 0x2)

def ensure_timezone(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(THAILAND_TZ)

def ad_timestamp_to_datetime(value: Optional[str]) -> Optional[datetime]:
    """Convert Windows FILETIME string or ISO datetime to timezone-aware datetime"""
    if value is None or value == "0":
        return None
    try:
        if isinstance(value, datetime):
            return ensure_timezone(value)
        if isinstance(value, str):
            cleaned = value.strip()
            # Handle LDAP3 auto-converted datetime strings
            if "-" in cleaned and ":" in cleaned:
                try:
                    dt = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
                    return ensure_timezone(dt)
                except ValueError:
                    pass
            filetime = int(cleaned)
            if filetime in (0, MAX_FILETIME):
                return None
            unix_timestamp = (filetime / 10_000_000) - WINDOWS_EPOCH_OFFSET_SECONDS
            dt_utc = datetime.fromtimestamp(unix_timestamp, tz=timezone.utc)
            return dt_utc.astimezone(THAILAND_TZ)
    except Exception as exc:
        logger.debug(f"Failed to convert FILETIME '{value}': {exc}")
        return None

def parse_when_created(value: Optional[str]) -> Optional[datetime]:
    """Parse AD generalized time string to datetime"""
    if value is None:
        return None
    try:
        if isinstance(value, datetime):
            return ensure_timezone(value)
        if isinstance(value, str):
            cleaned = value.strip()
            if "-" in cleaned and ":" in cleaned:
                try:
                    dt = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
                    return ensure_timezone(dt)
                except ValueError:
                    pass
            formats = ("%Y%m%d%H%M%S.%fZ", "%Y%m%d%H%M%SZ")
            for fmt in formats:
                try:
                    dt_utc = datetime.strptime(cleaned, fmt).replace(tzinfo=timezone.utc)
                    return dt_utc.astimezone(THAILAND_TZ)
                except ValueError:
                    continue
        logger.debug(f"Unsupported whenCreated format: {value}")
    except Exception as exc:
        logger.debug(f"Failed to parse whenCreated '{value}': {exc}")
    return None

def parse_logon_count(value: Optional[str]) -> int:
    if not value:
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0

def is_likely_system_account(username: Optional[str], display_name: Optional[str], email: Optional[str]) -> bool:
    if not username:
        return False
    username_lower = username.lower()
    display_lower = (display_name or "").lower()

    # Machine accounts end with $
    if username_lower.endswith("$"):
        return True

    # Presence of email typically indicates real user
    if email and "@" in email:
        return False

    system_prefixes = ("adm", "svc", "sys", "test", "lab", "script", "automation")
    if username_lower.startswith(system_prefixes):
        return True
    if display_lower.startswith(system_prefixes):
        return True

    return False

def build_login_insight_entry(entry: tuple) -> LoginInsightEntry:
    dn, attrs = entry
    username = (attrs.get("sAMAccountName") or [None])[0]
    display_name = (attrs.get("displayName") or attrs.get("cn") or [None])[0]
    email = (attrs.get("mail") or [None])[0]
    department = (attrs.get("department") or [None])[0]

    last_logon_precise_raw = (attrs.get("lastLogon") or [None])[0]
    last_logon_replicated_raw = (attrs.get("lastLogonTimestamp") or [None])[0]
    last_login = ad_timestamp_to_datetime(last_logon_precise_raw) or ad_timestamp_to_datetime(last_logon_replicated_raw)

    when_created = parse_when_created((attrs.get("whenCreated") or [None])[0])
    first_login = when_created

    logon_count = parse_logon_count((attrs.get("logonCount") or ["0"])[0])

    return LoginInsightEntry(
        dn=dn,
        display_name=display_name,
        username=username,
        email=email,
        department=department,
        last_login=last_login,
        first_login=first_login,
        when_created=when_created,
        logon_count=logon_count,
    )

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
    
    pwd_last_set_raw = (attrs.get("pwdLastSet", [None]) or [None])[0]
    must_change_password = False
    if isinstance(pwd_last_set_raw, str):
        must_change_password = pwd_last_set_raw == "0"
    elif isinstance(pwd_last_set_raw, (int, float)):
        must_change_password = pwd_last_set_raw == 0

    account_options = {
        "mustChangePassword": must_change_password,
        "userCannotChangePassword": bool(user_account_control & 0x40),
        "passwordNeverExpires": bool(user_account_control & 0x10000),
        "storePasswordUsingReversibleEncryption": bool(user_account_control & 0x80),
    }

    # Always include basic info
    result = {
        "dn": dn,
        "cn": get_attr("cn"),
        "sAMAccountName": get_attr("sAMAccountName"),
        "mail": get_attr("mail"),
        "displayName": get_attr("displayName"),
        "department": get_attr("department") or None,
        "company": get_attr("company") or None,
        "physicalDeliveryOfficeName": get_attr("physicalDeliveryOfficeName") or None,
        "title": get_attr("title") or None,
        "description": get_attr("description") or None,
        "userAccountControl": user_account_control,
        "isEnabled": not is_account_disabled(user_account_control),
        "accountOptions": account_options,
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
        # ⚡ Include limited metadata needed for list view (avoid heavy attributes)
        result.update({
            "memberOf": [],
            "whenCreated": get_attr("whenCreated") or None,  # keep for sorting/filtering
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
            [
                "cn",
                "sAMAccountName",
                "mail",
                "displayName",
                "title",
                "department",
                "company",
                "physicalDeliveryOfficeName",
                "description",
                "userAccountControl",
                "givenName",
                "sn",
                "telephoneNumber",
                "mobile",
                "employeeID",
                "streetAddress",
                "l",
                "st",
                "postalCode",
                "co",
                "whenCreated"
            ]
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


@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(token: str = Depends(verify_token)):
    """Return real-time user counts from Active Directory"""
    ldap_conn = get_ldap_connection()
    try:
        results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            "(&(objectCategory=person)(objectClass=user))",
            ["userAccountControl"]
        )

        if results is None:
            raise HTTPException(status_code=500, detail="Failed to search users")

        total_users = len(results)
        disabled_users = 0

        for _, attrs in results:
            uac_values = attrs.get("userAccountControl", [])
            is_disabled = False
            for value in uac_values:
                try:
                    if int(value) & 0b10:
                        is_disabled = True
                        break
                except (TypeError, ValueError):
                    continue
            if is_disabled:
                disabled_users += 1

        enabled_users = max(total_users - disabled_users, 0)

        return UserStatsResponse(
            total_users=total_users,
            enabled_users=enabled_users,
            disabled_users=disabled_users,
            fetched_at=datetime.now().astimezone()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user statistics")


@router.get("/login-insights/recent", response_model=List[LoginInsightEntry])
async def get_recent_logins(
    limit: int = Query(10, ge=1, le=100),
    token: str = Depends(verify_token)
):
    """Return top N users with the most recent logins"""
    ldap_conn = get_ldap_connection()
    try:
        results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            "(&(objectCategory=person)(objectClass=user))",
            [
                "cn",
                "displayName",
                "sAMAccountName",
                "mail",
                "department",
                "lastLogon",
                "lastLogonTimestamp",
                "logonCount",
                "whenCreated"
            ]
        )

        if results is None:
            raise HTTPException(status_code=500, detail="Failed to search users")

        insights: List[LoginInsightEntry] = []
        for entry in results:
            record = build_login_insight_entry(entry)
            if is_likely_system_account(record.username, record.display_name, record.email):
                continue
            if not record.last_login:
                continue
            insights.append(record)

        insights.sort(
            key=lambda item: item.last_login or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True
        )

        return insights[:limit]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting recent login insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve recent login insights")


@router.get("/login-insights/never", response_model=List[LoginInsightEntry])
async def get_users_single_login(
    limit: int = Query(10, ge=1, le=100),
    token: str = Depends(verify_token)
):
    """Return top N users who have logged in only once (first login with no subsequent logins)"""
    ldap_conn = get_ldap_connection()
    try:
        results = ldap_conn.search(
            settings.LDAP_BASE_DN,
            "(&(objectCategory=person)(objectClass=user))",
            [
                "cn",
                "displayName",
                "sAMAccountName",
                "mail",
                "department",
                "lastLogon",
                "lastLogonTimestamp",
                "logonCount",
                "whenCreated"
            ]
        )

        if results is None:
            raise HTTPException(status_code=500, detail="Failed to search users")

        insights: List[LoginInsightEntry] = []
        for entry in results:
            record = build_login_insight_entry(entry)
            if is_likely_system_account(record.username, record.display_name, record.email):
                continue

            if record.logon_count <= 1 and record.last_login:
                # Treat the only recorded login as both first/last login
                record.first_login = record.last_login
                insights.append(record)

        insights.sort(
            key=lambda item: item.last_login or datetime.max.replace(tzinfo=timezone.utc),
            reverse=False
        )

        return insights[:limit]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting single-login insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve single-login insights")


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
        if user_data.userCannotChangePassword:
            uac |= 64  # Add PASSWD_CANT_CHANGE flag
            logger.info("🚫 User will be prevented from changing password")
        if user_data.storePasswordUsingReversibleEncryption:
            uac |= 128  # Add ENCRYPTED_TEXT_PWD_ALLOWED flag
            logger.info("⚠️ Password will be stored using reversible encryption")
        
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
                if user_data.userCannotChangePassword:
                    final_uac |= 64  # Add PASSWD_CANT_CHANGE flag
                if user_data.storePasswordUsingReversibleEncryption:
                    final_uac |= 128  # Add ENCRYPTED_TEXT_PWD_ALLOWED flag
                
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
        
        # Handle CN rename before other modifications
        renamed_dn = None
        if "cn" in user_dict:
            new_cn = user_dict.pop("cn")
            if new_cn is not None:
                new_cn_stripped = new_cn.strip()
                current_cn = dn.split(',')[0].replace('CN=', '')
                if new_cn_stripped and new_cn_stripped != current_cn:
                    new_rdn = f"CN={new_cn_stripped}"
                    parent_dn = ','.join(dn.split(',')[1:])
                    logger.info(f"🔄 Renaming DN from {dn} to {new_rdn},{parent_dn}")
                    if not ldap_conn.rename_entry(dn, new_rdn, new_superior=parent_dn):
                        raise HTTPException(status_code=500, detail="Failed to rename user (CN change)")
                    changes.append({
                        "field": "cn",
                        "old_value": current_cn,
                        "new_value": new_cn_stripped
                    })
                    dn = f"{new_rdn},{parent_dn}"
                    renamed_dn = dn

        for field, value in user_dict.items():
            if value is None:
                continue
            
            if field == "cn":
                logger.warning(f"⚠️ Skipping CN modification (requires entry rename)")
                continue
            
            # 🔒 Handle password reset - skip here, do it separately after user update
            if field == "password":
                password_changed = True
                continue
            
            if isinstance(value, str) and value.strip() == "":
                modifications.append((MODIFY_REPLACE, field, []))
                logger.info(f"  • {field} cleared")
                new_value = None
            else:
                modifications.append((MODIFY_REPLACE, field, [value]))
                logger.info(f"  • {field} = {value}")
                new_value = value
            
            # Track change details
            old_value = old_data.get(field)
            if old_value != new_value:
                changes.append({
                    "field": field,
                    "old_value": old_value,
                    "new_value": new_value
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
        
        # Fetch updated user details to return in response (for frontend sync)
        refreshed_user = None
        try:
            refreshed_result = ldap_conn.search(
                dn,
                "(objectClass=user)",
                ["cn", "sAMAccountName", "mail", "displayName", "givenName", "sn",
                 "title", "telephoneNumber", "mobile", "department", "company",
                 "employeeID", "physicalDeliveryOfficeName", "streetAddress", "l",
                 "st", "postalCode", "co", "description",
                 "userAccountControl", "memberOf", "whenCreated", "whenChanged",
                 "lastLogon", "pwdLastSet"]
            )
            if refreshed_result:
                refreshed_user = format_user_data(refreshed_result[0], full_details=True)
        except Exception as fetch_error:
            logger.warning(f"⚠️ Could not fetch refreshed user data: {fetch_error}")
            refreshed_user = None
        
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
        response_payload = {
            "success": True,
            "message": message,
            "user": refreshed_user
        }
        if renamed_dn:
            response_payload["dn"] = renamed_dn
        return response_payload
        
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
    
    def convert_filetime_to_datetime(value):
        """Convert LDAP timestamp (FILETIME or ISO string) to datetime"""
        try:
            return ad_timestamp_to_datetime(value)
        except Exception as exc:
            logger.error(f"Error converting filetime {value}: {exc}")
            return None

    def get_first(attr_dict, key, default=None):
        values = attr_dict.get(key)
        if not values:
            return default
        try:
            return values[0]
        except (IndexError, TypeError):
            return default
    
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
        username = get_first(attrs, "sAMAccountName")
        cn = get_first(attrs, "cn")
        logon_count = get_first(attrs, "logonCount", "0") or "0"
        
        # Get raw values for debugging
        last_logon_raw = get_first(attrs, "lastLogon")
        last_logon_timestamp_raw = get_first(attrs, "lastLogonTimestamp")
        
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
