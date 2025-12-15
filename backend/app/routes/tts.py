"""
TTS API endpoints using OpenRouter with Gemini models.

Routes text through OpenRouter (using BYOK Google API key)
just like we do for chat completions.
"""

from typing import Optional, List, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.tts_service import tts_service


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "Puck"
    language: Optional[str] = "en-US"
    style: Optional[str] = None
    speed: Optional[float] = 1.0


class VoiceConversationRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = None
    model: Optional[str] = "google/gemini-2.5-flash"
    voice: Optional[str] = "Puck"
    language: Optional[str] = "en-US"


router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.post("")
@router.post("/")
@router.post("/synthesize")
async def synthesize(req: TTSRequest):
    """Process text for TTS via OpenRouter Gemini.

    Since OpenRouter doesn't support native audio output,
    this returns processed text optimized for Web Speech API.

    Returns:
    - text: Processed text for TTS
    - voice: Voice name
    - language: Language code
    - use_web_speech: True (signals frontend to use Web Speech API)
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


@router.post("/voice-response")
async def voice_response(req: VoiceConversationRequest):
    """Generate an AI response optimized for voice output.

    This is the main endpoint for voice conversations.
    Uses OpenRouter Gemini to generate responses formatted for TTS.

    Returns:
    - response: AI response text
    - voice: Voice configuration
    - use_web_speech: True (signals frontend to use Web Speech API)
    """
    try:
        result = await tts_service.generate_voice_response(
            user_message=req.message,
            conversation_history=req.conversation_history,
            model=req.model or "google/gemini-2.5-flash",
            voice=req.voice or "Puck",
            language=req.language or "en-US",
        )
        return {"success": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/voices")
async def list_voices():
    """List available voice configurations."""
    return {
        "success": True,
        "voices": tts_service.get_available_voices(),
        "note": "Voices are configurations for Web Speech API styling",
    }


@router.get("/languages")
async def list_languages():
    """List supported languages."""
    return {
        "success": True,
        "languages": tts_service.get_supported_languages(),
    }
