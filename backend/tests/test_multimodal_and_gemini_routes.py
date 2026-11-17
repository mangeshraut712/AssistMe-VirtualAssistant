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


def test_gemini_key_origin_and_env_guards(monkeypatch):
    """GET /api/gemini/key guards disallowed origin and missing/present API key."""
    client = TestClient(app)

    # 1. Disallowed origin returns 403
    forbidden = client.get("/api/gemini/key", headers={"origin": "https://malicious-site.example"})
    expect(forbidden.status_code == 403, "disallowed origin returns 403")

    # 2. Allowed / same-origin without GOOGLE_API_KEY returns 503
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    missing = client.get("/api/gemini/key")
    expect(missing.status_code == 503, "missing key returns 503")
    expect("not configured" in missing.json()["detail"], "helpful detail")

    # 3. Allowed with GOOGLE_API_KEY returns 200 with apiKey
    monkeypatch.setenv("GOOGLE_API_KEY", "test-google-key-12345")
    success = client.get("/api/gemini/key")
    expect(success.status_code == 200, "configured key returns 200")
    expect(success.json().get("apiKey") == "test-google-key-12345", "apiKey matches")


def test_gemini_config_voice_parameter():
    """GET /api/gemini/config supports voice query parameter with normalization and fallback."""
    client = TestClient(app)

    # Default voice
    default_res = client.get("/api/gemini/config")
    expect(default_res.status_code == 200, "default config returns 200")
    expect(default_res.json()["speechConfig"]["voiceConfig"]["prebuiltVoiceConfig"]["voiceName"] == "Puck", "default is Puck")

    # Selected valid voice
    charon_res = client.get("/api/gemini/config?voice=Charon")
    expect(charon_res.json()["speechConfig"]["voiceConfig"]["prebuiltVoiceConfig"]["voiceName"] == "Charon", "Charon voice selected")

    # Case-insensitive match
    kore_res = client.get("/api/gemini/config?voice=  kOre  ")
    expect(kore_res.json()["speechConfig"]["voiceConfig"]["prebuiltVoiceConfig"]["voiceName"] == "Kore", "kore normalized to Kore")

    # Unknown voice fallback
    unknown_res = client.get("/api/gemini/config?voice=NonExistentVoice")
    expect(unknown_res.json()["speechConfig"]["voiceConfig"]["prebuiltVoiceConfig"]["voiceName"] == "Puck", "unknown falls back to Puck")


def test_video_analyze_success(monkeypatch):
    """POST /api/video/analyze with valid video returns analysis description."""
    multimodal_module = importlib.import_module("app.routes.multimodal")
    mock_provider = AsyncMock()
    mock_provider.chat_completion.return_value = {
        "response": "A video of a drone flying over a coastline.",
        "model": "google/gemini-2.0-flash-001:free",
    }
    monkeypatch.setattr(multimodal_module, "get_provider", lambda: mock_provider)

    client = TestClient(app)
    fake_mp4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 40
    response = client.post(
        "/api/video/analyze",
        files={"file": ("clip.mp4", fake_mp4, "video/mp4")},
        data={"prompt": "What happens in this clip?"},
    )
    expect(response.status_code == 200, "video analyze returns 200")
    data = response.json()
    expect(data.get("description") == "A video of a drone flying over a coastline.", "description matches")
    expect("model" in data, "model field returned")


def test_video_analyze_service_error_500(monkeypatch):
    """POST /api/video/analyze handles provider exception with 500 status."""
    multimodal_module = importlib.import_module("app.routes.multimodal")
    mock_provider = AsyncMock()
    mock_provider.chat_completion.side_effect = RuntimeError("Upstream provider down")
    monkeypatch.setattr(multimodal_module, "get_provider", lambda: mock_provider)

    client = TestClient(app)
    fake_mp4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 40
    response = client.post(
        "/api/video/analyze",
        files={"file": ("clip.mp4", fake_mp4, "video/mp4")},
    )
    expect(response.status_code == 500, "service failure returns 500")
    expect(response.json()["detail"] == "Request failed", "detail is Request failed")


def test_vision_analyze_service_error_500(monkeypatch):
    """POST /api/vision/analyze handles provider exception with 500 status."""
    multimodal_module = importlib.import_module("app.routes.multimodal")
    mock_provider = AsyncMock()
    mock_provider.chat_completion.side_effect = RuntimeError("Vision service timeout")
    monkeypatch.setattr(multimodal_module, "get_provider", lambda: mock_provider)

    client = TestClient(app)
    fake_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50
    response = client.post(
        "/api/vision/analyze",
        files={"file": ("photo.png", fake_png, "image/png")},
    )
    expect(response.status_code == 500, "vision service failure returns 500")
    expect(response.json()["detail"] == "Request failed", "detail is Request failed")


def test_document_extract_success(monkeypatch):
    """POST /api/documents/extract extracts text and produces AI summary."""
    multimodal_module = importlib.import_module("app.routes.multimodal")
    mock_provider = AsyncMock()
    mock_provider.chat_completion.return_value = {
        "response": "Summary of quarterly earnings report.",
        "model": "google/gemini-2.0-flash-001:free",
    }
    monkeypatch.setattr(multimodal_module, "get_provider", lambda: mock_provider)

    async def fake_save(file):
        return {"path": "/tmp/test_report.pdf", "content_type": "application/pdf"}

    async def fake_extract(path, ctype):
        return "Q3 Revenue reached 50M with 20% YoY growth."

    monkeypatch.setattr(multimodal_module.file_service, "save_file", fake_save)
    monkeypatch.setattr(multimodal_module.file_service, "extract_text", fake_extract)

    client = TestClient(app)
    response = client.post(
        "/api/documents/extract",
        files={"file": ("report.pdf", b"%PDF-1.4 sample content", "application/pdf")},
        data={"prompt": "Provide executive summary."},
    )
    expect(response.status_code == 200, "document extraction returns 200")
    data = response.json()
    expect(data.get("text") == "Q3 Revenue reached 50M with 20% YoY growth.", "extracted text returned")
    expect(data.get("description") == "Summary of quarterly earnings report.", "ai summary returned")


def test_document_extract_no_text_fallback(monkeypatch):
    """POST /api/documents/extract handles empty text extraction gracefully without calling provider."""
    multimodal_module = importlib.import_module("app.routes.multimodal")

    async def fake_save(file):
        return {"path": "/tmp/empty.pdf", "content_type": "application/pdf"}

    async def fake_extract(path, ctype):
        return ""

    monkeypatch.setattr(multimodal_module.file_service, "save_file", fake_save)
    monkeypatch.setattr(multimodal_module.file_service, "extract_text", fake_extract)

    client = TestClient(app)
    response = client.post(
        "/api/documents/extract",
        files={"file": ("empty.pdf", b"%PDF-1.4 empty", "application/pdf")},
    )
    expect(response.status_code == 200, "returns 200 with fallback message")
    data = response.json()
    expect("Could not extract text" in data.get("text", ""), "fallback text returned")
    expect(data.get("description") == "No text found.", "fallback description returned")


def test_document_extract_service_error_500(monkeypatch):
    """POST /api/documents/extract returns 500 when file_service fails unexpectedly."""
    multimodal_module = importlib.import_module("app.routes.multimodal")

    async def failing_save(file):
        raise OSError("Disk quota exceeded")

    monkeypatch.setattr(multimodal_module.file_service, "save_file", failing_save)

    client = TestClient(app)
    response = client.post(
        "/api/documents/extract",
        files={"file": ("report.pdf", b"sample content", "application/pdf")},
    )
    expect(response.status_code == 500, "disk failure returns 500")
    expect(response.json()["detail"] == "Request failed", "standard error detail")

