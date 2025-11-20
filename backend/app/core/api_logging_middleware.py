"""
API Request/Response Logging Middleware
Logs detailed request/response data for API keys
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
import time
import json
import logging
from typing import Callable

from app.core.api_keys import api_key_manager
from app.core.api_key_auth import api_key_auth

logger = logging.getLogger(__name__)


class APILoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log API requests and responses"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip logging for certain paths
        skip_paths = ['/docs', '/openapi.json', '/redoc', '/health']
        if any(request.url.path.startswith(path) for path in skip_paths):
            return await call_next(request)
        
        # Only log API paths
        if not request.url.path.startswith('/api/'):
            return await call_next(request)
        
        start_time = time.time()
        api_key_id = None
        request_body = None
        response_body = None
        response_headers = None
        error_message = None
        
        # Try to extract API key
        try:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")
                # Check if it's an API key (starts with tbkk_)
                if token.startswith("tbkk_"):
                    key_info = api_key_manager.verify_api_key(token)
                    if key_info and not key_info.get("expired"):
                        api_key_id = key_info["id"]
        except Exception:
            pass  # Not an API key request or invalid
        
        # Capture request body (only for POST/PUT/PATCH)
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                if body_bytes:
                    request_body = body_bytes.decode('utf-8', errors='ignore')
                    # Re-create request with body for downstream handlers
                    async def receive():
                        return {"type": "http.request", "body": body_bytes}
                    request._receive = receive
            except Exception as e:
                logger.debug(f"Could not capture request body: {e}")
        
        # Process request
        try:
            response = await call_next(request)
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Capture response body
            if hasattr(response, 'body'):
                try:
                    response_body = response.body.decode('utf-8', errors='ignore')
                except:
                    pass
            elif isinstance(response, StreamingResponse):
                # For streaming responses, we can't easily capture body
                response_body = "<streaming response>"
            
            # Capture response headers
            response_headers = dict(response.headers)
            
            # Log if API key was used
            if api_key_id:
                try:
                    client_ip = request.client.host if request.client else None
                    user_agent = request.headers.get("User-Agent")
                    
                    # Get request headers (sanitize sensitive data)
                    request_headers_dict = dict(request.headers)
                    sensitive_headers = ['authorization', 'cookie', 'x-api-key']
                    sanitized_headers = {
                        k: v if k.lower() not in sensitive_headers else "***REDACTED***"
                        for k, v in request_headers_dict.items()
                    }
                    
                    # Only log detailed logs for non-GET requests, errors, or slow requests
                    should_log_detail = (
                        request.method != "GET" or 
                        response.status_code >= 400 or 
                        response_time_ms > 1000
                    )
                    
                    if should_log_detail:
                        api_key_manager.log_request_response(
                            api_key_id=api_key_id,
                            endpoint=request.url.path,
                            method=request.method,
                            request_headers=sanitized_headers,
                            request_body=request_body,
                            response_status=response.status_code,
                            response_headers=response_headers,
                            response_body=response_body,
                            response_time_ms=response_time_ms,
                            ip_address=client_ip,
                            user_agent=user_agent,
                            error_message=error_message
                        )
                except Exception as e:
                    logger.error(f"Error logging API request: {e}")
            
            return response
            
        except Exception as e:
            response_time_ms = int((time.time() - start_time) * 1000)
            error_message = str(e)
            
            # Log error if API key was used
            if api_key_id:
                try:
                    client_ip = request.client.host if request.client else None
                    user_agent = request.headers.get("User-Agent")
                    
                    request_headers_dict = dict(request.headers)
                    sensitive_headers = ['authorization', 'cookie', 'x-api-key']
                    sanitized_headers = {
                        k: v if k.lower() not in sensitive_headers else "***REDACTED***"
                        for k, v in request_headers_dict.items()
                    }
                    
                    api_key_manager.log_request_response(
                        api_key_id=api_key_id,
                        endpoint=request.url.path,
                        method=request.method,
                        request_headers=sanitized_headers,
                        request_body=request_body,
                        response_status=500,
                        response_headers=None,
                        response_body=None,
                        response_time_ms=response_time_ms,
                        ip_address=client_ip,
                        user_agent=user_agent,
                        error_message=error_message
                    )
                except Exception as log_error:
                    logger.error(f"Error logging API error: {log_error}")
            
            raise

