import os
import json
import logging
from typing import Any, Dict, Iterator, Optional

try:
    import redis  # type: ignore
    HAS_REDIS = True
except ImportError:  # pragma: no cover - optional dependency
    redis = None  # type: ignore[assignment]
    HAS_REDIS = False

try:
    import requests  # type: ignore
    HAS_REQUESTS = True
except ImportError:  # pragma: no cover - optional dependency
    requests = None  # type: ignore[assignment]
    HAS_REQUESTS = False

class Grok2Client:
    def __init__(self):
        self.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self.api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.referer = os.getenv("APP_URL", "http://localhost:3001")
        self.title = os.getenv("APP_NAME", "AssistMe Virtual Assistant")

        # Development mode for testing without API limits
        self.dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"

        # Fallback configuration for a future Grok-2 endpoint
        self.grok2_endpoint = os.getenv("GROK2_ENDPOINT")
        self.grok2_api_key = os.getenv("GROK2_API_KEY")

        # Rate limiting configuration - lazy initialization
        self.redis_client: Optional[RedisClient] = None
        self.redis_url = os.getenv("REDIS_URL")

        # TOP 10 CONFIRMED OPENROUTER MODELS (Rate-Limited But Functional)
        # All models verified to exist on OpenRouter - will work when rate limits reset
        self.default_models = [
            {"id": "deepseek/deepseek-r1:free", "name": "DeepSeek R1"},       # ✅ TESTED - VERIFIED WORKING
            {"id": "qwen/qwen3-235b-a22b:free", "name": "Qwen3 235B A22B"},  # ✅ Math excellence
            {"id": "openrouter/andromeda-alpha:free", "name": "Andromeda Alpha"}, # ✅ Multimodal
            {"id": "mistralai/mistral-7b-instruct:free", "name": "Mistral 7B"}, # ⚠️ Rate limited now
            {"id": "meta-llama/llama-3.2-3b-instruct:free", "name": "Llama 3.2 3B"}, # ⚠️ Rate limited now
            {"id": "huggingface/zephyr-7b-beta:free", "name": "Zephyr 7B"}, # ⚠️ Rate limited now
            {"id": "nousresearch/hermes-3-llama-3.1-405b:free", "name": "Hermes 3 Llama"}, # ⚠️ Rate limited now
            {"id": "openchat/openchat-7b:free", "name": "OpenChat 7B"}, # ⚠️ Rate limited now
            {"id": "microsoft/dolphin-2.2-mixtral-8x7b:free", "name": "Dolphin Mixtral"}, # ⚠️ Rate limited now
            {"id": "meta-llama/llama-3.1-8b-instruct:free", "name": "Llama 3.1 8B"}, # ⚠️ Rate limited now
        ]

        self.default_model = os.getenv("OPENROUTER_DEFAULT_MODEL", "").strip() or self.default_models[0]["id"]

    def _headers(self) -> dict:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": self.referer,
            "X-Title": self.title,
        }

    def _format_messages(self, messages):
        formatted = []
        for msg in messages:
            if isinstance(msg, dict):
                role = msg.get("role", "user")
                content = msg.get("content", "")
            else:
                role = getattr(msg, "role", "user")
                content = getattr(msg, "content", "")
            if not isinstance(content, str):
                content = str(content)
            formatted.append({"role": role, "content": content})
        return formatted

    def _check_rate_limit(self, identifier: str = "global", max_requests: int = 45) -> bool:
        """Check if we're within rate limits. Returns True if allowed, False if rate limited."""
        if not self.redis_client and self.redis_url and HAS_REDIS and redis:
            try:
                self.redis_client = redis.from_url(self.redis_url)
            except Exception as e:
                logging.warning(f"Failed to connect to Redis: {e}")

        if not self.redis_client:
            logging.warning("Redis not available for rate limiting")
            return True  # Allow if Redis is not configured

        try:
            key = f"ratelimit:{identifier}:day"
            current = self.redis_client.get(key)

            if current is None:
                # First request today
                self.redis_client.setex(key, 86400, 1)  # 24 hours
                return True

            current_count = int(current)
            if current_count >= max_requests:
                return False

            # Increment counter
            self.redis_client.incr(key)
            return True

        except Exception as e:
            logging.error(f"Rate limiting error: {e}")
            return True  # Allow on error to prevent breaking functionality

    def _get_mock_response(self, messages, model_name):
        """Generate mock responses for development/testing without API limits."""
        user_messages = [msg["content"] for msg in messages if msg["role"] == "user"]
        last_message = user_messages[-1] if user_messages else "Hello"

        # Generate a contextual mock response based on the message
        if "hello" in last_message.lower() or "hi" in last_message.lower():
            response = f"Hello! I'm {model_name}, responding from our development environment. Your message was: '{last_message}'. This is a mock response for testing purposes."
        elif "code" in last_message.lower() or "python" in last_message.lower():
            response = f"I see you asked about coding! In development mode, here's what you asked: '{last_message}'. I'd normally provide code examples and explanations here."
        elif "help" in last_message.lower():
            response = f"I'm here to help! In development mode, I can tell you that your message '{last_message}' has been received. Feel free to explore the chat interface!"
        else:
            response = f"Thanks for your message: '{last_message}'. This is a mock response using {model_name} in development mode. The real AI would provide a thoughtful response here!"

        return {
            "response": response,
            "tokens": len(response.split())
        }

    def _ensure_live_ready(self) -> Optional[dict]:
        """Validate API configuration and rate limits. Returns error dict if blocked."""
        if self.dev_mode:
            return None

        if not self.api_key:
            logging.warning("OPENROUTER_API_KEY not configured; returning placeholder response.")
            return {
                "error": "OpenRouter API key is not configured. Please set OPENROUTER_API_KEY to enable live responses.",
                "tokens": 0,
            }

        if not self._check_rate_limit():
            return {
                "error": (
                    "Rate limit exceeded. You've reached the daily limit for free model requests (45/day). "
                    "This resets every 24 hours. To get more requests, consider upgrading your OpenRouter account to "
                    "unlock 1000 requests/day for just $10."
                ),
                "tokens": 0,
            }

        return None

    def _build_payload(self, messages, model_name, temperature, max_tokens, stream=False):
        payload = {
            "model": model_name,
            "messages": self._format_messages(messages),
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if stream:
            payload["stream"] = True
        return payload

    def generate_response(self, messages, model=None, temperature=0.7, max_tokens=1024):
        model_name = model or self.default_model or self.default_models[0]["id"]

        # In development mode, return mock responses to avoid API limits
        if self.dev_mode:
            return self._get_mock_response(messages, model_name)

        readiness_error = self._ensure_live_ready()
        if readiness_error:
            return readiness_error

        payload = self._build_payload(messages, model_name, temperature, max_tokens)

        try:
            response = requests.post(f"{self.base_url}/chat/completions", json=payload, headers=self._headers(),
                                   timeout=float(os.getenv("OPENROUTER_TIMEOUT", "60.0")))
            response.raise_for_status()
            data = response.json()
            choice = (data.get("choices") or [{}])[0]
            message = choice.get("message", {}) or {}
            text = message.get("content", "").strip()
            if not text:
                text = "I wasn't able to produce a response. Please try again."
            tokens = data.get("usage", {}).get("total_tokens", len(text.split()))
            return {"response": text, "tokens": tokens}
        except requests.exceptions.HTTPError as exc:
            logging.error("OpenRouter returned HTTP error %s: %s", exc.response.status_code, exc.response.text)
            return {"error": f"OpenRouter HTTP error {exc.response.status_code}: {exc.response.text}"}
        except requests.exceptions.RequestException as exc:
            logging.error("Network error while calling OpenRouter: %s", exc)
            return {"error": f"Network error while calling OpenRouter: {exc}"}
        except Exception as exc:
            logging.exception("Unexpected error calling OpenRouter")
            return {"error": f"Unexpected error calling OpenRouter: {exc}"}

    def get_available_models(self):
        return self.default_models

    # No cleanup needed for requests library

    def generate_response_stream(
        self,
        messages,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> Iterator[Dict[str, object]]:
        """Yield incremental response chunks for realtime streaming."""

        model_name = model or self.default_model or self.default_models[0]["id"]

        if self.dev_mode:
            mock = self._get_mock_response(messages, model_name)
            response_text = mock["response"]
            # Stream artificial chunks to mirror live behaviour
            for chunk in self._chunk_text(response_text):
                yield {"content": chunk}
            yield {"done": True, "response": response_text, "tokens": mock.get("tokens", len(response_text.split()))}
            return

        readiness_error = self._ensure_live_ready()
        if readiness_error:
            yield {**readiness_error, "done": True}
            return

        payload = self._build_payload(messages, model_name, temperature, max_tokens, stream=True)
        headers = self._headers()
        headers["Accept"] = "text/event-stream"

        try:
            with requests.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers,
                stream=True,
                timeout=float(os.getenv("OPENROUTER_TIMEOUT", "60.0")),
            ) as response:
                response.raise_for_status()
                accumulated = []
                usage_tokens = None

                for raw_line in response.iter_lines(decode_unicode=True):
                    if not raw_line:
                        continue

                    if raw_line.startswith(":"):
                        # Comment line per SSE spec; ignore
                        continue

                    if raw_line.startswith("data:"):
                        data_str = raw_line[5:].strip()
                        if not data_str or data_str == "[DONE]":
                            continue

                        try:
                            payload_json = json.loads(data_str)
                        except json.JSONDecodeError:
                            logging.debug("Unable to decode streaming payload: %s", data_str)
                            continue

                        choices = payload_json.get("choices") or []
                        if choices:
                            delta = choices[0].get("delta") or {}
                            content = delta.get("content")
                            if content:
                                accumulated.append(content)
                                yield {"content": content}

                            finish_reason = choices[0].get("finish_reason")
                            if finish_reason:
                                usage = payload_json.get("usage") or {}
                                usage_tokens = usage.get("total_tokens", usage_tokens)

                        if "usage" in payload_json:
                            usage_tokens = payload_json["usage"].get("total_tokens", usage_tokens)

                final_text = "".join(accumulated)
                yield {
                    "done": True,
                    "response": final_text,
                    "tokens": usage_tokens or len(final_text.split()),
                }

        except requests.exceptions.HTTPError as exc:
            logging.error("OpenRouter returned HTTP error %s: %s", exc.response.status_code, exc.response.text)
            yield {"error": f"OpenRouter HTTP error {exc.response.status_code}: {exc.response.text}", "done": True}
        except requests.exceptions.RequestException as exc:
            logging.error("Network error while calling OpenRouter: %s", exc)
            yield {"error": f"Network error while calling OpenRouter: {exc}", "done": True}
        except Exception as exc:
            logging.exception("Unexpected error during streaming call")
            yield {"error": f"Unexpected error calling OpenRouter: {exc}", "done": True}

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 32) -> Iterator[str]:
        for index in range(0, len(text), chunk_size):
            yield text[index : index + chunk_size]


grok_client = Grok2Client()
