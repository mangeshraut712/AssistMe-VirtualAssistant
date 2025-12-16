"""
Gemini Voice AI Routes - Production-Grade Pipeline

Features (inspired by Chatterbox Turbo):
- Emotion-tagged speech with auto-detection
- Paralinguistic tags: [laugh], [chuckle], [sigh], etc.
- 30 HD voices, 24 languages
- Low latency optimization

Endpoints:
- POST /api/tts - Text to speech with emotion
- POST /api/tts/voice-response - Full voice conversation pipeline
- GET /api/tts/emotions - List supported emotions
- GET /api/tts/voices - List voices
- GET /api/tts/languages - List languages
"""

from typing import Optional, List, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.tts_service import tts_service, EmotionDetector


class TTSRequest(BaseModel):
    """Text-to-speech request with emotion support."""
    text: str = Field(..., min_length=1, max_length=5000)
    voice: Optional[str] = "Puck"
    style: Optional[str] = None
    auto_emotion: Optional[bool] = True  # Auto-detect emotion


class VoiceConversationRequest(BaseModel):
    """Voice conversation request."""
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_history: Optional[List[Dict[str, str]]] = None
    voice: Optional[str] = "Puck"
    language: Optional[str] = "en-US"
    stt_confidence: Optional[float] = Field(1.0, ge=0.0, le=1.0)


router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.post("")
@router.post("/")
@router.post("/synthesize")
async def synthesize(req: TTSRequest):
    """Convert text to speech using Gemini 2.5 Flash TTS.
    
    Returns WAV audio as base64 (24kHz, 16-bit PCM).
    
    30 voices available: Puck, Kore, Charon, Fenrir, Aoede, Zephyr, etc.
    
    Style hints: "cheerfully", "calmly", "seriously", etc.
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
    """Complete voice AI pipeline: Understand → Generate → Speak.
    
    Pipeline stages:
    1. Check STT confidence (asks for clarification if low)
    2. Check for emergency keywords (uses fixed scripts)
    3. Generate LLM response (optimized for voice)
    4. Normalize response for TTS
    5. Convert to speech audio
    
    Returns both text response and audio.
    """
    try:
        result = await tts_service.generate_voice_response(
            user_message=req.message,
            conversation_history=req.conversation_history,
            voice=req.voice or "Puck",
            language=req.language or "en-US",
            stt_confidence=req.stt_confidence or 1.0,
        )
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/emotions")
async def list_emotions():
    """List supported emotion tags for expressive TTS.
    
    Inspired by Chatterbox Turbo's paralinguistic tags.
    
    Paralinguistic tags (use in text):
    - [laugh] - Light laugh
    - [chuckle] - Soft chuckle
    - [sigh] - Gentle sigh
    - [whisper] - Soft whisper
    - [excited] - Excited tone
    - [serious] - Serious tone
    - [pause] - Thoughtful pause
    
    Auto-detected emotions:
    - happy, sad, angry, surprised
    - calm, empathetic, enthusiastic, thoughtful
    """
    return {
        "success": True,
        "paralinguistic_tags": list(EmotionDetector.PARALINGUISTIC_TAGS.keys()),
        "auto_detected_emotions": list(EmotionDetector.EMOTION_STYLES.keys()),
        "emotion_keywords": EmotionDetector.EMOTION_KEYWORDS,
        "note": "Use [tags] in text or let auto_emotion detect mood"
    }


@router.get("/voices")
async def list_voices():
    """List available Gemini TTS voices.
    
    Returns voices grouped by style:
    - neutral: Puck, Zephyr, Aoede
    - warm: Kore, Leda, Autonoe
    - authoritative: Charon, Fenrir, Orus
    - playful: Io, Echo, Calliope
    - emotional: Erato, Melpomene, Thalia
    """
    voices = tts_service.get_voices()
    return {
        "success": True,
        **voices,
    }


@router.get("/languages")
async def list_languages():
    """List supported languages (24 total including 6 Indian languages)."""
    lang_data = tts_service.get_languages()
    return {
        "success": True,
        **lang_data,
    }


@router.get("/languages/indian")
async def list_indian_languages():
    """List Indian languages supported by Gemini TTS.
    
    Supported:
    - Hindi (hi-IN) - हिंदी
    - Bengali (bn-BD) - বাংলা
    - Marathi (mr-IN) - मराठी
    - Tamil (ta-IN) - தமிழ்
    - Telugu (te-IN) - తెలుగు
    - English India (en-IN)
    """
    return {
        "success": True,
        "languages": tts_service.get_indian_languages(),
        "count": len(tts_service.INDIAN_LANGUAGES),
        "note": "Gemini TTS supports 6 Indian languages with native pronunciation"
    }


@router.get("/health")
async def health_check():
    """Check if TTS service is configured."""
    has_key = bool(tts_service.api_key)
    return {
        "success": True,
        "configured": has_key,
        "model": tts_service.TTS_MODEL,
        "llm_model": tts_service.LLM_MODEL,
        "voices": len(tts_service.ALL_VOICES),
        "languages": len(tts_service.LANGUAGES),
        "indian_languages": len(tts_service.INDIAN_LANGUAGES),
    }
