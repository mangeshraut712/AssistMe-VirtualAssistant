"""Unit test contracts for /api/speech endpoints."""

import importlib
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from tests.support import expect


def test_get_supported_languages():
    """GET /api/speech/languages returns status 200 with language list."""
    client = TestClient(app)
    response = client.get("/api/speech/languages")
    expect(response.status_code == 200, "languages endpoint should return 200")
    data = response.json()
    expect(data.get("success") is True, "success should be true")
    languages = data.get("languages", [])
    expect(len(languages) > 10, "should support multiple languages")
    codes = {lang["code"] for lang in languages}
    expect("en" in codes and "hi" in codes and "mr" in codes, "should include en, hi, mr")


def test_transcribe_empty_file_rejected():
    """POST /api/speech/transcribe with empty file returns HTTP 400."""
    client = TestClient(app)
    response = client.post(
        "/api/speech/transcribe",
        files={"file": ("audio.wav", b"", "audio/wav")},
    )
    expect(response.status_code == 400, "empty audio file returns 400")
    expect(response.json()["detail"] == "Empty file", "detail specifies Empty file")


def test_transcribe_audio_success(monkeypatch):
    """POST /api/speech/transcribe with audio returns transcription payload."""
    speech_route_module = importlib.import_module("app.routes.speech")
    mock_service = AsyncMock()
    mock_service.transcribe.return_value = {
        "text": "Hello world from speech test",
        "language": "en",
        "segments": [{"id": 0, "start": 0.0, "end": 1.5, "text": "Hello world from speech test"}],
    }
    monkeypatch.setattr(speech_route_module, "whisper_service", mock_service)

    client = TestClient(app)
    fake_wav = b"RIFF" + b"\x00" * 100
    response = client.post(
        "/api/speech/transcribe",
        files={"file": ("sample.wav", fake_wav, "audio/wav")},
        data={"language": "en"},
    )
    expect(response.status_code == 200, "transcribe returns 200")
    data = response.json()
    expect(data["success"] is True, "success must be true")
    expect(data["text"] == "Hello world from speech test", "text matches")
    expect(data["language"] == "en", "language matches")
    expect(len(data["segments"]) == 1, "segments included")


def test_detect_language_empty_file_rejected():
    """POST /api/speech/detect-language with empty file returns HTTP 400."""
    client = TestClient(app)
    response = client.post(
        "/api/speech/detect-language",
        files={"file": ("sample.wav", b"", "audio/wav")},
    )
    expect(response.status_code == 400, "empty audio file returns 400")
    expect(response.json()["detail"] == "Empty file", "detail specifies Empty file")


def test_detect_language_success(monkeypatch):
    """POST /api/speech/detect-language returns detected language code."""
    speech_route_module = importlib.import_module("app.routes.speech")
    mock_service = AsyncMock()
    mock_service.detect_language.return_value = "en"
    monkeypatch.setattr(speech_route_module, "whisper_service", mock_service)

    client = TestClient(app)
    fake_wav = b"RIFF" + b"\x00" * 100
    response = client.post(
        "/api/speech/detect-language",
        files={"file": ("sample.wav", fake_wav, "audio/wav")},
    )
    expect(response.status_code == 200, "detect-language returns 200")
    data = response.json()
    expect(data["success"] is True, "success is true")
    expect(data["language"] == "en", "language is en")


def test_transcribe_audio_oversized_rejected(monkeypatch):
    """POST /api/speech/transcribe with oversized file returns HTTP 400."""
    speech_route_module = importlib.import_module("app.routes.speech")
    monkeypatch.setattr(speech_route_module, "MAX_AUDIO_BYTES", 50)

    client = TestClient(app)
    fake_audio = b"X" * 60
    response = client.post(
        "/api/speech/transcribe",
        files={"file": ("large.wav", fake_audio, "audio/wav")},
    )
    expect(response.status_code == 400, "oversized audio returns 400")
    expect("exceeds the upload size limit" in response.json()["detail"], "size limit detail")
