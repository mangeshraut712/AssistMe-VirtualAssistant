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
