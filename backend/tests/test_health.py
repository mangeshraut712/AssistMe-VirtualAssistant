import os
from fastapi.testclient import TestClient

# Set development mode for tests so health check passes without API keys
os.environ["DEV_MODE"] = "true"

from app.main import app


client = TestClient(app)


def test_health_endpoint_returns_ok_status():
    response = client.get("/health")
    assert response.status_code == 200

    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "assistme-api"
    assert "timestamp" in payload


def test_root_endpoint_returns_success_message():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AssistMe API is running", "status": "healthy"}
