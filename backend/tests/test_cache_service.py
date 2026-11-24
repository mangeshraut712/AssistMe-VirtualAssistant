import asyncio
import time
import pytest
from app.services.cache_service import CacheService


@pytest.mark.anyio
async def test_cache_service_set_and_get():
    cache = CacheService()
    await cache.clear()

    ok = await cache.set("test_key", {"msg": "hello", "count": 42})
    assert ok is True

    val = await cache.get("test_key")
    assert val == {"msg": "hello", "count": 42}
    assert await cache.has("test_key") is True


@pytest.mark.anyio
async def test_cache_service_ttl_expiration():
    cache = CacheService()
    await cache.clear()

    # Set with 0.1 second TTL
    await cache.set("expiring_key", "active", ttl=0.1)
    assert await cache.get("expiring_key") == "active"
    assert await cache.has("expiring_key") is True

    # Sleep past expiration
    await asyncio.sleep(0.15)
    assert await cache.get("expiring_key") is None
    assert await cache.has("expiring_key") is False


@pytest.mark.anyio
async def test_cache_service_delete_and_clear():
    cache = CacheService()
    await cache.clear()

    await cache.set("k1", "v1")
    await cache.set("k2", "v2")

    assert await cache.has("k1") is True
    assert await cache.has("k2") is True

    deleted = await cache.delete("k1")
    assert deleted is True
    assert await cache.has("k1") is False
    assert await cache.has("k2") is True

    cleared = await cache.clear()
    assert cleared is True
    assert await cache.has("k2") is False


@pytest.mark.anyio
async def test_cache_service_capacity_eviction(monkeypatch):
    monkeypatch.setenv("CACHE_MAX_MEMORY_ENTRIES", "3")
    cache = CacheService()
    await cache.clear()

    await cache.set("a", 1)
    await cache.set("b", 2)
    await cache.set("c", 3)

    assert len(cache._memory_cache) == 3

    # Adding a 4th element should evict the oldest entry "a"
    await cache.set("d", 4)
    assert len(cache._memory_cache) == 3
    assert await cache.get("a") is None
    assert await cache.get("b") == 2
    assert await cache.get("c") == 3
    assert await cache.get("d") == 4


@pytest.mark.anyio
async def test_cache_service_overwrite_at_capacity_keeps_other_entries(monkeypatch):
    """Updating a key in a full cache must not evict a different key."""
    monkeypatch.setenv("CACHE_MAX_MEMORY_ENTRIES", "2")
    cache = CacheService()
    await cache.clear()

    await cache.set("a", 1)
    await cache.set("b", 2)
    await cache.set("b", 3)

    assert await cache.get("a") == 1
    assert await cache.get("b") == 3


@pytest.mark.anyio
async def test_cache_service_disabled(monkeypatch):
    monkeypatch.setenv("CACHE_ENABLED", "false")
    cache = CacheService()
    assert cache.enabled is False

    assert await cache.set("disabled_key", "val") is False
    assert await cache.get("disabled_key") is None
    assert await cache.has("disabled_key") is False
