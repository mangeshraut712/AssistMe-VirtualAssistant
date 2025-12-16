"""
Gemini Live API Routes

Provides secure access to Gemini API key for frontend WebSocket connections.
"""

import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/gemini", tags=["gemini"])


@router.get("/key")
async def get_gemini_key():
    """Get Gemini API key for Live API WebSocket connection.
    
    Note: In production, consider more secure methods like:
    - Short-lived tokens
    - Server-side WebSocket proxy
    - OAuth2 with Vertex AI
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
    """Check if Gemini Live API is available."""
    api_key = os.getenv("GOOGLE_API_KEY")
    
    return {
        "available": bool(api_key),
        "model": "gemini-2.0-flash-exp",
        "features": [
            "Real-time audio",
            "Text generation",
            "Multi-turn conversation"
        ]
    }
