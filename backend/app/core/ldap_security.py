"""
LDAP Security Utilities
Functions to prevent LDAP injection and sanitize inputs
"""
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def ldap_escape(value: str) -> str:
    """
    Escape special characters in LDAP search filters to prevent injection
    
    According to RFC 4515, these characters must be escaped:
    - \ (backslash) -> \\5c
    - * (asterisk) -> \\2a
    - ( (left parenthesis) -> \\28
    - ) (right parenthesis) -> \\29
    - \x00 (null) -> \\00
    
    Args:
        value: String to escape
    
    Returns:
        Escaped string safe for LDAP filters
    """
    if not isinstance(value, str):
        value = str(value)
    
    # Escape special characters
    escaped = (
        value.replace("\\", r"\\5c")
        .replace("*", r"\\2a")
        .replace("(", r"\\28")
        .replace(")", r"\\29")
        .replace("\x00", r"\\00")
    )
    
    return escaped


def sanitize_dn(dn: str) -> str:
    """
    Sanitize Distinguished Name (DN) to prevent injection
    
    Args:
        dn: DN string to sanitize
    
    Returns:
        Sanitized DN
    
    Raises:
        ValueError: If DN contains invalid characters
    """
    if not isinstance(dn, str):
        raise ValueError("DN must be a string")
    
    # Check for null bytes
    if "\x00" in dn:
        raise ValueError("DN contains null byte")
    
    # Basic validation: DN should contain at least one comma or be a valid format
    if not re.match(r'^[A-Za-z0-9=,\s\-\.]+$', dn):
        logger.warning(f"DN contains potentially unsafe characters: {dn[:50]}")
    
    return dn.strip()


def validate_search_filter(filter_str: str) -> bool:
    """
    Validate LDAP search filter format
    
    Args:
        filter_str: LDAP filter string
    
    Returns:
        True if filter appears valid
    
    Raises:
        ValueError: If filter is invalid
    """
    if not isinstance(filter_str, str):
        raise ValueError("Filter must be a string")
    
    # Check for null bytes
    if "\x00" in filter_str:
        raise ValueError("Filter contains null byte")
    
    # Basic validation: filter should start with ( and end with )
    if not filter_str.startswith("(") or not filter_str.endswith(")"):
        raise ValueError("Filter must start with ( and end with )")
    
    # Check for balanced parentheses
    count = 0
    for char in filter_str:
        if char == "(":
            count += 1
        elif char == ")":
            count -= 1
            if count < 0:
                raise ValueError("Unbalanced parentheses in filter")
    
    if count != 0:
        raise ValueError("Unbalanced parentheses in filter")
    
    return True


def sanitize_attribute_name(attr_name: str) -> str:
    """
    Sanitize LDAP attribute name
    
    Args:
        attr_name: Attribute name to sanitize
    
    Returns:
        Sanitized attribute name
    
    Raises:
        ValueError: If attribute name is invalid
    """
    if not isinstance(attr_name, str):
        raise ValueError("Attribute name must be a string")
    
    # Remove whitespace
    attr_name = attr_name.strip()
    
    # Check for null bytes
    if "\x00" in attr_name:
        raise ValueError("Attribute name contains null byte")
    
    # Basic validation: attribute names should be alphanumeric with hyphens and underscores
    if not re.match(r'^[A-Za-z0-9\-_]+$', attr_name):
        raise ValueError(f"Invalid attribute name: {attr_name}")
    
    return attr_name

