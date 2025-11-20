"""
API Error Codes
Standardized error codes for API responses
"""
from enum import Enum


class APIErrorCode(str, Enum):
    """Standard API error codes"""
    
    # Authentication & Authorization (1xxx)
    AUTH_REQUIRED = "AUTH_REQUIRED"
    AUTH_INVALID = "AUTH_INVALID"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_INSUFFICIENT_PERMISSIONS"
    AUTH_IP_NOT_ALLOWED = "AUTH_IP_NOT_ALLOWED"
    
    # Rate Limiting (2xxx)
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    RATE_LIMIT_QUOTA_EXCEEDED = "RATE_LIMIT_QUOTA_EXCEEDED"
    
    # Validation (3xxx)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_PARAMETER = "INVALID_PARAMETER"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_FORMAT = "INVALID_FORMAT"
    
    # Resource (4xxx)
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    
    # Server (5xxx)
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    
    # API Key Specific (6xxx)
    API_KEY_NOT_FOUND = "API_KEY_NOT_FOUND"
    API_KEY_INVALID = "API_KEY_INVALID"
    API_KEY_EXPIRED = "API_KEY_EXPIRED"
    API_KEY_INACTIVE = "API_KEY_INACTIVE"
    API_KEY_PERMISSION_DENIED = "API_KEY_PERMISSION_DENIED"


# Error messages mapping
ERROR_MESSAGES = {
    APIErrorCode.AUTH_REQUIRED: "Authentication required. Please provide a valid API key or token.",
    APIErrorCode.AUTH_INVALID: "Invalid authentication credentials.",
    APIErrorCode.AUTH_EXPIRED: "Authentication token has expired. Please refresh your token.",
    APIErrorCode.AUTH_INSUFFICIENT_PERMISSIONS: "You don't have permission to access this resource.",
    APIErrorCode.AUTH_IP_NOT_ALLOWED: "Your IP address is not allowed to access this API.",
    
    APIErrorCode.RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Please try again later.",
    APIErrorCode.RATE_LIMIT_QUOTA_EXCEEDED: "Daily quota exceeded. Please upgrade your plan.",
    
    APIErrorCode.VALIDATION_ERROR: "Request validation failed. Please check your input.",
    APIErrorCode.INVALID_PARAMETER: "Invalid parameter value.",
    APIErrorCode.MISSING_REQUIRED_FIELD: "Required field is missing.",
    APIErrorCode.INVALID_FORMAT: "Invalid data format.",
    
    APIErrorCode.RESOURCE_NOT_FOUND: "The requested resource was not found.",
    APIErrorCode.RESOURCE_ALREADY_EXISTS: "Resource already exists.",
    APIErrorCode.RESOURCE_CONFLICT: "Resource conflict occurred.",
    
    APIErrorCode.INTERNAL_ERROR: "An internal server error occurred. Please try again later.",
    APIErrorCode.SERVICE_UNAVAILABLE: "Service is temporarily unavailable.",
    APIErrorCode.DATABASE_ERROR: "Database operation failed.",
    APIErrorCode.EXTERNAL_SERVICE_ERROR: "External service error occurred.",
    
    APIErrorCode.API_KEY_NOT_FOUND: "API key not found.",
    APIErrorCode.API_KEY_INVALID: "Invalid API key.",
    APIErrorCode.API_KEY_EXPIRED: "API key has expired.",
    APIErrorCode.API_KEY_INACTIVE: "API key is inactive.",
    APIErrorCode.API_KEY_PERMISSION_DENIED: "API key doesn't have permission for this endpoint.",
}


def get_error_message(error_code: APIErrorCode) -> str:
    """Get user-friendly error message for error code"""
    return ERROR_MESSAGES.get(error_code, "An error occurred.")


def get_retry_after(error_code: APIErrorCode) -> int:
    """Get retry after seconds for error code"""
    retry_map = {
        APIErrorCode.RATE_LIMIT_EXCEEDED: 60,
        APIErrorCode.SERVICE_UNAVAILABLE: 30,
        APIErrorCode.EXTERNAL_SERVICE_ERROR: 10,
    }
    return retry_map.get(error_code, 0)

