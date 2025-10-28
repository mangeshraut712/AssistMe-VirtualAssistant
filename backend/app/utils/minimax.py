"""
MiniMax OpenAI-compatible client helpers for multimodal operations.

Provides thin wrappers around the openai-python client configured to talk to
MiniMax's API for speech, image, and video generation.
"""

from __future__ import annotations

import base64
import io
import logging
import os
from functools import lru_cache
from typing import Any, Dict, Optional

try:
    from openai import OpenAI
    from openai import OpenAIError
except ImportError as exc:  # pragma: no cover - optional dependency
    OpenAI = None  # type: ignore[assignment]
    OpenAIError = Exception  # type: ignore[assignment]
    _OPENAI_IMPORT_ERROR = exc
else:
    _OPENAI_IMPORT_ERROR = None

logger = logging.getLogger(__name__)


class MiniMaxClientError(RuntimeError):
    """Raised when a MiniMax client operation fails."""


class MiniMaxClientNotConfigured(RuntimeError):
    """Raised when MiniMax credentials are missing."""


def _ensure_client_available() -> None:
    if OpenAI is None or _OPENAI_IMPORT_ERROR is not None:
        raise MiniMaxClientError(
            "openai package is required for MiniMax multimodal features. "
            f"Import error: {_OPENAI_IMPORT_ERROR}"
        )


def _minimax_base_url() -> str:
    return os.getenv("MINIMAX_BASE_URL", "https://api.minimax.chat/v1").rstrip("/")


def _to_primitive(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, bytes):
        return base64.b64encode(value).decode("ascii")
    if isinstance(value, list):
        return [_to_primitive(item) for item in value]
    if isinstance(value, dict):
        return {key: _to_primitive(val) for key, val in value.items()}
    if hasattr(value, "model_dump"):
        return _to_primitive(value.model_dump())
    if hasattr(value, "dict"):
        try:
            return _to_primitive(value.dict())
        except Exception:  # pragma: no cover - defensive
            return str(value)
    if hasattr(value, "__dict__"):
        try:
            return _to_primitive(vars(value))
        except Exception:  # pragma: no cover - defensive
            return str(value)
    return str(value)


@lru_cache(maxsize=1)
def get_minimax_client() -> OpenAI:
    """
    Return a cached OpenAI client configured for MiniMax.
    """
    _ensure_client_available()
    api_key = os.getenv("MINIMAX_API_KEY")
    if not api_key:
        raise MiniMaxClientNotConfigured("MINIMAX_API_KEY is not configured.")

    return OpenAI(api_key=api_key, base_url=_minimax_base_url())


def is_minimax_ready() -> bool:
    try:
        get_minimax_client()
        return True
    except (MiniMaxClientNotConfigured, MiniMaxClientError):
        return False


def generate_image(prompt: str, *, size: str = "1024x1024", model: Optional[str] = None) -> Dict[str, Any]:
    client = get_minimax_client()
    target_model = model or os.getenv("MINIMAX_IMAGE_MODEL", "image-01")

    try:
        response = client.images.generate(
            model=target_model,
            prompt=prompt,
            size=size,
            response_format="b64_json",
        )
        image_data = response.data[0]
        b64_data = image_data.get("b64_json")
        if not b64_data:
            raise MiniMaxClientError("MiniMax image response missing payload.")
        return {
            "type": "image",
            "model": target_model,
            "prompt": prompt,
            "size": size,
            "b64": b64_data,
        }
    except OpenAIError as exc:  # pragma: no cover - network errors
        logger.exception("MiniMax image generation failed")
        raise MiniMaxClientError(f"MiniMax image generation failed: {exc}") from exc


def generate_video(
    prompt: str,
    *,
    duration: str = "6s",
    resolution: str = "720p",
    model: Optional[str] = None,
) -> Dict[str, Any]:
    client = get_minimax_client()
    target_model = model or os.getenv("MINIMAX_VIDEO_MODEL", "hailuo-02")

    try:
        response = client.video.generations.create(
            model=target_model,
            prompt=prompt,
            duration=duration,
            resolution=resolution,
        )
        # MiniMax typically returns an ID + status; surface both.
        data_payload = _to_primitive(getattr(response, "data", None))
        return {
            "type": "video",
            "model": target_model,
            "prompt": prompt,
            "duration": duration,
            "resolution": resolution,
            "id": getattr(response, "id", None),
            "status": getattr(response, "status", "queued"),
            "data": data_payload,
        }
    except OpenAIError as exc:  # pragma: no cover - network errors
        logger.exception("MiniMax video generation failed")
        raise MiniMaxClientError(f"MiniMax video generation failed: {exc}") from exc


def synthesize_speech(
    text: str,
    *,
    voice: Optional[str] = None,
    format: str = "mp3",
    language: Optional[str] = None,
    model: Optional[str] = None,
) -> bytes:
    client = get_minimax_client()
    target_model = model or os.getenv("MINIMAX_TTS_MODEL", "speech-02")
    voice_name = voice or os.getenv("MINIMAX_TTS_VOICE", "alloy")
    language_code = language or os.getenv("MINIMAX_TTS_LANG", "en")

    try:
        response = client.audio.speech.create(
            model=target_model,
            voice=voice_name,
            input=text,
            response_format=format,
            language=language_code,
        )
        # openai-python returns a stream object; read() yields bytes.
        return response.read()
    except OpenAIError as exc:  # pragma: no cover - network failures
        logger.exception("MiniMax TTS failed")
        raise MiniMaxClientError(f"MiniMax TTS failed: {exc}") from exc


def transcribe_audio(
    audio_bytes: bytes,
    *,
    language: Optional[str] = None,
    format: str = "wav",
    model: Optional[str] = None,
) -> Dict[str, Any]:
    client = get_minimax_client()
    target_model = model or os.getenv("MINIMAX_STT_MODEL", "speech-02")
    language_code = language or os.getenv("MINIMAX_STT_LANG", "en")

    try:
        stream = io.BytesIO(audio_bytes)
        filename = f"audio.{format}"
        response = client.audio.transcriptions.create(
            model=target_model,
            file=(filename, stream, f"audio/{format}"),
            language=language_code,
            response_format="verbose_json",
        )
        raw_payload = _to_primitive(response)
        return {
            "text": getattr(response, "text", ""),
            "segments": _to_primitive(getattr(response, "segments", [])),
            "language": language_code,
            "raw": raw_payload,
        }
    except OpenAIError as exc:  # pragma: no cover - network failures
        logger.exception("MiniMax STT failed")
        raise MiniMaxClientError(f"MiniMax STT failed: {exc}") from exc


def encode_audio_to_base64(audio: bytes) -> str:
    return base64.b64encode(audio).decode("ascii")
