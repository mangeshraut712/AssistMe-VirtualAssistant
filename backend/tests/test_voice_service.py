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


def test_voice_message_does_not_mutate_caller_history(monkeypatch):
    """Passing a conversation history list must not be mutated in-place by voice service."""
    voice_module = importlib.import_module("app.services.voice_service")
    monkeypatch.setattr(voice_module, "get_provider", _Provider)
    monkeypatch.setattr(voice_module, "whisper_service", _Whisper())
    monkeypatch.setattr(voice_module, "tts_service", _Tts())
    service = voice_module.VoiceService()

    original_history = [{"role": "user", "content": "hello earlier"}]
    history_copy = list(original_history)

    result = anyio.run(service.process_voice_message, b"offline-audio", original_history, None, "Puck")

    expect(result["success"] is True, "voice processing succeeds")
    expect(len(original_history) == 1, "original history must not be mutated or appended to")
    expect(original_history == history_copy, "history items must remain unchanged")


class _StreamingProvider:
    """Provider yielding streaming chunks."""

    def __init__(self, chunks):
        self.chunks = chunks

    async def chat_completion(self, **_kwargs):
        async def _generator():
            for c in self.chunks:
                yield c
        return _generator()


def test_voice_stream_yields_transcription_text_and_audio(monkeypatch):
    """Streaming voice pipeline yields transcription, text chunks, and final TTS audio."""
    voice_module = importlib.import_module("app.services.voice_service")
    chunks = [
        {"content": "spoken "},
        {"content": "reply"},
    ]
    monkeypatch.setattr(voice_module, "get_provider", lambda: _StreamingProvider(chunks))
    monkeypatch.setattr(voice_module, "whisper_service", _Whisper())
    monkeypatch.setattr(voice_module, "tts_service", _Tts())
    service = voice_module.VoiceService()

    async def _collect():
        items = []
        async for chunk in service.process_voice_stream(b"audio"):
            items.append(chunk)
        return items

    results = anyio.run(_collect)

    expect(len(results) == 4, f"expected 4 chunks (transcription + 2 text + audio), got {len(results)}")
    expect(results[0]["type"] == "transcription", "first chunk is transcription")
    expect(results[0]["text"] == "hello", "transcription text matches")
    expect(results[1]["type"] == "text_chunk" and results[1]["content"] == "spoken ", "chunk 1 matches")
    expect(results[2]["type"] == "text_chunk" and results[2]["content"] == "reply", "chunk 2 matches")
    expect(results[3]["type"] == "audio", "final chunk is synthesized audio")
    expect(results[3]["audio"] == "offline-audio", "audio matches")
    expect(results[3]["format"] == "audio/offline", "audio format matches")


def test_voice_stream_handles_stream_error_chunk(monkeypatch):
    """Streaming voice pipeline stops and yields error chunk if provider returns error."""
    voice_module = importlib.import_module("app.services.voice_service")
    error_chunks = [
        {"content": "partial "},
        {"error": "Rate limit exceeded"},
    ]
    monkeypatch.setattr(voice_module, "get_provider", lambda: _StreamingProvider(error_chunks))
    monkeypatch.setattr(voice_module, "whisper_service", _Whisper())
    monkeypatch.setattr(voice_module, "tts_service", _Tts())
    service = voice_module.VoiceService()

    async def _collect():
        items = []
        async for chunk in service.process_voice_stream(b"audio"):
            items.append(chunk)
        return items

    results = anyio.run(_collect)

    types = [r["type"] for r in results]
    expect("transcription" in types, "transcription yielded")
    expect("text_chunk" in types, "partial text chunk yielded")
    expect("error" in types, "error chunk yielded")
    expect("audio" not in types, "audio is never synthesized when stream errors out")

