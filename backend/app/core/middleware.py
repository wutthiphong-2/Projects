from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse
import time
import logging
from typing import Callable

from app.core.rate_limit import check_api_key_rate_limit, check_ip_rate_limit
from app.core.api_keys import api_key_manager
from app.core.api_usage import api_usage_logger
from app.core.permissions import has_permission
from app.routers.auth import get_client_ip

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for certain paths
        skip_paths = ["/", "/api/health", "/docs", "/openapi.json", "/redoc", "/api/auth/login"]
        if request.url.path in skip_paths:
            return await call_next(request)
        
        # Only apply rate limiting to API paths
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        
        # Get API key from header
        api_key = request.headers.get("X-API-Key")
        client_ip = get_client_ip(request) or "unknown"
        
        # Check rate limit
        if api_key:
            # Validate API key and get rate limit settings
            api_key_info = api_key_manager.validate_key(api_key)
            if api_key_info:
                # Check API key rate limit
                allowed, usage_info = check_api_key_rate_limit(
                    api_key_info["id"],
                    api_key_info["rate_limit_per_minute"],
                    api_key_info["rate_limit_per_hour"]
                )
                
                if not allowed:
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "detail": "Rate limit exceeded",
                            "limit_type": usage_info.get("limit_type"),
                            "current": usage_info.get("current"),
                            "limit": usage_info.get("limit"),
                            "reset_in": usage_info.get("reset_in", 60)
                        },
                        headers={
                            "X-RateLimit-Limit": str(usage_info.get("limit", 0)),
                            "X-RateLimit-Remaining": str(max(0, usage_info.get("limit", 0) - usage_info.get("current", 0))),
                            "Retry-After": str(usage_info.get("reset_in", 60))
                        }
                    )
        
        # For requests without API key, apply IP-based rate limiting (more lenient)
        # This helps prevent abuse but doesn't block legitimate JWT token users
        allowed, usage_info = check_ip_rate_limit(
            client_ip,
            limit_per_minute=120,  # Higher limit for IP-based
            limit_per_hour=2000
        )
        
        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please use API key for higher limits.",
                    "limit_type": usage_info.get("limit_type"),
                    "current": usage_info.get("current"),
                    "limit": usage_info.get("limit")
                },
                headers={
                    "X-RateLimit-Limit": str(usage_info.get("limit", 0)),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": "60"
                }
            )
        
        # Continue to next middleware/endpoint
        return await call_next(request)


class PermissionMiddleware(BaseHTTPMiddleware):
    """Middleware for checking API key permissions"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip permission check for certain paths
        skip_paths = ["/", "/api/health", "/docs", "/openapi.json", "/redoc", "/api/auth/login"]
        if request.url.path in skip_paths:
            return await call_next(request)
        
        # Only check permissions for API paths
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        
        # Get API key from header
        api_key = request.headers.get("X-API-Key")
        
        # If API key is present, check permissions
        if api_key:
            api_key_info = api_key_manager.validate_key(api_key)
            if api_key_info:
                api_key_permissions = api_key_info.get("permissions", [])
                path = request.url.path
                method = request.method
                
                # Check if API key has required permission
                has_access, required_scope = has_permission(api_key_permissions, path, method)
                
                if not has_access and required_scope:
                    logger.warning(
                        f"❌ Permission denied: API key {api_key_info['id']} "
                        f"attempted {method} {path} but lacks {required_scope}"
                    )
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "detail": f"Permission denied. Required scope: {required_scope}",
                            "required_scope": required_scope,
                            "api_key_id": api_key_info["id"],
                            "api_key_name": api_key_info["name"]
                        }
                    )
        
        # Continue to next middleware/endpoint
        return await call_next(request)


class APIUsageLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging API usage"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip logging for certain paths
        if request.url.path in ["/", "/api/health", "/docs", "/openapi.json", "/redoc"]:
            return await call_next(request)
        
        # Record start time
        start_time = time.time()
        
        # Get API key from header
        api_key = request.headers.get("X-API-Key")
        api_key_id = None
        
        if api_key:
            api_key_info = api_key_manager.validate_key(api_key)
            if api_key_info:
                api_key_id = api_key_info["id"]
        
        # Get client IP
        client_ip = get_client_ip(request)
        
        # Process request
        response = await call_next(request)
        
        # Calculate response time
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Log API usage (async, don't block response)
        try:
            api_usage_logger.log_usage(
                endpoint=str(request.url.path),
                method=request.method,
                status_code=response.status_code,
                response_time=response_time,
                api_key_id=api_key_id,
                ip_address=client_ip
            )
        except Exception as e:
            logger.error(f"Error logging API usage: {e}")
        
        return response

