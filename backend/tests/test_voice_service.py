"""Offline contracts for the legacy websocket voice service."""

import importlib

import anyio

from tests.support import expect


class _Provider:
    """Minimal chat provider used without making a provider request."""

    async def chat_completion(self, **_kwargs):
        return {"response": "spoken reply", "model": "offline-model", "tokens": 3}


class _Whisper:
    """Minimal transcription result for the voice pipeline."""

    async def transcribe(self, _audio, *, language=None):
        return {"text": "hello", "language": language or "en"}


class _Tts:
    """The supported Gemini TTS surface exposed by tts_service."""

    async def text_to_speech(self, *, text, voice, style=None):
        expect(text == "spoken reply", "the generated text should be sent to TTS")
        expect(voice == "Puck", "the requested voice should be preserved")
        expect(style is None, "legacy voice output does not invent a style")
        return {"audio": "offline-audio", "mimeType": "audio/offline"}


def test_voice_message_uses_the_supported_tts_surface(monkeypatch):
    """A normal voice reply reaches text_to_speech and preserves its MIME type."""
    voice_module = importlib.import_module("app.services.voice_service")
    monkeypatch.setattr(voice_module, "get_provider", _Provider)
    monkeypatch.setattr(voice_module, "whisper_service", _Whisper())
    monkeypatch.setattr(voice_module, "tts_service", _Tts())
    service = voice_module.VoiceService()

    result = anyio.run(service.process_voice_message, b"offline-audio", None, None, "Puck")

    expect(result["success"] is True, "the voice pipeline should complete")
    expect(result["response"]["audio"] == "offline-audio", "TTS audio should be returned")
    expect(
        result["response"]["format"] == "audio/offline",
        "the public legacy format field should expose the TTS MIME type",
    )
    expect(result["response"]["tts_error"] is None, "a supported TTS call should not fail")
