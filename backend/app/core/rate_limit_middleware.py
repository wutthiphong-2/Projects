"""
Rate Limit Middleware
Adds rate limit headers to API responses and tracks usage
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import logging

from app.core.api_key_auth import api_key_auth

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to add rate limit headers and track API usage"""
    
    async def dispatch(self, request: Request, call_next):
        # Get API key info from request state (if authenticated via API key)
        key_info = getattr(request.state, 'api_key_info', None)
        
        # Process request
        start_time = time.time()
        response = await call_next(request)
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Add rate limit headers if API key is used
        if key_info:
            rate_limit = key_info.get("rate_limit", 100)
            
            # Get current usage count for this minute
            now = time.time()
            minute = int(now // 60)
            current_usage = api_key_auth._get_current_usage(key_info['id'])
            
            # Calculate reset time (next minute)
            reset_time = int((minute + 1) * 60)
            remaining = max(0, rate_limit - current_usage)
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(rate_limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_time)
            
            # Add request ID for tracking
            request_id = request.headers.get("X-Request-ID") or f"{int(time.time() * 1000)}"
            response.headers["X-Request-ID"] = request_id
            
            # Record usage (async, don't block response)
            try:
                endpoint = str(request.url.path)
                method = request.method
                status_code = response.status_code
                
                api_key_auth.record_usage(
                    key_info=key_info,
                    endpoint=endpoint,
                    method=method,
                    status_code=status_code,
                    response_time_ms=response_time_ms,
                    request=request
                )
            except Exception as e:
                logger.error(f"Error recording API usage: {e}")
        
        return response

