"""
═══════════════════════════════════════════════════════════════════════════════
SERVICES PACKAGE
═══════════════════════════════════════════════════════════════════════════════

Business logic services for the AssistMe backend.

Services handle:
- External API integrations
- Data processing
- Caching
- Rate limiting
- File handling

Note: Some services (embedding, whisper) require heavy ML dependencies
and are imported conditionally for CI compatibility.
"""

from .cache_service import cache_service
from .file_service import file_service
from .image_service import image_service
from .rate_limit_service import rate_limit_service
from .tts_service import tts_service
from .voice_service import voice_service
from .web_search_service import web_search_service

# Conditional imports for ML-heavy services
try:
    from .embedding_service import embedding_service
except ImportError:
    embedding_service = None

try:
    from .whisper_service import whisper_service
except ImportError:
    whisper_service = None


__all__ = [
    # Core services
    "cache_service",
    "file_service",
    "image_service",
    "rate_limit_service",
    "tts_service",
    "voice_service",
    "web_search_service",
    # ML services (conditionally available)
    "embedding_service",
    "whisper_service",
]
