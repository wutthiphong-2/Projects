"""
Permission system for API keys using scope-based access control.

Scopes follow the format: resource:action
- resource: users, groups, ous, activity, api_keys
- action: read, write
"""
from typing import List, Dict, Optional, Tuple
import re
import logging

logger = logging.getLogger(__name__)

# Available scopes
AVAILABLE_SCOPES = {
    "users:read": {
        "name": "users:read",
        "label": "อ่านข้อมูลผู้ใช้",
        "description": "สามารถอ่านข้อมูลผู้ใช้ทั้งหมด",
        "category": "users"
    },
    "users:write": {
        "name": "users:write",
        "label": "จัดการผู้ใช้",
        "description": "สามารถสร้าง แก้ไข และลบผู้ใช้",
        "category": "users"
    },
    "groups:read": {
        "name": "groups:read",
        "label": "อ่านข้อมูลกลุ่ม",
        "description": "สามารถอ่านข้อมูลกลุ่มทั้งหมด",
        "category": "groups"
    },
    "groups:write": {
        "name": "groups:write",
        "label": "จัดการกลุ่ม",
        "description": "สามารถสร้าง แก้ไข ลบกลุ่ม และจัดการสมาชิก",
        "category": "groups"
    },
    "ous:read": {
        "name": "ous:read",
        "label": "อ่านข้อมูล OU",
        "description": "สามารถอ่านข้อมูล OU ทั้งหมด",
        "category": "ous"
    },
    "ous:write": {
        "name": "ous:write",
        "label": "จัดการ OU",
        "description": "สามารถสร้าง แก้ไข และลบ OU",
        "category": "ous"
    },
    "activity:read": {
        "name": "activity:read",
        "label": "ดู Activity Log",
        "description": "สามารถดู Activity Log และสถิติ",
        "category": "activity"
    },
    "api_keys:manage": {
        "name": "api_keys:manage",
        "label": "จัดการ API Keys",
        "description": "สามารถสร้าง แก้ไข และลบ API Keys (Admin only)",
        "category": "admin"
    }
}

# Default permissions for new API keys (read-only access)
DEFAULT_PERMISSIONS = ["users:read", "groups:read", "ous:read"]

# Mapping of API endpoints to required scopes
# Format: (path_pattern, method) -> required_scope
ENDPOINT_SCOPE_MAP = {
    # Users endpoints
    (r"^/api/users$", "GET"): "users:read",
    (r"^/api/users/stats$", "GET"): "users:read",
    (r"^/api/users/login-insights", "GET"): "users:read",
    (r"^/api/users/departments$", "GET"): "users:read",
    (r"^/api/users/groups$", "GET"): "users:read",
    (r"^/api/users/groups/members$", "GET"): "users:read",
    (r"^/api/users/[^/]+$", "GET"): "users:read",  # GET /api/users/{dn}
    (r"^/api/users/[^/]+/password-expiry$", "GET"): "users:read",
    (r"^/api/users/[^/]+/login-history$", "GET"): "users:read",
    (r"^/api/users/[^/]+/groups$", "GET"): "users:read",
    (r"^/api/users/[^/]+/permissions$", "GET"): "users:read",
    (r"^/api/users$", "POST"): "users:write",
    (r"^/api/users/[^/]+$", "PUT"): "users:write",
    (r"^/api/users/[^/]+$", "PATCH"): "users:write",
    (r"^/api/users/[^/]+/toggle-status$", "PATCH"): "users:write",
    (r"^/api/users/[^/]+$", "DELETE"): "users:write",
    
    # Groups endpoints
    (r"^/api/groups$", "GET"): "groups:read",
    (r"^/api/groups/categorized$", "GET"): "groups:read",
    (r"^/api/groups/default-groups-by-ou$", "GET"): "groups:read",
    (r"^/api/groups/[^/]+$", "GET"): "groups:read",  # GET /api/groups/{dn}
    (r"^/api/groups/[^/]+/members$", "GET"): "groups:read",
    (r"^/api/groups/[^/]+/available-users$", "GET"): "groups:read",
    (r"^/api/groups$", "POST"): "groups:write",
    (r"^/api/groups/[^/]+$", "PUT"): "groups:write",
    (r"^/api/groups/[^/]+$", "DELETE"): "groups:write",
    (r"^/api/groups/[^/]+/members$", "POST"): "groups:write",
    (r"^/api/groups/[^/]+/members$", "DELETE"): "groups:write",
    
    # OUs endpoints
    (r"^/api/ous$", "GET"): "ous:read",
    (r"^/api/ous/user-ous$", "GET"): "ous:read",
    (r"^/api/ous/[^/]+/suggested-groups$", "GET"): "ous:read",
    (r"^/api/ous/[^/]+$", "GET"): "ous:read",  # GET /api/ous/{dn}
    (r"^/api/ous$", "POST"): "ous:write",
    (r"^/api/ous/[^/]+$", "PUT"): "ous:write",
    (r"^/api/ous/[^/]+$", "DELETE"): "ous:write",
    
    # Activity logs endpoints
    (r"^/api/activity-logs", "GET"): "activity:read",
    
    # API keys endpoints (admin only)
    (r"^/api/api-keys", "GET"): "api_keys:manage",
    (r"^/api/api-keys", "POST"): "api_keys:manage",
    (r"^/api/api-keys", "PUT"): "api_keys:manage",
    (r"^/api/api-keys", "DELETE"): "api_keys:manage",
    (r"^/api/api-keys", "PATCH"): "api_keys:manage",
    
    # API usage endpoints (admin only)
    (r"^/api/api-usage", "GET"): "api_keys:manage",
    
    # API endpoints info (admin only)
    (r"^/api/api-endpoints", "GET"): "api_keys:manage",
}


def get_all_scopes() -> List[Dict[str, str]]:
    """Get list of all available scopes with metadata"""
    return list(AVAILABLE_SCOPES.values())


def get_scopes_by_category() -> Dict[str, List[Dict[str, str]]]:
    """Get scopes grouped by category"""
    categories = {}
    for scope in AVAILABLE_SCOPES.values():
        category = scope["category"]
        if category not in categories:
            categories[category] = []
        categories[category].append(scope)
    return categories


def validate_scopes(scopes: List[str]) -> Tuple[bool, Optional[str]]:
    """
    Validate that all scopes are valid
    
    Returns:
        (is_valid, error_message)
    """
    if not scopes:
        return False, "At least one permission scope is required"
    
    invalid_scopes = [s for s in scopes if s not in AVAILABLE_SCOPES]
    if invalid_scopes:
        return False, f"Invalid scopes: {', '.join(invalid_scopes)}"
    
    return True, None


def check_permission(api_key_permissions: List[str], required_scope: str) -> bool:
    """
    Check if API key has the required permission
    
    Args:
        api_key_permissions: List of scopes the API key has
        required_scope: The scope required to access the resource
    
    Returns:
        True if API key has the required permission, False otherwise
    """
    if not api_key_permissions:
        return False
    
    # Direct match
    if required_scope in api_key_permissions:
        return True
    
    # Special case: write permission implies read permission
    # e.g., users:write implies users:read
    if required_scope.endswith(":read"):
        write_scope = required_scope.replace(":read", ":write")
        if write_scope in api_key_permissions:
            return True
    
    return False


def get_required_scope(path: str, method: str) -> Optional[str]:
    """
    Get the required scope for an API endpoint
    
    Args:
        path: The request path (e.g., "/api/users")
        method: The HTTP method (e.g., "GET", "POST")
    
    Returns:
        Required scope string or None if no permission required
    """
    # Normalize path (remove query string)
    path = path.split("?")[0]
    
    # Check exact matches first
    for (pattern, pattern_method), scope in ENDPOINT_SCOPE_MAP.items():
        if pattern_method == method and re.match(pattern, path):
            return scope
    
    # If no match found, return None (no permission required)
    # This allows public endpoints like /api/health, /api/auth/login
    return None


def has_permission(api_key_permissions: List[str], path: str, method: str) -> Tuple[bool, Optional[str]]:
    """
    Check if API key has permission to access the endpoint
    
    Args:
        api_key_permissions: List of scopes the API key has
        path: The request path
        method: The HTTP method
    
    Returns:
        (has_permission, required_scope)
        - has_permission: True if allowed, False if denied
        - required_scope: The scope that was required (None if no permission needed)
    """
    required_scope = get_required_scope(path, method)
    
    # If no scope required, allow access (public endpoint)
    if required_scope is None:
        return True, None
    
    # Check if API key has the required permission
    has_access = check_permission(api_key_permissions, required_scope)
    
    return has_access, required_scope

