import os
import json
import logging
from typing import TYPE_CHECKING, Any, ClassVar, Dict, Iterator, List, Optional

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
    __slots__ = ("config", "redis_client", "session")
    DEFAULT_MODELS: ClassVar[List[Dict[str, str]]] = [
        # Ordered by speed/performance for optimal user experience
        {"id": "google/gemini-2.0-flash-exp:free", "name": "Google Gemini 2.0 Flash Experimental"},  # Fastest, 1M context
        {"id": "nvidia/nemotron-nano-9b-v2:free", "name": "NVIDIA Nemotron Nano 9B V2"},             # Very fast, 131K
        {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Meta Llama 3.3 70B Instruct"},     # Accurate, 131K
        {"id": "mistralai/mistral-nemo:free", "name": "Mistral Nemo"},                               # Fast, 128K
        {"id": "qwen/qwen3-coder:free", "name": "Qwen3 Coder 480B A35B"},                            # Best for code, 262K
        {"id": "z-ai/glm-4.5-air:free", "name": "Zhipu GLM 4.5 Air"},                                # Multilingual, 128K
        {"id": "openai/gpt-oss-20b:free", "name": "OpenAI GPT OSS 20B"},                             # Good quality, 128K
        {"id": "tngtech/deepseek-r1t2-chimera:free", "name": "DeepSeek R1T2 Chimera"},               # Reasoning, 163K
        {"id": "microsoft/mai-ds-r1:free", "name": "Microsoft MAI DS R1"},                           # Research, 163K
        {"id": "moonshotai/kimi-dev-72b:free", "name": "MoonshotAI Kimi Dev 72B"},                   # Long context, 128K
    ]

    def __init__(self):
        self.config = self._load_config()
        self.redis_client: Optional[Any] = None
        # Connection pooling for faster requests
        if HAS_REQUESTS and requests:
            self.session = requests.Session()
            adapter = requests.adapters.HTTPAdapter(
                pool_connections=10,
                pool_maxsize=20,
                max_retries=2
            )
            self.session.mount('http://', adapter)
            self.session.mount('https://', adapter)
        else:
            self.session = None

    def _load_config(self) -> Dict[str, Any]:
        """Load config values at instantiation to minimize instance attributes."""
        base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
        configured_default = os.getenv("OPENROUTER_DEFAULT_MODEL", "").strip()
        if not configured_default and type(self).DEFAULT_MODELS:
            configured_default = type(self).DEFAULT_MODELS[0]["id"]
        return {
            "base_url": base_url,
            "chat_endpoint": f"{base_url}/chat/completions",
            "api_key": os.getenv("OPENROUTER_API_KEY", "").strip(),
            "referrer": os.getenv("APP_URL", os.getenv("VERCEL_URL", "https://assist-me-virtual-assistant.vercel.app")),
            "title": os.getenv("APP_NAME", "AssistMe Virtual Assistant"),
            "dev_mode": os.getenv("DEV_MODE", "false").lower() == "true",
            "redis_url": os.getenv("REDIS_URL"),
            "timeout": self._get_timeout(),
            "default_model": configured_default,
        }

    @staticmethod
    def _get_timeout():
        """Get request timeout with error handling."""
        try:
            return float(os.getenv("OPENROUTER_TIMEOUT", "60.0"))
        except ValueError:
            return 60.0

    def _headers(self) -> dict:
        config = self.config
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config['api_key']}",
            "HTTP-Referer": config["referrer"],
            "X-Title": config["title"],
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
        redis_url = self.config.get("redis_url")
        
        # If no Redis URL configured, skip rate limiting
        if not redis_url:
            return True
            
        if not self.redis_client and HAS_REDIS and redis:
            try:
                self.redis_client = redis.from_url(redis_url)
            except Exception as e:
                logging.debug("Redis not available for rate limiting: %s", e)
                return True  # Allow if Redis connection fails

        if not self.redis_client:
            return True  # Allow if Redis is not configured

        try:
            key = "ratelimit:%s:day" % identifier
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
            logging.debug("Rate limiting check failed: %s", e)
            # Reset redis_client on connection error
            self.redis_client = None
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
        config = self.config
        if config["dev_mode"]:
            return None

        if not HAS_REQUESTS or requests is None:
            logging.error("Python 'requests' package is required for OpenRouter calls.")
            return {
                "error": "Server is missing the 'requests' dependency. Please reinstall backend requirements.",
                "tokens": 0,
            }

        if not config["api_key"]:
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

    def _build_payload(self, messages, model_name, **kwargs):
        """Build payload with flexible parameters to avoid too many positional args."""
        formatted_messages = self._format_messages(messages)
        
        # Add optimized system message for speed and accuracy
        if not any(msg.get("role") == "system" for msg in formatted_messages):
            system_msg = {
                "role": "system",
                "content": "You are a fast, accurate AI assistant. Provide concise, direct answers. Be specific and factual. Avoid unnecessary elaboration unless asked."
            }
            formatted_messages.insert(0, system_msg)
        
        payload = {
            "model": model_name,
            "messages": formatted_messages,
            "temperature": kwargs.get("temperature", 0.3),  # Lower for more focused responses
            "max_tokens": kwargs.get("max_tokens", 1024),  # Optimized for speed
        }
        if kwargs.get("stream", False):
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

        # Handle rate limiting (429)
        if response.status_code == 429:
            return {
                "error": f"Rate limited on {model_name}. Trying alternative model...",
                "status_code": 429,
                "model": model_name,
                "should_retry": True,  # Signal to try another model
                "rate_limited": True,
            }

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

    def _get_candidates(self, requested: Optional[str]) -> List[str]:
        """Get list of models to try, prioritizing the requested one."""
        priority: List[str] = []
        models = type(self).DEFAULT_MODELS
        
        # If specific model requested, try it first
        if requested:
            priority.append(requested)
        
        # Add default model if not already in list
        primary = self.config.get("default_model") or (models[0]["id"] if models else None)
        if primary and primary not in priority:
            priority.append(primary)

        # Add all other models as fallbacks
        for entry in models:
            mid = entry.get("id")
            if mid and mid not in priority:
                priority.append(mid)
        
        return priority

    def _call_model_api(self, endpoint: str, payload: dict, target_model: str) -> Dict[str, Any]:
        """Make actual API call to OpenRouter."""
        try:
            # Use session for connection pooling if available
            http_client = self.session if self.session else requests
            response = http_client.post(
                endpoint,
                json=payload,
                headers=self._headers(),
                timeout=self.config["timeout"],
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

    def generate_response(self, messages, model=None, temperature=0.7, max_tokens=1024):
        # In development mode, return mock responses
        config = self.config
        primary_model = model or config.get("default_model")
        if not primary_model and type(self).DEFAULT_MODELS:
            primary_model = type(self).DEFAULT_MODELS[0]["id"]
        if config["dev_mode"]:
            fallback_model = primary_model
            if not fallback_model and type(self).DEFAULT_MODELS:
                fallback_model = type(self).DEFAULT_MODELS[0]["id"]
            fallback_model = fallback_model or "mock-openrouter-model"
            return self._get_mock_response(messages, fallback_model)

        readiness_error = self._ensure_live_ready()
        if readiness_error:
            return readiness_error

        attempts = self._get_candidates(model)
        last_error: Dict[str, Any] = {"error": "No OpenRouter models available."}

        for candidate in attempts:
            payload = self._build_payload(messages, candidate, temperature=temperature, max_tokens=max_tokens)
            result = self._call_model_api(config["chat_endpoint"], payload, candidate)

            if "response" in result:
                if primary_model and candidate != primary_model:
                    result.setdefault("notice", f"Primary model '{primary_model}' unavailable. Responded with '{candidate}'.")
                return result
            last_error = result

        return last_error

    def get_available_models(self):
        return type(self).DEFAULT_MODELS

    # No cleanup needed for requests library

    def get_default_model(self) -> Optional[str]:
        return self.config.get("default_model")

    def _stream_chunks(self, response_text: str) -> Iterator[Dict[str, object]]:
        """Stream mock response chunks in development mode."""
        for chunk in self._chunk_text(response_text):
            yield {"content": chunk}
        yield {
            "done": True,
            "response": response_text,
            "tokens": len(response_text.split())
        }

    def _setup_streaming_request(self, messages, model_name, temperature, max_tokens):
        """Prepare streaming request and return necessary data."""
        payload = self._build_payload(messages, model_name, temperature=temperature, max_tokens=max_tokens, stream=True)
        headers = self._headers()
        headers["Accept"] = "text/event-stream"
        headers["Connection"] = "keep-alive"  # Keep connection alive for faster streaming

        # Use session for connection pooling if available
        http_client = self.session if self.session else requests
        response = http_client.post(
            self.config["chat_endpoint"],
            json=payload,
            headers=headers,
            stream=True,
            timeout=self.config["timeout"],
        )
        return response

    def _process_streaming_chunk(self, raw_line: str, accumulated: List[str], usage_tokens) -> tuple:
        """Process a single streaming chunk and return updated state."""
        if not raw_line:
            return accumulated, usage_tokens

        if raw_line.startswith(":"):
            return accumulated, usage_tokens  # SSE comment, ignore

        if raw_line.startswith("data:"):
            data_str = raw_line[5:].strip()
            if not data_str or data_str == "[DONE]":
                return accumulated, usage_tokens

            try:
                payload_json = json.loads(data_str)
            except json.JSONDecodeError:
                logging.debug("Unable to decode streaming payload: %s", data_str)
                return accumulated, usage_tokens

            choices = payload_json.get("choices") or []
            if choices:
                delta = choices[0].get("delta") or {}
                content = delta.get("content")
                if content:
                    accumulated.append(content)

                # Check for usage data
                if choices[0].get("finish_reason"):
                    usage = payload_json.get("usage") or {}
                    usage_tokens = usage.get("total_tokens", usage_tokens)

            # Check for usage data at payload level
            if "usage" in payload_json:
                usage_tokens = payload_json["usage"].get("total_tokens", usage_tokens)

        return accumulated, usage_tokens

    def generate_response_stream(
        self,
        messages,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> Iterator[Dict[str, object]]:
        """Yield incremental response chunks for realtime streaming."""
        models = type(self).DEFAULT_MODELS
        primary_model = model or self.config.get("default_model")
        if not primary_model and models:
            primary_model = models[0]["id"]
        if not primary_model:
            yield {"error": "No OpenRouter models configured.", "done": True}
            return

        # Handle development mode
        if self.config["dev_mode"]:
            fallback_model = primary_model or (models[0]["id"] if models else "mock-openrouter-model")
            mock = self._get_mock_response(messages, fallback_model)
            for chunk in self._stream_chunks(mock["response"]):
                yield chunk
            return

        # Check readiness
        readiness_error = self._ensure_live_ready()
        if readiness_error:
            yield {**readiness_error, "done": True}
            return

        attempts = self._get_candidates(model)
        last_error: Optional[Dict[str, object]] = None
        rate_limited_models = []

        logging.info(f"Attempting models in order: {attempts}")

        for candidate in attempts:
            # Skip if this model was already rate limited
            if candidate in rate_limited_models:
                logging.info(f"Skipping {candidate} - already rate limited")
                continue
            
            logging.info(f"Trying model: {candidate}")
                
            try:
                response = self._setup_streaming_request(messages, candidate, temperature, max_tokens)
            except requests.exceptions.HTTPError as exc:
                logging.error("OpenRouter returned HTTP error %s: %s", exc.response.status_code, exc.response.text)
                last_error = {"error": f"OpenRouter HTTP error {exc.response.status_code}: {exc.response.text}", "done": True}
                continue
            except requests.exceptions.RequestException as exc:
                logging.error("Network error while calling OpenRouter: %s", exc)
                last_error = {"error": f"Network error while calling OpenRouter: {exc}", "done": True}
                continue
            except Exception as exc:
                logging.exception("Unexpected error during streaming call")
                last_error = {"error": f"Unexpected error calling OpenRouter: {exc}", "done": True}
                continue

            if response.status_code >= 400:
                error_info = self._normalise_error(response, candidate)
                response.close()
                
                # If rate limited, try next model
                if error_info.get("rate_limited"):
                    rate_limited_models.append(candidate)
                    logging.info(f"⚠️ Model {candidate} is rate limited upstream, trying next model...")
                    # Don't set last_error for rate limits, keep trying
                    continue
                    
                last_error = {**error_info, "done": True}
                logging.error(f"Model {candidate} failed with error: {error_info.get('error')}")
                continue

            accumulated: List[str] = []
            usage_tokens = None

            try:
                for raw_line in response.iter_lines(decode_unicode=True):
                    processed_data = self._process_streaming_chunk(raw_line, accumulated, usage_tokens)
                    accumulated, usage_tokens = processed_data

                    # Check if we should yield content (if accumulated changed)
                    if len(accumulated) > 0 and accumulated[-1] and raw_line.startswith("data:"):
                        try:
                            chunk_data = json.loads(raw_line[5:].strip())
                            choices = chunk_data.get("choices") or []
                            if choices:
                                delta = choices[0].get("delta") or {}
                                content = delta.get("content")
                                if content:
                                    yield {"content": content}
                        except (json.JSONDecodeError, IndexError):
                            continue
            finally:
                response.close()

            # Yield final result
            final_text = "".join(accumulated)
            payload: Dict[str, object] = {
                "done": True,
                "response": final_text,
                "tokens": usage_tokens or len(final_text.split()),
                "model": candidate,
            }
            if primary_model and candidate != primary_model:
                # Get model name for better UX
                model_name = next((m["name"] for m in type(self).DEFAULT_MODELS if m["id"] == candidate), candidate)
                payload["notice"] = (
                    f"✓ Switched to {model_name} (primary model rate limited)"
                )
                logging.info(f"✓ Successfully used fallback model: {candidate}")

            yield payload
            return

        yield last_error or {"error": "All OpenRouter model attempts failed.", "done": True}

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 32) -> Iterator[str]:
        for index in range(0, len(text), chunk_size):
            yield text[index : index + chunk_size]


grok_client = Grok2Client()
