/**
 * Simple in-memory cache utility for API responses
 * TTL: 5 minutes (300 seconds)
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 10 * 60 * 1000; // ⚡ 10 minutes (เพิ่มจาก 5 นาที เพื่อลด API calls)
  }

  /**
   * Generate cache key from URL and params
   */
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${url}?${sortedParams}`;
  }

  /**
   * Get cached value if not expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log('❌ Cache MISS:', key.substring(0, 50) + '...');
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      console.log('⏰ Cache EXPIRED:', key.substring(0, 50) + '...');
      this.cache.delete(key);
      return null;
    }

    console.log('✅ Cache HIT:', key.substring(0, 50) + '...');
    return entry.data;
  }

  /**
   * Set cache value with TTL
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
    console.log('💾 Cache SET:', key.substring(0, 50) + '...', `(TTL: ${ttl / 1000}s)`);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern = null) {
    if (pattern === null) {
      const count = this.cache.size;
      this.cache.clear();
      console.log(`🗑️ Cache CLEARED: ${count} entries`);
      return;
    }

    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    console.log(`🗑️ Cache INVALIDATED: ${deletedCount} entries matching '${pattern}'`);
  }

  /**
   * Get cache statistics
   */
  stats() {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (now <= entry.expiresAt) {
        activeCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      total: this.cache.size,
      active: activeCount,
      expired: expiredCount
    };
  }

  /**
   * Clear expired entries (cleanup)
   */
  cleanup() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cache CLEANUP: ${deletedCount} expired entries removed`);
    }

    return deletedCount;
  }
}

// Export singleton instance
export const apiCache = new MemoryCache();

// Auto-cleanup every 10 minutes (ลด overhead)
setInterval(() => {
  apiCache.cleanup();
}, 10 * 60 * 1000);


