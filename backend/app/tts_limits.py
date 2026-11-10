"""Shared TTS prompt size limits."""

from __future__ import annotations

MAX_TTS_CHARS = 4000


def tts_payload_length(text: object, style: object = None) -> int:
    """Return the billed prompt size for text plus an optional style prefix."""
    trimmed = text.strip() if isinstance(text, str) else ""
    style_text = style.strip() if isinstance(style, str) else ""
    return len(trimmed) + (len(style_text) + 20 if style_text else 0)


def assert_tts_payload_within_limit(text: object, style: object = None) -> None:
    """Raise ValueError when the TTS prompt would exceed MAX_TTS_CHARS."""
    if tts_payload_length(text, style) > MAX_TTS_CHARS:
        raise ValueError(f"Text exceeds the {MAX_TTS_CHARS} character limit")
