"""
AI Provider Abstraction Layer

Supports multiple AI providers through a unified interface:
- OpenRouter (default) - Access to 100+ models
- Direct API providers (OpenAI, Anthropic, etc.) - future

Usage:
    from app.providers import get_provider

    provider = get_provider()
    response = await provider.chat_completion(messages, model="gpt-4")
"""

from .base import (
    BaseProvider,
    ChatCompletion,
    CompletionChoice,
    FinishReason,
    Message,
    ProviderError,
    RateLimitError,
    AuthenticationError,
    ModelNotFoundError,
    StreamChunk,
    Usage,
    with_retry,
)
from .factory import get_provider
from .openrouter import OpenRouterProvider

__all__ = [
    # Base classes
    "BaseProvider",
    # Data classes
    "ChatCompletion",
    "CompletionChoice",
    "FinishReason",
    "Message",
    "StreamChunk",
    "Usage",
    # Exceptions
    "ProviderError",
    "RateLimitError",
    "AuthenticationError",
    "ModelNotFoundError",
    # Utilities
    "with_retry",
    # Providers
    "OpenRouterProvider",
    "get_provider",
]
