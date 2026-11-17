"""Unit test contracts for /api/tts endpoints."""

import importlib
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from tests.support import expect


def test_get_tts_emotions():
    """GET /api/tts/emotions returns paralinguistic and emotion tags catalog."""
    client = TestClient(app)
    response = client.get("/api/tts/emotions")
    expect(response.status_code == 200, "emotions endpoint returns 200")
    data = response.json()
    expect(data.get("success") is True, "success is true")
    tags = data.get("paralinguistic_tags", [])
    expect("[laugh]" in tags and "[sigh]" in tags and "[whisper]" in tags, "expected paralinguistic tags present")
    emotions = data.get("auto_detected_emotions", [])
    expect("happy" in emotions and "calm" in emotions, "expected emotions present")


def test_get_tts_voices():
    """GET /api/tts/voices returns categorized Gemini TTS voices."""
    client = TestClient(app)
    response = client.get("/api/tts/voices")
    expect(response.status_code == 200, "voices endpoint returns 200")
    data = response.json()
    expect(data.get("success") is True, "success is true")
    expect("neutral" in data or "warm" in data or "all" in data, "voice categories present")


def test_get_tts_languages():
    """GET /api/tts/languages returns supported voice synthesis languages."""
    client = TestClient(app)
    response = client.get("/api/tts/languages")
    expect(response.status_code == 200, "languages endpoint returns 200")
    data = response.json()
    expect(data.get("success") is True, "success is true")


def test_get_tts_indian_languages():
    """GET /api/tts/languages/indian returns supported Indian regional languages."""
    client = TestClient(app)
    response = client.get("/api/tts/languages/indian")
    expect(response.status_code == 200, "indian languages endpoint returns 200")
    data = response.json()
    expect(data.get("success") is True, "success is true")
    expect(data.get("count") == 6, "supports 6 Indian languages")


def test_get_tts_health():
    """GET /api/tts/health returns TTS health metadata and configuration."""
    client = TestClient(app)
    response = client.get("/api/tts/health")
    expect(response.status_code == 200, "health endpoint returns 200")
    data = response.json()
    expect(data.get("success") is True, "success is true")
    expect("configured" in data, "configured flag present")
    expect("voices" in data, "voices count present")


def test_tts_synthesize_whitespace_rejected():
    """POST /api/tts/synthesize with whitespace-only text returns HTTP 400."""
    client = TestClient(app)
    response = client.post(
        "/api/tts/synthesize",
        json={"text": "     \n\t   ", "voice": "Puck"},
    )
    expect(response.status_code == 400, "whitespace text returns 400")
    expect("Text is required" in response.json()["detail"], "helpful text required detail")


def test_tts_synthesize_success(monkeypatch):
    """POST /api/tts/synthesize returns synthesized audio payload."""
    tts_route_module = importlib.import_module("app.routes.tts")
    mock_service = AsyncMock()
    mock_service.text_to_speech.return_value = {
        "audio": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
        "format": "wav",
        "voice": "Puck",
        "sample_rate": 24000,
    }
    monkeypatch.setattr(tts_route_module, "tts_service", mock_service)

    client = TestClient(app)
    response = client.post(
        "/api/tts/synthesize",
        json={"text": "Welcome to AssistMe voice.", "voice": "Puck"},
    )
    expect(response.status_code == 200, "synthesize returns 200")
    data = response.json()
    expect(data.get("success") is True, "success is true")
    expect(data.get("audio") is not None, "audio payload present")
    expect(data.get("voice") == "Puck", "voice matches")


def test_tts_voice_response_success(monkeypatch):
    """POST /api/tts/voice-response executes complete voice interaction pipeline."""
    tts_route_module = importlib.import_module("app.routes.tts")
    mock_service = AsyncMock()
    mock_service.generate_voice_response.return_value = {
        "text": "I can help you with that task.",
        "audio": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
        "voice": "Puck",
    }
    monkeypatch.setattr(tts_route_module, "tts_service", mock_service)

    client = TestClient(app)
    response = client.post(
        "/api/tts/voice-response",
        json={"message": "What is the status of my tasks?", "voice": "Puck"},
    )
    expect(response.status_code == 200, "voice-response returns 200")
    data = response.json()
    expect(data.get("success") is True, "success is true")
    expect(data.get("text") == "I can help you with that task.", "text response returned")


def test_tts_voice_response_empty_message_rejected():
    """POST /api/tts/voice-response with empty string returns HTTP 422."""
    client = TestClient(app)
    response = client.post(
        "/api/tts/voice-response",
        json={"message": ""},
    )
    expect(response.status_code == 422, "empty message rejected with 422")
