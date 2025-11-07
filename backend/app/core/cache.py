"""
Simple in-memory cache for FastAPI endpoints
"""
from functools import wraps
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

class SimpleCache:
    """Thread-safe in-memory cache with TTL"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value if not expired"""
        if key in self._cache:
            entry = self._cache[key]
            if datetime.now() < entry['expires_at']:
                logger.debug(f"✅ Cache HIT: {key[:50]}...")
                return entry['value']
            else:
                # Expired, remove it
                logger.debug(f"⏰ Cache EXPIRED: {key[:50]}...")
                del self._cache[key]
        
        logger.debug(f"❌ Cache MISS: {key[:50]}...")
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set cache value with TTL (default 5 minutes)"""
        self._cache[key] = {
            'value': value,
            'expires_at': datetime.now() + timedelta(seconds=ttl_seconds),
            'created_at': datetime.now()
        }
        logger.debug(f"💾 Cache SET: {key[:50]}... (TTL: {ttl_seconds}s)")
    
    def invalidate(self, pattern: Optional[str] = None):
        """Invalidate cache entries matching pattern, or all if pattern is None"""
        if pattern is None:
            count = len(self._cache)
            self._cache.clear()
            logger.info(f"🗑️ Cache CLEARED: {count} entries")
        else:
            keys_to_delete = [k for k in self._cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self._cache[key]
            logger.info(f"🗑️ Cache INVALIDATED: {len(keys_to_delete)} entries matching '{pattern}'")
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        now = datetime.now()
        active_entries = sum(1 for entry in self._cache.values() if now < entry['expires_at'])
        return {
            'total_entries': len(self._cache),
            'active_entries': active_entries,
            'expired_entries': len(self._cache) - active_entries
        }

# Global cache instance
cache = SimpleCache()

def make_cache_key(endpoint: str, **kwargs) -> str:
    """Create a cache key from endpoint and parameters"""
    # Sort kwargs for consistent keys
    sorted_params = sorted(kwargs.items())
    params_str = json.dumps(sorted_params, sort_keys=True)
    key_str = f"{endpoint}:{params_str}"
    # Hash for shorter keys
    return hashlib.md5(key_str.encode()).hexdigest()

def cached_response(ttl_seconds: int = 300):
    """
    Decorator to cache endpoint responses
    
    Usage:
        @cached_response(ttl_seconds=300)
        async def get_users(...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract only serializable params for cache key
            cache_params = {
                k: v for k, v in kwargs.items() 
                if isinstance(v, (str, int, float, bool, type(None)))
            }
            
            cache_key = make_cache_key(func.__name__, **cache_params)
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Cache miss, call function
            result = await func(*args, **kwargs)
            
            # Store in cache
            cache.set(cache_key, result, ttl_seconds)
            
            return result
        
        return wrapper
    return decorator

def invalidate_cache(pattern: Optional[str] = None):
    """Helper to invalidate cache entries"""
    cache.invalidate(pattern)


