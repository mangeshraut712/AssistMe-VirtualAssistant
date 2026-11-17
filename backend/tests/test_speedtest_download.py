"""The download probe must advertise its clamped size with Content-Length."""
import app.routes.speedtest as speedtest_module
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes.speedtest import router as speedtest_router
from tests.support import expect


def _client() -> TestClient:
    app = FastAPI()
    app.include_router(speedtest_router)
    return TestClient(app)


def test_download_sets_content_length_to_the_clamped_size():
    """Clients need the standard Content-Length, not only the custom X-Content-Length."""
    client = _client()
    size = 2048
    response = client.get(f"/api/speedtest/download?size={size}")
    expect(response.status_code == 200, "download should succeed")
    expect(
        response.headers.get("content-length") == str(size),
        "Content-Length should match the requested size when it is in range",
    )
    expect(
        response.headers.get("x-content-length") == str(size),
        "X-Content-Length should stay in sync with Content-Length",
    )
    expect(len(response.content) == size, "body should contain exactly the advertised bytes")


def test_download_content_length_follows_the_clamp(monkeypatch):
    """Oversized and undersized requests still advertise the clamped payload."""
    monkeypatch.setattr(speedtest_module, "MAX_DOWNLOAD_BYTES", 4096)
    monkeypatch.setattr(speedtest_module, "MIN_DOWNLOAD_BYTES", 32)
    client = _client()
    huge = client.get("/api/speedtest/download?size=1000000000")
    expect(huge.status_code == 200, "oversized requests should clamp, not fail")
    expect(
        huge.headers.get("content-length") == "4096",
        "Content-Length should be the cap",
    )
    expect(len(huge.content) == 4096, "body should stop at the cap")
    tiny = client.get("/api/speedtest/download?size=1")
    expect(
        tiny.headers.get("content-length") == "32",
        "Content-Length should be the floor",
    )
    expect(len(tiny.content) == 32, "body should be padded to the floor")


def test_ping_returns_pong_and_no_cache_headers():
    """Ping endpoint returns pong status, timestamp, and aggressive no-cache headers."""
    client = _client()
    response = client.get("/api/speedtest/ping")
    expect(response.status_code == 200, "ping should succeed")
    data = response.json()
    expect(data.get("status") == "pong", "status must be pong")
    expect("timestamp" in data, "timestamp must be present")
    cache_control = response.headers.get("cache-control", "")
    expect("no-store" in cache_control and "no-cache" in cache_control, "no-cache headers required")


def test_upload_calculates_size_and_speed():
    """Upload endpoint consumes bytes, logs timing, and computes mbps throughput."""
    client = _client()
    payload = b"X" * 1024 * 64  # 64 KB upload
    response = client.post("/api/speedtest/upload", content=payload)
    expect(response.status_code == 200, "upload should succeed")
    data = response.json()
    expect(data.get("status") == "ok", "status should be ok")
    expect(data.get("size_received") == 1024 * 64, "size received must match payload")
    expect("duration" in data and data["duration"] >= 0, "duration must be non-negative")
    expect("speed_mbps" in data and data["speed_mbps"] >= 0, "speed_mbps must be reported")


def test_upload_rejects_payload_exceeding_limit(monkeypatch):
    """Upload exceeding maximum byte limit must return HTTP 413."""
    monkeypatch.setattr(speedtest_module, "MAX_UPLOAD_BYTES", 1024)
    client = _client()
    oversized = b"A" * 2048
    response = client.post("/api/speedtest/upload", content=oversized)
    expect(response.status_code == 413, "oversized upload should return 413")
    expect("Upload exceeds" in response.json()["detail"], "helpful 413 error detail")


def test_upload_empty_payload():
    """Empty upload body returns 0 bytes received with status ok."""
    client = _client()
    response = client.post("/api/speedtest/upload", content=b"")
    expect(response.status_code == 200, "empty upload should succeed")
    data = response.json()
    expect(data.get("size_received") == 0, "size received should be zero")
    expect(data.get("status") == "ok", "status should be ok")


def test_clamp_download_size_handles_invalid_types():
    """Invalid non-integer and overflow size values safely default to MIN_DOWNLOAD_BYTES."""
    from app.routes.speedtest import MIN_DOWNLOAD_BYTES, clamp_download_size
    expect(clamp_download_size("invalid") == MIN_DOWNLOAD_BYTES, "string should fallback to min")
    expect(clamp_download_size(None) == MIN_DOWNLOAD_BYTES, "None should fallback to min")
    expect(clamp_download_size(-500) == MIN_DOWNLOAD_BYTES, "negative should clamp to min")
    expect(clamp_download_size(float("inf")) == MIN_DOWNLOAD_BYTES, "positive infinity should fallback to min without overflow")
    expect(clamp_download_size(float("-inf")) == MIN_DOWNLOAD_BYTES, "negative infinity should fallback to min without overflow")
    expect(clamp_download_size(float("nan")) == MIN_DOWNLOAD_BYTES, "NaN should fallback to min")
