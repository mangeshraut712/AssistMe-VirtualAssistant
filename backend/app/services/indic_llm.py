"""
Indic LLM Service
Integration with AI4Bharat's Indic models and other Indian language LLMs
"""

import logging
from typing import Dict, List, Optional

from ..providers import get_provider

logger = logging.getLogger(__name__)


class IndicLLMService:
    """Service for Indian Language LLM interactions"""

    def __init__(self):
        self.provider = None
        try:
            self.provider = get_provider()
        except Exception:
            logger.warning("Provider not available for IndicLLMService")

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        language: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        stream: bool = False,
    ):
        """
        Generate response in specific Indian language

        Args:
            messages: Chat history
            language: Target language code (e.g., 'hi', 'ta')
            model: Optional specific model to use
            temperature: Creativity
            max_tokens: Max length
            stream: Whether to stream response
        """
        if not self.provider:
            raise ValueError("AI Provider not initialized")

        # Select best model for Indian languages if not specified
        # Llama 3 and Qwen are generally good at Indic languages
        if not model:
            model = "meta-llama/llama-3.3-70b-instruct:free"

        # Add system prompt for language enforcement if not present
        system_prompt = (
            f"You are a helpful assistant. Please answer in {language} language."
        )

        # Check if system message exists
        has_system = any(m.get("role") == "system" for m in messages)
        if not has_system:
            messages.insert(0, {"role": "system", "content": system_prompt})

        return await self.provider.chat_completion(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=stream,
        )


# Global instance
indic_llm_service = IndicLLMService()
