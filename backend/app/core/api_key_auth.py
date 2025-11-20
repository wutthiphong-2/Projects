"""
API Key Authentication Middleware
Allows API access using API keys instead of JWT tokens
"""
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import time
import logging
from fastapi import Request

from app.core.api_keys import api_key_manager
from app.core.exceptions import UnauthorizedError

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


class APIKeyAuth:
    """API Key Authentication dependency"""
    
    def __init__(self):
        self.rate_limit_cache = {}  # Simple in-memory cache for rate limiting
    
    def verify_api_key(
        self,
        credentials: Optional[HTTPAuthorizationCredentials] = None,
        request: Request = None
    ):
        """Verify API key from Authorization header"""
        if not credentials:
            raise UnauthorizedError("API key required. Use header: Authorization: Bearer <api_key>")
        
        api_key = credentials.credentials
        
        # Verify API key
        key_info = api_key_manager.verify_api_key(api_key)
        if not key_info:
            raise UnauthorizedError("Invalid API key")
        
        # Check if expired
        if key_info.get("expired"):
            raise UnauthorizedError(f"API key '{key_info.get('name', 'Unknown')}' has expired")
        
        # Check IP whitelist
        if key_info["ip_whitelist"]:
            client_ip = self._get_client_ip(request)
            if client_ip not in key_info["ip_whitelist"]:
                raise UnauthorizedError(f"IP address {client_ip} not allowed")
        
        # Check rate limit (simple implementation)
        if not self._check_rate_limit(key_info["id"], key_info["rate_limit"]):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(key_info["rate_limit"]),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": "60"
                }
            )
        
        # Store key info in request state for middleware
        if request:
            request.state.api_key_info = key_info
        
        return key_info
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        if not request:
            return "unknown"
        
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _check_rate_limit(self, key_id: str, rate_limit: int) -> bool:
        """
        Simple rate limiting (in-memory)
        For production, use Redis or similar
        """
        current_usage = self._get_current_usage(key_id)
        return current_usage < rate_limit
    
    def _get_current_usage(self, key_id: str) -> int:
        """Get current usage count for this minute"""
        now = time.time()
        minute = int(now // 60)
        cache_key = f"{key_id}:{minute}"
        
        if cache_key not in self.rate_limit_cache:
            self.rate_limit_cache[cache_key] = 0
        
        self.rate_limit_cache[cache_key] += 1
        
        # Clean old entries (keep only last 2 minutes)
        for k in list(self.rate_limit_cache.keys()):
            if int(k.split(":")[1]) < minute - 2:
                del self.rate_limit_cache[k]
        
        return self.rate_limit_cache[cache_key]
    
    def record_usage(
        self,
        key_info: dict,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: int,
        request: Request,
        request_body: Optional[str] = None,
        response_body: Optional[str] = None,
        response_headers: Optional[dict] = None,
        error_message: Optional[str] = None
    ):
        """Record API usage and detailed request/response logs"""
        try:
            client_ip = self._get_client_ip(request)
            user_agent = request.headers.get("User-Agent")
            
            # Record basic usage stats
            api_key_manager.record_usage(
                api_key_id=key_info["id"],
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                response_time_ms=response_time_ms,
                ip_address=client_ip
            )
            
            # Log detailed request/response (only for non-GET requests or errors)
            should_log_detail = (
                method != "GET" or 
                status_code >= 400 or 
                response_time_ms > 1000  # Log slow requests
            )
            
            if should_log_detail:
                # Get request headers (sanitize sensitive data)
                request_headers_dict = dict(request.headers)
                # Remove sensitive headers
                sensitive_headers = ['authorization', 'cookie', 'x-api-key']
                sanitized_headers = {
                    k: v if k.lower() not in sensitive_headers else "***REDACTED***"
                    for k, v in request_headers_dict.items()
                }
                
                api_key_manager.log_request_response(
                    api_key_id=key_info["id"],
                    endpoint=endpoint,
                    method=method,
                    request_headers=sanitized_headers,
                    request_body=request_body,
                    response_status=status_code,
                    response_headers=response_headers,
                    response_body=response_body,
                    response_time_ms=response_time_ms,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    error_message=error_message
                )
        except Exception as e:
            logger.error(f"Error recording API usage: {e}")


# Global instance
api_key_auth = APIKeyAuth()


def verify_api_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None
):
    """Dependency for API key authentication"""
    return api_key_auth.verify_api_key(credentials, request)

