"""
API Key Management Schemas
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


class APIKeyCreate(BaseModel):
    """API Key creation request"""
    name: str = Field(..., description="API Key name")
    permissions: Optional[List[str]] = Field(default=None, description="List of allowed endpoints (empty = all)")
    rate_limit: int = Field(default=100, ge=1, le=10000, description="Requests per minute")
    expires_at: Optional[datetime] = Field(default=None, description="Expiration date (optional)")
    ip_whitelist: Optional[List[str]] = Field(default=None, description="Allowed IP addresses (empty = all)")
    description: Optional[str] = Field(default=None, description="Description for this API key")


class APIKeyUpdate(BaseModel):
    """API Key update request"""
    name: Optional[str] = None
    permissions: Optional[List[str]] = None
    rate_limit: Optional[int] = Field(None, ge=1, le=10000)
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    ip_whitelist: Optional[List[str]] = None
    description: Optional[str] = None


class APIKeyResponse(BaseModel):
    """API Key response (without the actual key)"""
    id: str
    name: str
    key_prefix: str  # Only show prefix (tbkk_xxxxx)
    created_by: str
    created_at: str
    expires_at: Optional[str] = None
    permissions: List[str]
    rate_limit: int
    is_active: bool
    last_used_at: Optional[str] = None
    usage_count: int
    ip_whitelist: List[str]
    description: Optional[str] = None


class APIKeyCreateResponse(BaseModel):
    """API Key creation response (includes the key - shown only once)"""
    success: bool
    message: str
    api_key: str  # Full API key (shown only once!)
    key: APIKeyResponse  # Key metadata


class APIKeyUsageStats(BaseModel):
    """API Key usage statistics"""
    total_requests: int
    by_endpoint: List[dict]
    by_status: List[dict]
    avg_response_time_ms: float
    requests_per_day: List[dict]
    period_days: int


class APIRequestLog(BaseModel):
    """API Request/Response log entry"""
    id: int
    api_key_id: Optional[str] = None
    endpoint: str
    method: str
    request_headers: Optional[Dict[str, str]] = None
    request_body: Optional[str] = None
    response_status: int
    response_headers: Optional[Dict[str, str]] = None
    response_body: Optional[str] = None
    response_time_ms: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    error_message: Optional[str] = None
    timestamp: str


class APIRequestLogListResponse(BaseModel):
    """Paginated API request logs response"""
    items: List[APIRequestLog]
    total: int
    page: int
    page_size: int
    total_pages: int

