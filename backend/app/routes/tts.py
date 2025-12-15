"""Text-to-speech API endpoints with Gemini 2.5 Flash TTS."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.tts_service import tts_service


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    language: Optional[str] = "en-US"
    style: Optional[str] = None  # cheerful, calm, professional, etc.
    speed: Optional[float] = 1.0


router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.post("")
@router.post("/")
@router.post("/synthesize")
async def synthesize(req: TTSRequest):
    """Synthesize speech using Gemini 2.5 Flash TTS.
    
    Features:
    - Natural HD voices (Zephyr, Puck, Charon, etc.)
    - Style control (cheerful, calm, professional)
    - 24 languages supported
    - Emotional intelligence
    
    Returns:
    - audio: base64 encoded audio
    - format: audio format (mp3)
    - provider: gemini-2.5-flash-tts or gtts-fallback
    - voice: voice name used
    """
    try:
        result = await tts_service.synthesize(
            text=req.text,
            voice=req.voice,
            language=req.language or "en-US",
            style=req.style,
            speed=req.speed or 1.0,
        )
        return {"success": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/voices")
async def list_voices():
    """List available Gemini TTS voices."""
    return {
        "success": True,
        "voices": [
            {"id": "Zephyr", "name": "Zephyr", "style": "Bright, calm"},
            {"id": "Puck", "name": "Puck", "style": "Lively, playful"},
            {"id": "Charon", "name": "Charon", "style": "Deep, authoritative"},
            {"id": "Kore", "name": "Kore", "style": "Warm, friendly"},
            {"id": "Fenrir", "name": "Fenrir", "style": "Strong, confident"},
            {"id": "Aoede", "name": "Aoede", "style": "Melodic, expressive"},
        ],
        "provider": "gemini-2.5-flash-tts"
    }


@router.get("/languages")
async def list_languages():
    """List supported languages."""
    return {
        "success": True,
        "languages": tts_service.get_supported_languages(),
    }
