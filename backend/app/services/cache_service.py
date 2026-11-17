"""
Cache Service for AssistMe
Provides Redis-based caching with in-memory fallback
"""

import json
import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)


class CacheService:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL")
        self.redis = None
        self._memory_cache: dict[str, tuple[Any, Optional[float]]] = {}
        self._max_memory_entries = int(os.getenv("CACHE_MAX_MEMORY_ENTRIES", "1000"))

        cache_env = os.getenv("CACHE_ENABLED", "true").lower()
        self.enabled = cache_env in ("1", "true", "yes")

        if self.redis_url:
            try:
                import redis.asyncio as redis

                self.redis = redis.from_url(self.redis_url, decode_responses=True)
                logger.info("Redis cache initialized")
            except ImportError:
                logger.warning("redis-py not installed, using in-memory cache")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}")

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled:
            return None
        try:
            if self.redis:
                value = await self.redis.get(key)
                if value:
                    return json.loads(value)
            entry = self._memory_cache.get(key)
            if entry is None:
                return None
            val, expire_at = entry
            if expire_at is not None and time.time() > expire_at:
                self._memory_cache.pop(key, None)
                return None
            return val
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL (seconds)"""
        if not self.enabled:
            return False
        try:
            if self.redis:
                serialized = json.dumps(value)
                await self.redis.set(key, serialized, ex=ttl)
            else:
                now = time.time()
                if len(self._memory_cache) >= self._max_memory_entries:
                    self._prune_expired(now)
                    if len(self._memory_cache) >= self._max_memory_entries:
                        first_key = next(iter(self._memory_cache))
                        self._memory_cache.pop(first_key, None)
                expire_at = (now + ttl) if ttl and ttl > 0 else None
                self._memory_cache[key] = (value, expire_at)
            return True
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False

    def _prune_expired(self, now: Optional[float] = None) -> int:
        """Remove expired items from in-memory cache"""
        if now is None:
            now = time.time()
        expired = [k for k, (_, exp) in self._memory_cache.items() if exp is not None and now > exp]
        for k in expired:
            self._memory_cache.pop(k, None)
        return len(expired)

    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            if self.redis:
                await self.redis.delete(key)
            self._memory_cache.pop(key, None)
            return True
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")
            return False

    async def clear(self) -> bool:
        """Clear all cache"""
        try:
            if self.redis:
                await self.redis.flushdb()
            self._memory_cache.clear()
            return True
        except Exception as e:
            logger.warning(f"Cache clear error: {e}")
            return False

    async def has(self, key: str) -> bool:
        """Check if key exists and is unexpired"""
        val = await self.get(key)
        return val is not None


# Global instance
cache_service = CacheService()
