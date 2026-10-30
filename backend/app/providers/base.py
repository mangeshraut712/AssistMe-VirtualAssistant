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
    AsyncIterator,
    Generic,
    Literal,
    Mapping,
    NotRequired,
    Required,
    Sequence,
    TypedDict,
    TypeVar,
    overload,
)

try:
    from tenacity import (
        retry,
        stop_after_attempt,
        wait_exponential,
        retry_if_exception_type,
        RetryCallState,
    )
    TENACITY_AVAILABLE = True
except ImportError:
    TENACITY_AVAILABLE = False

from ..logging_config import logger, log_ai_request


# ==============================================================================
# Types
# ==============================================================================

T = TypeVar("T")


ProviderMessage = Mapping[str, object]


class ProviderResponse(TypedDict):
    """Normalized non-streaming response returned by the provider boundary."""

    response: str
    tokens: int
    model: str
    error: NotRequired[str]


class ProviderChunk(TypedDict, total=False):
    """One normalized streaming response chunk."""

    content: str
    error: str


class ProviderModel(TypedDict, total=False):
    """Public model metadata supported by a provider."""

    id: Required[str]
    name: Required[str]
    priority: int
    voice_optimized: bool
    native_audio: bool


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

def _log_retry(retry_state: RetryCallState) -> None:
    """Log a retry without assuming tenacity has scheduled an action."""
    next_action = retry_state.next_action
    logger.warning(
        "Retrying request",
        attempt=retry_state.attempt_number,
        wait=next_action.sleep if next_action is not None else None,
    )


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
            before_sleep=_log_retry,
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

    @overload
    async def chat_completion(
        self,
        messages: Sequence[ProviderMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: Literal[False] = False,
    ) -> ProviderResponse: ...

    @overload
    async def chat_completion(
        self,
        messages: Sequence[ProviderMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: Literal[True] = True,
    ) -> AsyncIterator[ProviderChunk]: ...

    @abstractmethod
    async def chat_completion(
        self,
        messages: Sequence[ProviderMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
    ) -> ProviderResponse | AsyncIterator[ProviderChunk]:
        """Generate either a normalized completion or stream.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model identifier (uses default if None)
            temperature: Randomness (0-2)
            max_tokens: Maximum output tokens

        Returns:
            A normalized response for ``stream=False`` or chunk iterator for
            ``stream=True``.

        Raises:
            ProviderError: On API errors
            RateLimitError: On rate limiting
            AuthenticationError: On auth failure
        """
        ...

    @abstractmethod
    async def chat_completion_stream(
        self,
        messages: Sequence[ProviderMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[StreamChunk]:
        """Generate streaming chat completion.

        Args:
            messages: List of message dicts
            model: Model identifier
            temperature: Randomness (0-2)
            max_tokens: Maximum output tokens

        Yields:
            StreamChunk for each response delta

        Raises:
            ProviderError: On API errors
        """
        ...

    @abstractmethod
    async def list_models(self) -> list[ProviderModel]:
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

    # Convenience method that auto-selects streaming based on parameter.
    @overload
    async def complete(
        self,
        messages: Sequence[ProviderMessage],
        model: str | None = None,
        stream: Literal[False] = False,
    ) -> ProviderResponse: ...

    @overload
    async def complete(
        self,
        messages: Sequence[ProviderMessage],
        model: str | None = None,
        stream: Literal[True] = True,
    ) -> AsyncIterator[StreamChunk]: ...

    async def complete(
        self,
        messages: Sequence[ProviderMessage],
        model: str | None = None,
        stream: bool = False,
    ) -> ProviderResponse | AsyncIterator[StreamChunk]:
        """Unified completion method.

        Args:
            messages: Chat messages
            model: Model to use
            stream: Whether to stream response

        Returns:
            A normalized response for non-streaming, an async iterator for streaming
        """
        if stream:
            return await self.chat_completion_stream(
                messages=messages, model=model
            )
        return await self.chat_completion(
            messages=messages, model=model, stream=False
        )

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
