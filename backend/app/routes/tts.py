"""Text-to-speech API endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.tts_service import tts_service


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    format: Optional[str] = "mp3"
    speed: Optional[float] = 1.0
    language: Optional[str] = "en"


router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.post("/synthesize")
async def synthesize(req: TTSRequest):
    """Synthesize speech audio and return base64."""
    try:
        result = await tts_service.synthesize(
            text=req.text,
            voice=req.voice,
            format=req.format or "mp3",
            speed=req.speed or 1.0,
            language=req.language or "en",
        )
        return {"success": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/voices")
async def list_voices():
    """List supported voices (static until provider introspection added)."""
    return {
        "success": True,
        "voices": [
            {"id": "en-US", "name": "English (US)", "provider": "gtts"},
        ],
    }
