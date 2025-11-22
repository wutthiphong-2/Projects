"""
Response Headers Middleware
Adds standard response headers: X-Request-ID, X-Response-Time
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time
import uuid
import logging
from typing import Callable

logger = logging.getLogger(__name__)


class ResponseHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add standard response headers"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or use existing request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())
        
        # Store request ID in request state
        request.state.request_id = request_id
        
        # Record start time
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Add standard headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{response_time_ms}ms"
        
        return response

