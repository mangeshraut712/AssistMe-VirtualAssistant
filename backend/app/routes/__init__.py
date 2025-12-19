"""
═══════════════════════════════════════════════════════════════════════════════
API ROUTES
═══════════════════════════════════════════════════════════════════════════════

All API route handlers for the AssistMe backend.

Each router handles a specific domain:
- auth: User authentication
- gemini: Gemini AI integration
- health: Health checks
- image: Image generation
- knowledge: Grokipedia/Knowledge base
- multimodal: Multimodal AI
- speech: Speech-to-text
- speedtest: Speed testing
- tts: Text-to-speech
"""

from .auth import router as auth_router
from .gemini import router as gemini_router
from .health import router as health_router
from .image import router as image_router
from .knowledge import router as knowledge_router
from .multimodal import router as multimodal_router
from .speech import router as speech_router
from .speedtest import router as speedtest_router
from .tts import router as tts_router

__all__ = [
    "auth_router",
    "gemini_router",
    "health_router",
    "image_router",
    "knowledge_router",
    "multimodal_router",
    "speech_router",
    "speedtest_router",
    "tts_router",
]
