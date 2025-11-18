from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
import logging
import time

logger = logging.getLogger(__name__)


class RateLimiter:
    """In-memory rate limiter for API keys and IP addresses"""
    
    def __init__(self):
        # Structure: {identifier: {window: [(timestamp, count)]}}
        self._requests: Dict[str, Dict[str, list]] = defaultdict(lambda: defaultdict(list))
        self._cleanup_interval = 3600  # Clean up old entries every hour
        self._last_cleanup = time.time()
    
    def _cleanup_old_entries(self):
        """Remove old entries to prevent memory leak"""
        current_time = time.time()
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        cutoff_time = current_time - 86400  # 24 hours ago
        
        for identifier in list(self._requests.keys()):
            for window in list(self._requests[identifier].keys()):
                self._requests[identifier][window] = [
                    (ts, count) for ts, count in self._requests[identifier][window]
                    if ts > cutoff_time
                ]
                if not self._requests[identifier][window]:
                    del self._requests[identifier][window]
            
            if not self._requests[identifier]:
                del self._requests[identifier]
        
        self._last_cleanup = current_time
    
    def _get_window_key(self, window_seconds: int) -> str:
        """Get window key for time-based rate limiting"""
        return f"window_{window_seconds}"
    
    def _clean_window(self, identifier: str, window_seconds: int):
        """Remove old entries from a specific window"""
        window_key = self._get_window_key(window_seconds)
        current_time = time.time()
        cutoff_time = current_time - window_seconds
        
        self._requests[identifier][window_key] = [
            (ts, count) for ts, count in self._requests[identifier][window_key]
            if ts > cutoff_time
        ]
    
    def check_rate_limit(
        self,
        identifier: str,
        limit: int,
        window_seconds: int
    ) -> Tuple[bool, int, int]:
        """
        Check if request is within rate limit
        
        Returns:
            (is_allowed, current_count, limit)
        """
        self._cleanup_old_entries()
        
        window_key = self._get_window_key(window_seconds)
        current_time = time.time()
        
        # Clean old entries from this window
        self._clean_window(identifier, window_seconds)
        
        # Count requests in the window
        window_start = current_time - window_seconds
        current_count = sum(
            count for ts, count in self._requests[identifier][window_key]
            if ts > window_start
        )
        
        # Check if limit exceeded
        is_allowed = current_count < limit
        
        if is_allowed:
            # Record this request
            self._requests[identifier][window_key].append((current_time, 1))
        
        return is_allowed, current_count, limit
    
    def record_request(self, identifier: str, window_seconds: int):
        """Record a request (for tracking purposes)"""
        window_key = self._get_window_key(window_seconds)
        current_time = time.time()
        self._requests[identifier][window_key].append((current_time, 1))
    
    def get_current_usage(
        self,
        identifier: str,
        window_seconds: int
    ) -> int:
        """Get current usage count for a window"""
        window_key = self._get_window_key(window_seconds)
        current_time = time.time()
        window_start = current_time - window_seconds
        
        return sum(
            count for ts, count in self._requests[identifier][window_key]
            if ts > window_start
        )
    
    def reset_limit(self, identifier: str):
        """Reset rate limit for an identifier"""
        if identifier in self._requests:
            del self._requests[identifier]
            logger.info(f"✅ Rate limit reset for: {identifier}")


# Global instance
rate_limiter = RateLimiter()


def check_api_key_rate_limit(
    api_key_id: str,
    rate_limit_per_minute: int,
    rate_limit_per_hour: int
) -> Tuple[bool, Dict[str, any]]:
    """
    Check rate limit for API key
    
    Returns:
        (is_allowed, usage_info)
    """
    # Check per-minute limit
    allowed_min, count_min, limit_min = rate_limiter.check_rate_limit(
        f"api_key_{api_key_id}",
        rate_limit_per_minute,
        60  # 1 minute
    )
    
    if not allowed_min:
        return False, {
            "allowed": False,
            "limit_type": "per_minute",
            "current": count_min,
            "limit": limit_min,
            "reset_in": 60 - (time.time() % 60)
        }
    
    # Check per-hour limit
    allowed_hour, count_hour, limit_hour = rate_limiter.check_rate_limit(
        f"api_key_{api_key_id}",
        rate_limit_per_hour,
        3600  # 1 hour
    )
    
    if not allowed_hour:
        return False, {
            "allowed": False,
            "limit_type": "per_hour",
            "current": count_hour,
            "limit": limit_hour,
            "reset_in": 3600 - (time.time() % 3600)
        }
    
    return True, {
        "allowed": True,
        "per_minute": {
            "current": count_min,
            "limit": limit_min
        },
        "per_hour": {
            "current": count_hour,
            "limit": limit_hour
        }
    }


def check_ip_rate_limit(
    ip_address: str,
    limit_per_minute: int = 60,
    limit_per_hour: int = 1000
) -> Tuple[bool, Dict[str, any]]:
    """
    Check rate limit for IP address
    
    Returns:
        (is_allowed, usage_info)
    """
    # Check per-minute limit
    allowed_min, count_min, limit_min = rate_limiter.check_rate_limit(
        f"ip_{ip_address}",
        limit_per_minute,
        60
    )
    
    if not allowed_min:
        return False, {
            "allowed": False,
            "limit_type": "per_minute",
            "current": count_min,
            "limit": limit_min
        }
    
    # Check per-hour limit
    allowed_hour, count_hour, limit_hour = rate_limiter.check_rate_limit(
        f"ip_{ip_address}",
        limit_per_hour,
        3600
    )
    
    if not allowed_hour:
        return False, {
            "allowed": False,
            "limit_type": "per_hour",
            "current": count_hour,
            "limit": limit_hour
        }
    
    return True, {
        "allowed": True,
        "per_minute": {
            "current": count_min,
            "limit": limit_min
        },
        "per_hour": {
            "current": count_hour,
            "limit": limit_hour
        }
    }

