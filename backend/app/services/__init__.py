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

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .embedding_service import EmbeddingService
    from .whisper_service import WhisperService

from .cache_service import cache_service
from .file_service import file_service
from .image_service import image_service
from .rate_limit_service import rate_limit_service
from .tts_service import tts_service
from .voice_service import voice_service
from .web_search_service import web_search_service

# Conditional imports for ML-heavy services
embedding_service: EmbeddingService | None
try:
    from .embedding_service import embedding_service as _embedding_service
except ImportError:
    embedding_service = None
else:
    embedding_service = _embedding_service

whisper_service: WhisperService | None
try:
    from .whisper_service import whisper_service as _whisper_service
except ImportError:
    whisper_service = None
else:
    whisper_service = _whisper_service


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
