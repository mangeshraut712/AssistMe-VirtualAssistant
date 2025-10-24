import os
import json
import logging
from typing import TYPE_CHECKING, Any, Dict, Iterator, List, Optional

if TYPE_CHECKING:
    try:
        from redis import Redis as RedisType  # type: ignore[import-not-found]
    except ImportError:  # pragma: no cover
        RedisType = Any  # type: ignore[assignment]
else:
    RedisType = Any

try:
    import redis  # type: ignore[import-not-found]
    HAS_REDIS = True
except ImportError:  # pragma: no cover - optional dependency
    redis = None  # type: ignore[assignment]
    HAS_REDIS = False

try:
    import requests  # type: ignore[import-not-found]
    HAS_REQUESTS = True
except ImportError:  # pragma: no cover - optional dependency
    requests = None  # type: ignore[assignment]
    HAS_REQUESTS = False

class Grok2Client:
    def __init__(self):
        raw_base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self.base_url = raw_base_url.rstrip("/")
        self.chat_endpoint = f"{self.base_url}/chat/completions"
        self.api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.referer = os.getenv("APP_URL", "https://assist-me-virtual-assistant.vercel.app")
        self.title = os.getenv("APP_NAME", "AssistMe Virtual Assistant")

        # Development mode for testing without API limits
        self.dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"

        # Fallback configuration for a future Grok-2 endpoint
        self.grok2_endpoint = os.getenv("GROK2_ENDPOINT")
        self.grok2_api_key = os.getenv("GROK2_API_KEY")

        # Rate limiting configuration - lazy initialization
        self.redis_client: Optional[Any] = None
        self.redis_url = os.getenv("REDIS_URL")

        try:
            self.request_timeout = float(os.getenv("OPENROUTER_TIMEOUT", "60.0"))
        except ValueError:
            self.request_timeout = 60.0

        # ✅ Curated free models from OpenRouter (pricing.prompt == "0")
        # Gemini 2.0 Flash Exp is the default fallback unless overridden
        self.default_models = [
            {"id": "google/gemini-2.0-flash-exp:free", "name": "Google Gemini 2.0 Flash Experimental"},  # 🥇 1M+ tokens
            {"id": "qwen/qwen3-coder:free", "name": "Qwen3 Coder 480B A35B"},                            # 🥈 262K tokens
            {"id": "tngtech/deepseek-r1t2-chimera:free", "name": "DeepSeek R1T2 Chimera"},               # 🥉 163K tokens
            {"id": "microsoft/mai-ds-r1:free", "name": "Microsoft MAI DS R1"},                           # 🏅 163K tokens
            {"id": "openai/gpt-oss-20b:free", "name": "OpenAI GPT OSS 20B"},                             # 🏅 128K tokens
            {"id": "z-ai/glm-4.5-air:free", "name": "Zhipu GLM 4.5 Air"},                                # 🏅 128K tokens
            {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Meta Llama 3.3 70B Instruct"},     # 🏅 131K tokens
            {"id": "nvidia/nemotron-nano-9b-v2:free", "name": "NVIDIA Nemotron Nano 9B V2"},             # 🏅 131K tokens
            {"id": "mistralai/mistral-nemo:free", "name": "Mistral Nemo"},                               # 🏅 128K tokens
            {"id": "moonshotai/kimi-dev-72b:free", "name": "MoonshotAI Kimi Dev 72B"},                   # 🏅 128K tokens
        ]

        configured_default = os.getenv("OPENROUTER_DEFAULT_MODEL", "").strip()
        self.default_model = configured_default or self.default_models[0]["id"]

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

        if not HAS_REQUESTS or requests is None:
            logging.error("Python 'requests' package is required for OpenRouter calls.")
            return {
                "error": "Server is missing the 'requests' dependency. Please reinstall backend requirements.",
                "tokens": 0,
            }

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

    def _normalise_error(self, response, model_name: Optional[str] = None) -> Dict[str, Any]:
        try:
            data = response.json()
        except ValueError:  # pragma: no cover - non-JSON error
            data = {}

        error_payload = data.get("error")
        metadata = {}
        if isinstance(error_payload, dict):
            metadata = error_payload.get("metadata") or {}

        title = data.get("title") or (error_payload or {}).get("title")
        message = (
            data.get("message")
            or (error_payload or {}).get("message")
            or (error_payload or {}).get("error")
            or response.text
        )
        buy_credits_url = data.get("buyCreditsUrl")

        if response.status_code == 402 or (title and "Paid Model" in title):
            friendly = (
                "This OpenRouter model requires credits. "
                "Please choose one of the free models or top up credits."
            )
            return {
                "error": friendly,
                "detail": message,
                "buyCreditsUrl": buy_credits_url,
                "requires_credits": True,
                "model": model_name,
            }

        return {
            "error": message or f"OpenRouter error {response.status_code}",
            "status_code": response.status_code,
            "model": model_name,
            "provider": metadata.get("provider_name"),
            "detail": metadata.get("raw") or metadata.get("detail"),
            "metadata": metadata or None,
        }

    def generate_response(self, messages, model=None, temperature=0.7, max_tokens=1024):
        def _candidate_models(requested: Optional[str]) -> List[str]:
            if requested:
                return [requested]

            priority: List[str] = []
            primary = self.default_model or (self.default_models[0]["id"] if self.default_models else None)
            if primary:
                priority.append(primary)

            for entry in self.default_models:
                mid = entry.get("id")
                if mid and mid not in priority:
                    priority.append(mid)
            return priority

        def _call_model(target_model: str) -> Dict[str, Any]:
            payload = self._build_payload(messages, target_model, temperature, max_tokens)

            try:
                response = requests.post(
                    self.chat_endpoint,
                    json=payload,
                    headers=self._headers(),
                    timeout=self.request_timeout,
                )
                if response.status_code >= 400:
                    return self._normalise_error(response, target_model)
                data = response.json()
                choice = (data.get("choices") or [{}])[0]
                message = choice.get("message", {}) or {}
                text = message.get("content", "").strip()
                if not text:
                    text = "I wasn't able to produce a response. Please try again."
                tokens = data.get("usage", {}).get("total_tokens", len(text.split()))
                return {"response": text, "tokens": tokens, "model": target_model}
            except requests.exceptions.HTTPError as exc:
                logging.error("OpenRouter returned HTTP error %s: %s", exc.response.status_code, exc.response.text)
                return {"error": f"OpenRouter HTTP error {exc.response.status_code}: {exc.response.text}", "model": target_model}
            except requests.exceptions.RequestException as exc:
                logging.error("Network error while calling OpenRouter: %s", exc)
                return {"error": f"Network error while calling OpenRouter: {exc}", "model": target_model}
            except Exception as exc:
                logging.exception("Unexpected error calling OpenRouter")
                return {"error": f"Unexpected error calling OpenRouter: {exc}", "model": target_model}

        # In development mode, return mock responses to avoid API limits
        primary_model = model or self.default_model or (self.default_models[0]["id"] if self.default_models else None)
        if self.dev_mode:
            fallback_model = primary_model
            if not fallback_model and self.default_models:
                fallback_model = self.default_models[0]["id"]
            fallback_model = fallback_model or "mock-openrouter-model"
            return self._get_mock_response(messages, fallback_model)

        readiness_error = self._ensure_live_ready()
        if readiness_error:
            return readiness_error

        attempts = _candidate_models(model)
        last_error: Dict[str, Any] = {"error": "No OpenRouter models available."}
        for candidate in attempts:
            result = _call_model(candidate)
            if "response" in result:
                if primary_model and candidate != primary_model:
                    result.setdefault("notice", f"Primary model '{primary_model}' unavailable. Responded with '{candidate}'.")
                return result
            last_error = result
        return last_error

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

        model_name = model or self.default_model
        if not model_name and self.default_models:
            model_name = self.default_models[0]["id"]
        if not model_name:
            yield {"error": "No OpenRouter models configured.", "done": True}
            return

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
                self.chat_endpoint,
                json=payload,
                headers=headers,
                stream=True,
                timeout=self.request_timeout,
            ) as response:
                if response.status_code >= 400:
                    yield {**self._normalise_error(response, model_name), "done": True}
                    return
                accumulated: List[str] = []
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
