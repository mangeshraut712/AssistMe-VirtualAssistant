"""
Gemini TTS API Routes

Direct integration with Gemini 2.5 Flash TTS.
Requires GOOGLE_API_KEY environment variable.
"""

from typing import Optional, List, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.tts_service import tts_service


class TTSRequest(BaseModel):
    """Text-to-speech request."""
    text: str
    voice: Optional[str] = "Puck"
    style: Optional[str] = None


class VoiceConversationRequest(BaseModel):
    """Voice conversation request."""
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = None
    voice: Optional[str] = "Puck"
    language: Optional[str] = "en-US"


router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.post("")
@router.post("/")
@router.post("/synthesize")
async def synthesize(req: TTSRequest):
    """Convert text to speech using Gemini 2.5 Flash TTS.
    
    Returns WAV audio as base64.
    
    Voices: Puck, Kore, Charon, Fenrir, Aoede, Zephyr, etc.
    """
    try:
        result = await tts_service.text_to_speech(
            text=req.text,
            voice=req.voice or "Puck",
            style=req.style,
        )
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice-response")
async def voice_response(req: VoiceConversationRequest):
    """Generate AI response and convert to speech.
    
    For voice conversations - generates concise,
    natural responses optimized for speech.
    """
    try:
        result = await tts_service.generate_conversation_response(
            user_message=req.message,
            conversation_history=req.conversation_history,
            voice=req.voice or "Puck",
            language=req.language or "en-US",
        )
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices")
async def list_voices():
    """List available Gemini TTS voices."""
    return {
        "success": True,
        "voices": tts_service.get_voices(),
        "total": len(tts_service.VOICES),
    }


@router.get("/languages")
async def list_languages():
    """List supported languages."""
    return {
        "success": True,
        "languages": tts_service.get_languages(),
    }
