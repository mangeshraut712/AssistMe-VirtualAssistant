"""
Cache Service for AssistMe
Provides Redis-based caching with in-memory fallback
"""

import json
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)


class CacheService:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL")
        self.redis = None
        self._memory_cache = {}
        self.enabled = False

        if self.redis_url:
            try:
                import redis.asyncio as redis

                self.redis = redis.from_url(self.redis_url, decode_responses=True)
                self.enabled = True
                logger.info("Redis cache initialized")
            except ImportError:
                logger.warning("redis-py not installed, using in-memory cache")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}")

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if self.redis:
                value = await self.redis.get(key)
                if value:
                    return json.loads(value)
            return self._memory_cache.get(key)
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL (seconds)"""
        try:
            serialized = json.dumps(value)
            if self.redis:
                await self.redis.set(key, serialized, ex=ttl)
            else:
                self._memory_cache[key] = value
                # Note: In-memory cache doesn't implement TTL cleanup in this simple version
            return True
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False

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


# Global instance
cache_service = CacheService()
