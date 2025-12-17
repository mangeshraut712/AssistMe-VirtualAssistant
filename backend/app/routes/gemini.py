"""
Gemini Live API Routes 2.0

Provides secure access to Gemini API for frontend WebSocket connections.
Includes status checking and configuration endpoints.

Endpoints:
- GET /api/gemini/key - Get API key for WebSocket connection
- GET /api/gemini/status - Check if Gemini Live is available
- GET /api/gemini/config - Get recommended configuration
"""

import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/gemini", tags=["gemini"])


# Available Gemini voices for Live API
GEMINI_VOICES = {
    "neutral": ["Puck", "Zephyr", "Aoede"],
    "warm": ["Kore", "Leda", "Autonoe"],
    "authoritative": ["Charon", "Fenrir", "Orus"],
    "playful": ["Io", "Echo", "Calliope"],
    "emotional": ["Erato", "Melpomene", "Thalia"],
}

# Recommended model for Live API - December 2025 Preview (tested and working)
# This model works on v1beta Live API with Audio response modality
LIVE_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"


@router.get("/key")
async def get_gemini_key():
    """Get Gemini API key for Live API WebSocket connection.

    Security Notes:
    - In production, consider short-lived tokens
    - Or use server-side WebSocket proxy
    - Or implement OAuth2 with Vertex AI

    Returns:
        JSON with apiKey field
    """
    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Add GOOGLE_API_KEY to environment."
        )

    return {"apiKey": api_key}


@router.get("/status")
async def gemini_status():
    """Check if Gemini Live API is available and configured.

    Returns:
        JSON with availability status and feature list
    """
    api_key = os.getenv("GOOGLE_API_KEY")

    return {
        "available": bool(api_key),
        "model": LIVE_MODEL,
        "endpoint": "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent",
        "features": [
            "Real-time bidirectional audio",
            "Text generation",
            "Multi-turn conversation",
            "Voice activity detection",
            "Barge-in (interruption) support",
            "30 neural voices",
        ],
        "requirements": {
            "GOOGLE_API_KEY": "configured" if api_key else "missing",
        }}


@router.get("/config")
async def get_gemini_config():
    """Get recommended Gemini Live configuration.

    Returns configuration suitable for voice conversations.
    """
    return {
        "model": LIVE_MODEL,
        "generationConfig": {
            "responseModalities": ["AUDIO", "TEXT"],
            "maxOutputTokens": 200,
            "temperature": 0.8,
        },
        "speechConfig": {
            "voiceConfig": {
                "prebuiltVoiceConfig": {
                    "voiceName": "Puck"  # Default voice
                }
            }
        },
        "inputAudio": {
            "sampleRate": 16000,
            "channels": 1,
            "format": "pcm16",
        },
        "outputAudio": {
            "sampleRate": 24000,
            "channels": 1,
            "format": "pcm16",
        },
    }


@router.get("/voices")
async def list_gemini_voices():
    """List available Gemini Live voices organized by style.

    Returns:
        JSON with voices grouped by category
    """
    return {
        "success": True,
        "voices": GEMINI_VOICES,
        "default": "Puck",
        "recommended_for": {
            "assistant": "Puck",
            "professional": "Charon",
            "empathetic": "Kore",
            "energetic": "Io",
        }
    }
