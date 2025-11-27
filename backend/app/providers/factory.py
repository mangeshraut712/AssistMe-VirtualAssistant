"""Provider factory."""

import logging

from .base import BaseProvider
from .openrouter import OpenRouterProvider

logger = logging.getLogger(__name__)


def get_provider() -> BaseProvider:
    """Return the single supported provider (OpenRouter)."""
    provider = OpenRouterProvider()
    if not provider.is_available():
        logger.error("OpenRouter provider is not configured. Please set OPENROUTER_API_KEY.")
    return provider
