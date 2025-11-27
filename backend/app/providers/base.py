"""Base provider interface."""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, List, Union


class BaseProvider(ABC):
    """Base class for AI providers."""

    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        stream: bool = False,
    ) -> Union[Dict, AsyncIterator]:
        """Generate chat completion.

        Args:
            messages: List of message dicts (role, content)
            model: Model identifier
            temperature: Randomness (0-1)
            max_tokens: Max output tokens
            stream: Whether to stream response

        Returns:
            Dict for non-stream, AsyncIterator for stream
        """
        pass

    @abstractmethod
    async def list_models(self) -> List[Dict]:
        """List available models."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is configured and available."""
        pass
