"""
Base AI Provider Interface (2025 Edition)

Features:
- Async-first design
- Retry with exponential backoff (tenacity)
- Type hints with generics
- Streaming support
- Error handling patterns
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import (
    Any,
    AsyncIterator,
    Generic,
    TypeVar,
)

try:
    from tenacity import (
        retry,
        stop_after_attempt,
        wait_exponential,
        retry_if_exception_type,
    )
    TENACITY_AVAILABLE = True
except ImportError:
    TENACITY_AVAILABLE = False

from ..logging_config import logger, log_ai_request


# ==============================================================================
# Types
# ==============================================================================

T = TypeVar("T")


class FinishReason(str, Enum):
    """Reasons for completion finishing."""
    STOP = "stop"
    LENGTH = "length"
    CONTENT_FILTER = "content_filter"
    TOOL_CALLS = "tool_calls"
    ERROR = "error"


@dataclass
class Message:
    """Chat message."""
    role: str
    content: str
    name: str | None = None
    tool_calls: list[dict] | None = None


@dataclass
class Usage:
    """Token usage statistics."""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    @property
    def estimated_cost_usd(self) -> float:
        """Rough cost estimate."""
        # Average $0.001 per 1K tokens
        return self.total_tokens * 0.000001


@dataclass
class CompletionChoice:
    """Single completion choice."""
    index: int
    message: Message
    finish_reason: FinishReason | None = None


@dataclass
class ChatCompletion:
    """Chat completion response."""
    id: str
    model: str
    choices: list[CompletionChoice]
    usage: Usage | None = None
    created: datetime = field(default_factory=datetime.utcnow)

    @property
    def content(self) -> str:
        """Get content from first choice."""
        if self.choices:
            return self.choices[0].message.content
        return ""


@dataclass
class StreamChunk:
    """Streaming response chunk."""
    id: str
    delta: str
    model: str
    finish_reason: FinishReason | None = None


class ProviderError(Exception):
    """Base exception for provider errors."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        provider: str | None = None,
        retryable: bool = False,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.provider = provider
        self.retryable = retryable


class RateLimitError(ProviderError):
    """Rate limit exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int | None = None):
        super().__init__(message, status_code=429, retryable=True)
        self.retry_after = retry_after


class AuthenticationError(ProviderError):
    """Authentication failed."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401, retryable=False)


class ModelNotFoundError(ProviderError):
    """Model not found or unavailable."""

    def __init__(self, model: str):
        super().__init__(f"Model not found: {model}", status_code=404, retryable=False)
        self.model = model


# ==============================================================================
# Retry Decorator (with tenacity fallback)
# ==============================================================================

def with_retry(
    max_attempts: int = 3,
    min_wait: float = 1,
    max_wait: float = 10,
):
    """Decorator for retry logic with exponential backoff."""
    if TENACITY_AVAILABLE:
        return retry(
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential(multiplier=1, min=min_wait, max=max_wait),
            retry=retry_if_exception_type((RateLimitError, ConnectionError, TimeoutError)),
            before_sleep=lambda retry_state: logger.warning(
                "Retrying request",
                attempt=retry_state.attempt_number,
                wait=retry_state.next_action.sleep,
            ),
        )
    else:
        # Simple fallback without tenacity
        def decorator(func):
            import asyncio
            from functools import wraps

            @wraps(func)
            async def wrapper(*args, **kwargs):
                last_exception = None
                for attempt in range(max_attempts):
                    try:
                        return await func(*args, **kwargs)
                    except (RateLimitError, ConnectionError, TimeoutError) as e:
                        last_exception = e
                        if attempt < max_attempts - 1:
                            wait_time = min(min_wait * (2 ** attempt), max_wait)
                            logger.warning(f"Retry attempt {attempt + 1}, waiting {wait_time}s")
                            await asyncio.sleep(wait_time)
                raise last_exception

            return wrapper
        return decorator


# ==============================================================================
# Base Provider
# ==============================================================================

class BaseProvider(ABC, Generic[T]):
    """Abstract base class for AI providers.

    Subclasses must implement:
    - chat_completion: Non-streaming completion
    - chat_completion_stream: Streaming completion
    - list_models: List available models
    - is_available: Check provider availability
    """

    name: str = "base"
    default_model: str = ""

    def __init__(self):
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize provider (override if needed)."""
        self._initialized = True

    async def shutdown(self) -> None:
        """Cleanup provider resources (override if needed)."""
        pass

    @abstractmethod
    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs: Any,
    ) -> ChatCompletion:
        """Generate chat completion (non-streaming).

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model identifier (uses default if None)
            temperature: Randomness (0-2)
            max_tokens: Maximum output tokens
            **kwargs: Additional provider-specific options

        Returns:
            ChatCompletion response

        Raises:
            ProviderError: On API errors
            RateLimitError: On rate limiting
            AuthenticationError: On auth failure
        """
        ...

    @abstractmethod
    async def chat_completion_stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs: Any,
    ) -> AsyncIterator[StreamChunk]:
        """Generate streaming chat completion.

        Args:
            messages: List of message dicts
            model: Model identifier
            temperature: Randomness (0-2)
            max_tokens: Maximum output tokens
            **kwargs: Additional options

        Yields:
            StreamChunk for each response delta

        Raises:
            ProviderError: On API errors
        """
        ...

    @abstractmethod
    async def list_models(self) -> list[dict[str, Any]]:
        """List available models.

        Returns:
            List of model info dicts with at least 'id' and 'name'
        """
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is configured and available.

        Returns:
            True if provider can accept requests
        """
        ...

    # Convenience method that auto-selects streaming based on parameter
    async def complete(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> ChatCompletion | AsyncIterator[StreamChunk]:
        """Unified completion method.

        Args:
            messages: Chat messages
            model: Model to use
            stream: Whether to stream response
            **kwargs: Additional options

        Returns:
            ChatCompletion for non-streaming, AsyncIterator for streaming
        """
        if stream:
            return self.chat_completion_stream(messages, model, **kwargs)
        return await self.chat_completion(messages, model, **kwargs)

    def _log_completion(
        self,
        model: str,
        tokens: int,
        duration_ms: float,
        stream: bool = False,
        error: str | None = None,
    ) -> None:
        """Log a completion request."""
        log_ai_request(
            model=model,
            tokens=tokens,
            duration_ms=duration_ms,
            stream=stream,
            provider=self.name,
            error=error,
        )
