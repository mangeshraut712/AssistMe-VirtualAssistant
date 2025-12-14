"""
AssistMe Backend Application

A modern FastAPI backend with:
- AI Provider abstraction (OpenRouter, etc.)
- Pydantic v2 schemas with strict validation
- Structured logging
- Rate limiting
- RAG/Vector search
- Voice/Speech processing
- Multi-language support (22+ Indian languages)

Version: 3.0.0
"""

__version__ = "3.0.0"
__author__ = "AssistMe Team"

from .config import settings, get_settings
from .logging_config import logger, setup_logging

__all__ = [
    "__version__",
    "settings",
    "get_settings",
    "logger",
    "setup_logging",
]
