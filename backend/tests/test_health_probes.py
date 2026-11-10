"""Kubernetes-style /health probes must be mounted without replacing GET /health."""
from fastapi.testclient import TestClient

from app.main import app
from tests.support import expect


def test_root_health_handler_is_unchanged():
    """Docker still probes GET /health and expects the main.py payload."""
    with TestClient(app) as client:
        response = client.get("/health")
    body = response.json()
    expect(response.status_code in {200, 503}, "root /health should stay a health probe")
    expect(body.get("service") == "assistme-api", "main.py /health payload must not be replaced")
    expect("components" in body, "main.py /health should keep its components block")


def test_live_ready_and_ping_probes_are_mounted():
    """The health router used to be defined but never included in main.py."""
    with TestClient(app) as client:
        live = client.get("/health/live")
        ready = client.get("/health/ready")
        ping = client.get("/health/ping")
        details = client.get("/health/details")
        status = client.get("/health/status")
        metrics = client.get("/health/metrics")
    expect(live.status_code == 200, "/health/live should be mounted")
    expect(live.json().get("status") == "alive", "/health/live should report alive")
    expect(ready.status_code == 200, "/health/ready should be mounted")
    expect(ready.json().get("status") == "ready", "/health/ready should report ready when the app can start")
    expect(ping.status_code == 200 and ping.text == "pong", "/health/ping should return plain pong")
    expect(details.status_code == 200, "/health/details should expose the comprehensive check")
    expect(status.status_code == 200, "/health/status should be mounted")
    expect(metrics.status_code == 200, "/health/metrics should be mounted")
    expect("uptime_seconds" in metrics.json(), "/health/metrics should include uptime")
