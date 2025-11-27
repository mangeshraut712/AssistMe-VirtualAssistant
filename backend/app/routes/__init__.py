from .knowledge import router as knowledge_router
from .speech import router as speech_router
from .tts import router as tts_router

__all__ = ["speech_router", "knowledge_router", "tts_router"]
