"""Unit test contracts for Gemini and Multimodal routes."""

import importlib
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from tests.support import expect


def test_gemini_status_endpoint():
    """GET /api/gemini/status returns availability, features, and model info."""
    client = TestClient(app)
    response = client.get("/api/gemini/status")
    expect(response.status_code == 200, "status endpoint must return 200")
    data = response.json()
    expect("available" in data, "available field present")
    expect("model" in data, "model field present")
    expect(isinstance(data.get("features"), list), "features is a list")
    expect("requirements" in data, "requirements field present")


def test_gemini_config_endpoint():
    """GET /api/gemini/config returns audio configuration and generation parameters."""
    client = TestClient(app)
    response = client.get("/api/gemini/config")
    expect(response.status_code == 200, "config endpoint must return 200")
    data = response.json()
    expect("model" in data, "model field present")
    expect("generationConfig" in data, "generationConfig present")
    expect("inputAudio" in data and "outputAudio" in data, "audio configs present")


def test_gemini_voices_endpoint():
    """GET /api/gemini/voices returns voice catalog grouped by category."""
    client = TestClient(app)
    response = client.get("/api/gemini/voices")
    expect(response.status_code == 200, "voices endpoint must return 200")
    data = response.json()
    expect(data.get("success") is True, "success is true")
    expect("voices" in data, "voices catalog present")
    voices = data["voices"]
    expect("neutral" in voices and "warm" in voices, "expected categories present")
    expect(data.get("default") == "Puck", "default voice is Puck")


def test_vision_analyze_empty_file_rejected():
    """POST /api/vision/analyze with empty file returns HTTP 400."""
    client = TestClient(app)
    response = client.post(
        "/api/vision/analyze",
        files={"file": ("photo.jpg", b"", "image/jpeg")},
    )
    expect(response.status_code == 400, "empty image returns 400")
    expect(response.json()["detail"] == "Empty file", "detail specifies Empty file")


def test_vision_analyze_non_image_mime_rejected():
    """POST /api/vision/analyze with non-image mime type returns HTTP 400."""
    client = TestClient(app)
    response = client.post(
        "/api/vision/analyze",
        files={"file": ("notes.txt", b"not an image", "text/plain")},
    )
    expect(response.status_code == 400, "non-image returns 400")
    expect(response.json()["detail"] == "Unsupported file type", "unsupported file type detail")


def test_vision_analyze_success(monkeypatch):
    """POST /api/vision/analyze with image returns vision description."""
    multimodal_module = importlib.import_module("app.routes.multimodal")
    mock_provider = AsyncMock()
    mock_provider.chat_completion.return_value = {
        "response": "A beautiful sunset over mountains.",
        "model": "google/gemini-2.0-flash-001:free",
    }
    monkeypatch.setattr(multimodal_module, "get_provider", lambda: mock_provider)

    client = TestClient(app)
    fake_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50
    response = client.post(
        "/api/vision/analyze",
        files={"file": ("sunset.png", fake_png, "image/png")},
        data={"prompt": "Describe this photo."},
    )
    expect(response.status_code == 200, "vision analyze returns 200")
    data = response.json()
    expect(data.get("description") == "A beautiful sunset over mountains.", "description matches")


def test_video_analyze_empty_file_rejected():
    """POST /api/video/analyze with empty file returns HTTP 400."""
    client = TestClient(app)
    response = client.post(
        "/api/video/analyze",
        files={"file": ("clip.mp4", b"", "video/mp4")},
    )
    expect(response.status_code == 400, "empty video returns 400")
    expect(response.json()["detail"] == "Empty file", "detail specifies Empty file")


def test_video_analyze_non_video_mime_rejected():
    """POST /api/video/analyze with non-video mime type returns HTTP 400."""
    client = TestClient(app)
    response = client.post(
        "/api/video/analyze",
        files={"file": ("script.sh", b"echo hi", "application/x-sh")},
    )
    expect(response.status_code == 400, "non-video returns 400")
    expect(response.json()["detail"] == "Unsupported file type", "unsupported file type detail")


def test_document_extract_empty_file_rejected():
    """POST /api/documents/extract with empty file returns HTTP 400."""
    client = TestClient(app)
    response = client.post(
        "/api/documents/extract",
        files={"file": ("doc.txt", b"", "text/plain")},
    )
    expect(response.status_code == 400, "empty document returns 400")
    expect(response.json()["detail"] == "Empty file", "detail specifies Empty file")
