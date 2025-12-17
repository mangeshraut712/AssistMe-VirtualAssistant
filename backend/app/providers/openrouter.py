"""OpenRouter provider implementation."""

import asyncio
import json
import logging
import os
from typing import AsyncIterator, Dict, List, Union

import httpx

from .base import BaseProvider

logger = logging.getLogger(__name__)


class OpenRouterProvider(BaseProvider):
    """OpenRouter AI provider."""

    # Gemini Live Native Audio Models - ONLY these for voice mode
    VOICE_MODELS = [
        # Primary: Gemini 2.5 Flash Native Audio (Dec 2025 release via BYOK)
        "gemini-2.5-flash-native-audio-preview-12-2025",
        # Fallbacks in order of preference
        "google/gemini-2.5-flash",
        "google/gemini-2.5-flash-lite",
        "google/gemini-2.5-flash-lite-preview-09-2025",
        "google/gemini-2.0-flash-001:free",
        "google/gemini-2.0-flash-lite-001",
    ]

    DEFAULT_MODELS = [
        # Gemini 2.5 Flash Native Audio (December 2025 - via Google AI Studio BYOK)
        {"id": "gemini-2.5-flash-native-audio-preview-12-2025", "name": "Gemini 2.5 Flash Native Audio (Dec 2025)", "priority": 0, "voice_optimized": True, "native_audio": True},
        {"id": "google/gemini-2.5-flash", "name": "Google: Gemini 2.5 Flash", "priority": 0, "voice_optimized": True, "native_audio": True},
        {"id": "google/gemini-2.5-flash-lite", "name": "Google: Gemini 2.5 Flash Lite", "priority": 0, "voice_optimized": True},
        {"id": "google/gemini-2.5-flash-lite-preview-09-2025", "name": "Google: Gemini 2.5 Flash Lite Preview", "priority": 0, "voice_optimized": True},
        {"id": "google/gemini-2.0-flash-001:free", "name": "Google: Gemini 2.0 Flash (Free)", "priority": 1, "voice_optimized": True},
        {"id": "google/gemini-2.0-flash-lite-001", "name": "Google: Gemini 2.0 Flash Lite", "priority": 1, "voice_optimized": True},
        
        # Free Models (Working and Verified)
        {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Meta Llama 3.3 70B Instruct (Free)", "priority": 2},
        {"id": "nvidia/nemotron-nano-9b-v2:free", "name": "NVIDIA Nemotron Nano 9B V2 (Free)", "priority": 2},
        {"id": "google/gemma-3-27b-it:free", "name": "Google: Gemma 3 27B IT (Free)", "priority": 2},
        {"id": "nvidia/nemotron-nano-12b-v2-vl:free", "name": "NVIDIA: Nemotron Nano 12B V2 VL (Free)", "priority": 2},
        {"id": "meituan/longcat-flash-chat:free", "name": "Meituan: LongCat Flash Chat (Free)", "priority": 2},
        {"id": "alibaba/tongyi-deepresearch-30b-a3b:free", "name": "Alibaba: Tongyi DeepResearch 30B A3B (Free)", "priority": 2},
        
        # Premium Models (Fallback)
        {"id": "google/gemini-2.5-pro", "name": "Google: Gemini 2.5 Pro", "priority": 3},
        {"id": "x-ai/grok-code-fast-1", "name": "xAI: Grok Code Fast 1", "priority": 3},
        {"id": "x-ai/grok-4.1-fast", "name": "xAI: Grok 4.1 Fast", "priority": 3},
        {"id": "perplexity/sonar", "name": "Perplexity: Sonar", "priority": 3},
        {"id": "anthropic/claude-3-haiku", "name": "Anthropic Claude 3 Haiku", "priority": 3},
        {"id": "openai/gpt-4o-mini", "name": "OpenAI GPT-4o Mini", "priority": 3},
    ]

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.base_url = os.getenv(
            "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
        ).rstrip("/")
        self.default_model = os.getenv(
            "OPENROUTER_DEFAULT_MODEL", "meta-llama/llama-3.3-70b-instruct:free"
        )
        self.site_url = os.getenv(
            "APP_URL", "https://assist-me-virtual-assistant.vercel.app"
        )
        self.app_name = os.getenv("APP_NAME", "AssistMe Virtual Assistant")
        self.dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.app_name,
        }

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        stream: bool = False,
    ) -> Union[Dict, AsyncIterator]:
        """Generate chat completion using OpenRouter with fallback mechanism."""
        if self.dev_mode:
            return self._mock_response(messages, model, stream)

        if not self.api_key:
            raise ValueError("OpenRouter API key not configured")

        # Get models sorted by priority (lower number = higher priority)
        available_models = sorted(self.DEFAULT_MODELS, key=lambda x: x.get("priority", 99))

        # Try the requested model first, then fallbacks
        models_to_try = []

        # Add requested model if specified
        if model:
            models_to_try.append(model)

        # STRICT VOICE MODEL ISOLATION
        # If the requested model is one of our designated VOICE_MODELS, we MUST NOT fallback
        # to generic text models like Llama as they lack native audio/voice capabilities.
        is_voice_request = model in self.VOICE_MODELS or model == "gemini-2.5-flash-native-audio-preview-12-2025" or model.startswith("google/gemini-2.5")
        
        if is_voice_request:
            # Only add other VOICE_MODELS as fallbacks
            for voice_model in self.VOICE_MODELS:
                if voice_model not in models_to_try:
                    models_to_try.append(voice_model)
        else:
            # Standard fallback behavior for text chat
            for fallback_model in available_models:
                if fallback_model["id"] not in [m if isinstance(m, str) else m for m in models_to_try]:
                    models_to_try.append(fallback_model["id"])

        last_error = None

        url = f"{self.base_url}/chat/completions"
        if stream:
            payload = {
                "model": models_to_try[0] if models_to_try else model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
            }
            return self._stream_with_fallback(url, payload, models_to_try)

        for attempt_model in models_to_try:
            try:
                logger.info(f"Trying model: {attempt_model}")
                payload = {
                    "model": attempt_model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": False,
                }

                result = await self._unary_response(url, payload)
                # If successful, record usage and return
                # from .services.rate_limit_service import rate_limit_service
                # await rate_limit_service.record_request(attempt_model, result.get("tokens", 0))
                return result

            except Exception as e:
                error_msg = str(e)
                logger.warning(f"Model {attempt_model} failed: {error_msg}")
                last_error = error_msg

                # Continue to next model on error (including rate limits)
                continue

        # If we get here, all models failed
        raise Exception(f"All models failed. Last error: {last_error}")

    async def _post_with_retry(self, url: str, payload: Dict) -> httpx.Response:
        """POST with small retry window for transient 429/5xx."""
        backoff = [0.5, 1.5]
        for attempt, delay in enumerate([0] + backoff):
            if delay:
                await asyncio.sleep(delay)
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url, json=payload, headers=self._headers(), timeout=60.0
                )
                if response.status_code in (429, 500, 502, 503, 504) and attempt < len(backoff):
                    retry_after = response.headers.get("retry-after")
                    if retry_after:
                        try:
                            await asyncio.sleep(float(retry_after))
                        except Exception:
                            await asyncio.sleep(delay)
                    continue
                return response
        return response

    async def _unary_response(self, url: str, payload: Dict) -> Dict:
        response = await self._post_with_retry(url, payload)

        if response.status_code >= 400:
            try:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", response.text)
            except Exception:
                error_msg = response.text
            raise Exception(f"OpenRouter API Error {response.status_code}: {error_msg}")

        data = response.json()
        choice = data["choices"][0]
        return {
            "response": choice["message"]["content"],
            "tokens": data.get("usage", {}).get("total_tokens", 0),
            "model": data.get("model", payload["model"]),
        }

    async def _stream_response(self, url: str, payload: Dict) -> AsyncIterator[Dict]:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", url, json=payload, headers=self._headers(), timeout=60.0
            ) as response:
                if response.status_code >= 400:
                    content = await response.aread()
                    try:
                        error_data = json.loads(content)
                        error_msg = error_data.get("error", {}).get(
                            "message", content.decode()
                        )
                    except Exception:
                        error_msg = content.decode()
                    yield {
                        "error": f"OpenRouter API Error {response.status_code}: {error_msg}"
                    }
                    return

                async for line in response.aiter_lines():
                    if not line or line.startswith(":"):
                        continue

                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break

                        try:
                            chunk = json.loads(data)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content")
                            if content:
                                yield {"content": content}
                        except json.JSONDecodeError:
                            continue

    async def _stream_with_fallback(
        self, url: str, payload: Dict, models_to_try: List[str]
    ) -> AsyncIterator[Dict]:
        """Stream with model fallback.

        This avoids surfacing transient transport/protocol errors (e.g. connection reset)
        as hard failures when a different model can serve the request.
        """

        last_error = None

        for attempt_model in models_to_try or [payload.get("model")]:
            if not attempt_model:
                continue

            attempt_payload = dict(payload)
            attempt_payload["model"] = attempt_model
            received_content = False

            try:
                logger.info(f"Trying model (stream): {attempt_model}")
                async for chunk in self._stream_response(url, attempt_payload):
                    if isinstance(chunk, dict) and "content" in chunk:
                        received_content = True
                        yield chunk
                        continue

                    if isinstance(chunk, dict) and "error" in chunk:
                        if received_content:
                            yield chunk
                            return
                        last_error = str(chunk.get("error"))
                        break

                    yield chunk

                if received_content:
                    return

            except Exception as exc:
                if received_content:
                    yield {"error": str(exc)}
                    return
                last_error = str(exc)
                continue

        yield {"error": last_error or "All models failed"}

    def _mock_response(
        self, messages: List[Dict], model: str, stream: bool
    ) -> Union[Dict, AsyncIterator]:
        last_msg = messages[-1]["content"]
        response_text = f"[MOCK] Response to: {last_msg[:50]}... (Model: {model})"

        if stream:

            async def generator():
                words = response_text.split()
                for word in words:
                    yield {"content": word + " "}

            return generator()
        else:
            return {
                "response": response_text,
                "tokens": len(response_text.split()),
                "model": model or "mock-model",
            }

    async def list_models(self) -> List[Dict]:
        """List OpenRouter models."""
        return self.DEFAULT_MODELS

    def get_voice_models_only(self) -> List[str]:
        """Get ONLY the Gemini audio models for voice mode.
        
        These are the ONLY models that should be used for voice conversations:
        - gemini-2.5-flash-native-audio-preview-12-2025 (Primary)
        - google/gemini-2.5-flash
        - google/gemini-2.5-flash-lite
        - google/gemini-2.5-flash-lite-preview-09-2025
        - google/gemini-2.0-flash-001:free
        - google/gemini-2.0-flash-lite-001
        """
        return self.VOICE_MODELS.copy()

    def get_voice_optimized_model(self, prefer_free: bool = False) -> str:
        """Get the best model for voice chat from VOICE_MODELS list.
        
        Tries models in order:
        1. gemini-2.5-flash-native-audio-preview-12-2025 (BYOK)
        2. google/gemini-2.5-flash
        3. google/gemini-2.5-flash-lite
        4. google/gemini-2.5-flash-lite-preview-09-2025
        5. google/gemini-2.0-flash-001:free
        6. google/gemini-2.0-flash-lite-001
        """
        if prefer_free:
            # Return first free model
            for model in self.VOICE_MODELS:
                if model.endswith(":free"):
                    return model
            return "google/gemini-2.0-flash-001:free"
        
        # Return first available (primary is gemini-2.5-flash-native-audio)
        return self.VOICE_MODELS[0] if self.VOICE_MODELS else "google/gemini-2.0-flash-001:free"

    def get_native_audio_model(self) -> str:
        """Get the model with native audio TTS support.
        
        Primary: gemini-2.5-flash-native-audio-preview-12-2025 (Dec 2025 GA)
        Features:
        - 30 HD voices across 24 languages
        - Emotional intelligence (affective dialogue)
        - Context-aware pacing
        - Live speech translation (70+ languages)
        """
        return "gemini-2.5-flash-native-audio-preview-12-2025"

    async def chat_completion_stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ):
        """Generate streaming chat completion (required by BaseProvider)."""
        from .base import StreamChunk, FinishReason
        
        if self.dev_mode:
            # Mock streaming for dev mode
            async def mock_stream():
                response_text = f"[MOCK] Streaming response to: {messages[-1]['content'][:50]}..."
                words = response_text.split()
                for i, word in enumerate(words):
                    yield StreamChunk(
                        id=f"test-{i}",
                        delta=word + " ",
                        model=model or "mock-model",
                        finish_reason=FinishReason.STOP if i == len(words) - 1 else None
                    )
            return mock_stream()
        
        if not self.api_key:
            raise ValueError("OpenRouter API key not configured")
        
        # Use existing streaming implementation
        url = f"{self.base_url}/chat/completions"
        
        # Get models to try with fallback
        models_to_try = []
        if model:
            models_to_try.append(model)
        
        # Add fallbacks
        available_models = sorted(self.DEFAULT_MODELS, key=lambda x: x.get("priority", 99))
        for fallback_model in available_models:
            if fallback_model["id"] not in models_to_try:
                models_to_try.append(fallback_model["id"])
        
        payload = {
            "model": models_to_try[0] if models_to_try else (model or self.default_model),
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        
        # Convert old stream format to new StreamChunk format
        async def stream_generator():
            chunk_id = 0
            async for chunk in self._stream_with_fallback(url, payload, models_to_try):
                if isinstance(chunk, dict):
                    if "content" in chunk:
                        chunk_id += 1
                        yield StreamChunk(
                            id=f"chatcmpl-{chunk_id}",
                            delta=chunk["content"],
                            model=models_to_try[0],
                            finish_reason=None
                        )
                    elif "error" in chunk:
                        # Last chunk with error
                        yield StreamChunk(
                            id=f"chatcmpl-{chunk_id}-error",
                            delta="",
                            model=models_to_try[0],
                            finish_reason=FinishReason.ERROR
                        )
                        break
            
            # Final chunk
            yield StreamChunk(
                id=f"chatcmpl-{chunk_id}-final",
                delta="",
                model=models_to_try[0],
                finish_reason=FinishReason.STOP
            )
        
        return stream_generator()

    def is_available(self) -> bool:
        """Check if OpenRouter is configured."""
        return bool(self.api_key) or self.dev_mode
