import asyncio
import time
import pytest
from app.services.rate_limit_service import RateLimitService


@pytest.mark.anyio
async def test_rate_limit_service_basic_flow():
    service = RateLimitService()
    service.requests_per_minute = 5
    service.clear_history()

    # Initial check passes
    ok, msg = await service.check_rate_limit()
    assert ok is True
    assert msg == ""

    # Record 5 requests
    for _ in range(5):
        await service.record_request("openai/gpt-oss-20b:free", 100)

    # 6th request should fail RPM limit
    ok, msg = await service.check_rate_limit()
    assert ok is False
    assert "Rate limit exceeded: 5 requests per minute" in msg


@pytest.mark.anyio
async def test_rate_limit_service_sliding_window_cleanup():
    service = RateLimitService()
    service.requests_per_minute = 2
    service.clear_history()

    # Insert old timestamps (> 60 seconds ago)
    old_time = time.time() - 70
    service.minute_requests = [old_time, old_time]

    # Check should prune old timestamps and succeed
    ok, msg = await service.check_rate_limit()
    assert ok is True
    assert len(service.minute_requests) == 0


@pytest.mark.anyio
async def test_rate_limit_service_credits_deduction_and_check():
    service = RateLimitService()
    service.reset_credits(0.001)  # $0.001

    # Check for cheap model
    ok, msg = await service.check_credits("openai/gpt-oss-20b:free", 1000)
    assert ok is True

    # Check for expensive request exceeding $0.001
    # google/gemini-2.0-flash is 0.0004 per 1k tokens. 5k tokens = $0.002 > $0.001
    ok, msg = await service.check_credits("google/gemini-2.0-flash", 5000)
    assert ok is False
    assert "Insufficient credits" in msg

    # Deduct tokens and verify non-negative floor
    await service.record_request("google/gemini-2.0-flash", 50000)
    assert service.current_credits == 0.0

    # Negative tokens guard
    await service.record_request("google/gemini-2.0-flash", -500)
    assert service.current_credits == 0.0


@pytest.mark.anyio
async def test_rate_limit_service_get_status(monkeypatch):
    monkeypatch.setenv("MAX_CREDITS", "10.0")
    service = RateLimitService()
    service.reset_credits(10.0)
    service.clear_history()

    status = await service.get_status()
    assert status["requests_this_minute"] == 0
    assert status["requests_this_hour"] == 0
    assert status["current_credits"] == 10.0
    assert status["max_credits"] == 10.0
    assert status["credit_usage_percent"] == 0.0

    await service.record_request("google/gemini-2.0-flash", 1000)
    status2 = await service.get_status()
    assert status2["requests_this_minute"] == 1
    assert status2["requests_this_hour"] == 1
    assert status2["current_credits"] < 10.0


@pytest.mark.anyio
async def test_rate_limit_service_client_tracking():
    service = RateLimitService()
    service.requests_per_minute = 2
    service.clear_history()

    # Client A records 2 requests
    await service.record_request("openai/gpt-oss-20b:free", 0, client_id="client_a")
    await service.record_request("openai/gpt-oss-20b:free", 0, client_id="client_a")

    # Client A exceeded
    ok_a, msg_a = await service.check_rate_limit(client_id="client_a")
    assert ok_a is False
    assert "Client rate limit exceeded" in msg_a
