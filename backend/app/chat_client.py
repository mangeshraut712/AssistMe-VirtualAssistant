import os
import json
import logging
import random
import time
from typing import TYPE_CHECKING, Any, ClassVar, Dict, Iterator, List, Optional

if TYPE_CHECKING:
    try:
        from redis import Redis as RedisType  # type: ignore[import-not-found]
    except ImportError:  # pragma: no cover
        RedisType = Any  # type: ignore[assignment]
else:
    RedisType = Any

# Import Grokipedia for knowledge grounding
try:
    from .rag.engine import get_rag_engine, GrokipediaRAG  # type: ignore[import-not-found]
    HAS_RAG = True
except ImportError:  # pragma: no cover - optional dependency
    get_rag_engine = None
    GrokipediaRAG = None
    HAS_RAG = False

try:
    import redis  # type: ignore[import-not-found]
    HAS_REDIS = True
except ImportError:  # pragma: no cover - optional dependency
    redis = None  # type: ignore[assignment]
    HAS_REDIS = False

try:
    import requests  # type: ignore[import-not-found]
    import requests.adapters  # type: ignore[import-not-found]
    HAS_REQUESTS = True
except ImportError:  # pragma: no cover - optional dependency
    requests = None  # type: ignore[assignment]
    HAS_REQUESTS = False

class Grok2Client:
    __slots__ = ("config", "redis_client", "session", "_models_cache", "_models_cache_time")
    # Fallback models in case API is unavailable
    FALLBACK_MODELS: ClassVar[List[Dict[str, str]]] = [
        {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Meta Llama 3.3 70B Instruct"},
        {"id": "google/gemini-2.0-flash-exp:free", "name": "Google Gemini 2.0 Flash Experimental"},
        {"id": "nvidia/nemotron-nano-9b-v2:free", "name": "NVIDIA Nemotron Nano 9B V2"},
        {"id": "mistralai/mistral-nemo:free", "name": "Mistral Nemo"},
        {"id": "qwen/qwen3-coder:free", "name": "Qwen3 Coder 480B A35B"},
        {"id": "z-ai/glm-4.5-air:free", "name": "Zhipu GLM 4.5 Air"},
        {"id": "openai/gpt-oss-20b:free", "name": "OpenAI GPT OSS 20B"},
        {"id": "tngtech/deepseek-r1t2-chimera:free", "name": "DeepSeek R1T2 Chimera"},
        {"id": "microsoft/mai-ds-r1:free", "name": "Microsoft MAI DS R1"},
        {"id": "moonshotai/kimi-dev-72b:free", "name": "MoonshotAI Kimi Dev 72B"},
    ]

    def __init__(self):
        self.config = self._load_config()
        self.redis_client: Optional[Any] = None
        self._models_cache: Optional[List[Dict[str, str]]] = None
        self._models_cache_time: Optional[float] = None
        # Connection pooling for faster requests
        if HAS_REQUESTS and requests is not None:
            self.session = requests.Session()
            # Type assertion for Pylance since we know requests is available
            assert requests.adapters is not None
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
        # Determine which provider to use - default to openrouter
        provider = os.getenv("AI_PROVIDER", "openrouter").lower()

        if provider == "minimax":
            # MiniMax configuration
            base_url = os.getenv("MINIMAX_BASE_URL", "https://api.minimax.io").rstrip("/")
            configured_default = os.getenv("MINIMAX_DEFAULT_MODEL", "MiniMax-M2").strip()
        else:
            # OpenRouter configuration (default)
            base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
            configured_default = os.getenv("OPENROUTER_DEFAULT_MODEL", "").strip()

        # No hardcoded default - will be determined dynamically
        fallback_env = os.getenv("OPENROUTER_FALLBACK_MODELS", "")
        return {
            "provider": provider,
            "base_url": base_url,
            "models_endpoint": f"{base_url}/models" if provider == "openrouter" else f"{base_url}/v1/models",
            "chat_endpoint": f"{base_url}/chat/completions" if provider == "openrouter" else f"{base_url}/v1/text/chatcompletion_v2",
            "api_key": os.getenv("MINIMAX_API_KEY" if provider == "minimax" else "OPENROUTER_API_KEY", "").strip(),
            "referrer": os.getenv("APP_URL", os.getenv("VERCEL_URL", "https://assist-me-virtual-assistant.vercel.app")),
            "title": os.getenv("APP_NAME", "AssistMe Virtual Assistant"),
            "dev_mode": os.getenv("DEV_MODE", "false").lower() == "true",
            "redis_url": os.getenv("REDIS_URL"),
            "timeout": self._get_timeout(),
            "default_model": configured_default,
            "retry_attempts": self._coerce_int(os.getenv("OPENROUTER_RETRY_ATTEMPTS"), 3),
            "retry_backoff_base": self._coerce_float(os.getenv("OPENROUTER_RETRY_BACKOFF_BASE"), 1.0),
            "retry_backoff_max": self._coerce_float(os.getenv("OPENROUTER_RETRY_BACKOFF_MAX"), 12.0),
            "retry_jitter": self._coerce_float(os.getenv("OPENROUTER_RETRY_JITTER"), 0.25),
            "fallback_models": self._parse_fallback_models(fallback_env),
            "use_grokipedia": os.getenv("GROKIPEDIA_ENABLED", "false").lower() == "true",
            "rag_top_k": self._coerce_int(os.getenv("GROKIPEDIA_TOP_K"), 3),
        }

    def _create_provider_config(self, provider: str) -> Dict[str, Any]:
        """Create a provider-specific config for dynamic provider switching."""
        if provider == "minimax":
            # MiniMax configuration
            base_url = os.getenv("MINIMAX_BASE_URL", "https://api.minimax.io").rstrip("/")
            configured_default = os.getenv("MINIMAX_DEFAULT_MODEL", "minimax/minimax-m2").strip()
            api_key = os.getenv("MINIMAX_API_KEY", "").strip()
        else:
            # OpenRouter configuration (default)
            base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
            configured_default = os.getenv("OPENROUTER_DEFAULT_MODEL", "").strip()
            api_key = os.getenv("OPENROUTER_API_KEY", "").strip()

        # No hardcoded default - will be determined dynamically
        fallback_env = os.getenv("OPENROUTER_FALLBACK_MODELS", "")
        return {
            "provider": provider,
            "base_url": base_url,
            "models_endpoint": f"{base_url}/models" if provider == "openrouter" else f"{base_url}/v1/models",
            "chat_endpoint": f"{base_url}/chat/completions" if provider == "openrouter" else f"{base_url}/v1/text/chatcompletion_v2",
            "api_key": api_key,
            "referrer": os.getenv("APP_URL", os.getenv("VERCEL_URL", "https://assist-me-virtual-assistant.vercel.app")),
            "title": os.getenv("APP_NAME", "AssistMe Virtual Assistant"),
            "dev_mode": os.getenv("DEV_MODE", "false").lower() == "true",
            "redis_url": os.getenv("REDIS_URL"),
            "timeout": self._get_timeout(),
            "default_model": configured_default,
            "retry_attempts": self._coerce_int(os.getenv("OPENROUTER_RETRY_ATTEMPTS"), 3),
            "retry_backoff_base": self._coerce_float(os.getenv("OPENROUTER_RETRY_BACKOFF_BASE"), 1.0),
            "retry_backoff_max": self._coerce_float(os.getenv("OPENROUTER_RETRY_BACKOFF_MAX"), 12.0),
            "retry_jitter": self._coerce_float(os.getenv("OPENROUTER_RETRY_JITTER"), 0.25),
            "fallback_models": self._parse_fallback_models(fallback_env),
            "use_grokipedia": os.getenv("GROKIPEDIA_ENABLED", "false").lower() == "true",
            "rag_top_k": self._coerce_int(os.getenv("GROKIPEDIA_TOP_K"), 3),
        }

    @staticmethod
    def _get_timeout():
        """Get request timeout with error handling."""
        try:
            return float(os.getenv("OPENROUTER_TIMEOUT", "60.0"))
        except ValueError:
            return 60.0

    @staticmethod
    def _coerce_int(raw: Optional[str], default: int) -> int:
        try:
            if raw is None:
                return default
            value = int(raw)
            return max(1, value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _coerce_float(raw: Optional[str], default: float) -> float:
        try:
            if raw is None:
                return default
            return float(raw)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _parse_fallback_models(raw: str) -> List[str]:
        models: List[str] = []
        for entry in raw.split(","):
            candidate = entry.strip()
            if candidate:
                models.append(candidate)
        return models

    @staticmethod
    def _provider_label(provider: Optional[str]) -> str:
        if not provider:
            return "OpenRouter"
        mapping = {
            "openrouter": "OpenRouter",
            "minimax": "MiniMax",
        }
        return mapping.get(provider.lower(), provider.title())

    @staticmethod
    def _infer_provider_from_model_name(model_name: Optional[str]) -> str:
        if not model_name:
            return "openrouter"
        lowered = model_name.lower()
        if lowered.startswith("minimax/"):
            return "minimax"
        return "openrouter"

    def _sleep_with_backoff(self, attempt: int) -> None:
        base = self.config.get("retry_backoff_base", 1.0) or 1.0
        cap = self.config.get("retry_backoff_max", 12.0) or 12.0
        jitter = self.config.get("retry_jitter", 0.25) or 0.0
        delay = min(cap, base * (2 ** attempt))
        # Add a small random jitter to avoid synchronized retries (non-cryptographic usage)
        jitter_offset = random.random() * jitter if jitter > 0 else 0.0
        time.sleep(delay + jitter_offset)

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
            "tokens": len(response.split()),
            "provider": self._provider_label(self.config.get("provider")),
        }

    def _ensure_live_ready(self) -> Optional[dict]:
        """Validate API configuration and rate limits. Returns error dict if blocked."""
        config = self.config
        dev_mode = bool(config.get("dev_mode"))
        api_key_present = bool(config.get("api_key"))

        if dev_mode and not api_key_present:
            return None

        if not HAS_REQUESTS or requests is None:
            logging.error("Python 'requests' package is required for OpenRouter calls.")
            return {
                "error": "Server is missing the 'requests' dependency. Please reinstall backend requirements.",
                "tokens": 0,
            }

        if not api_key_present:
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

        # Add optimized system message for speed and accuracy with Grokipedia context
        if not any(msg.get("role") == "system" for msg in formatted_messages):
            system_msg = {
                "role": "system",
                "content": "You are a helpful AI assistant with access to general knowledge. Answer all user questions to the best of your ability using your training data and knowledge. Be informative, accurate, and helpful for any topic the user asks about, including current events, recipes, general knowledge, and practical advice."
            }
            formatted_messages.insert(0, system_msg)

        # Handle model name for different providers
        if self.config.get("provider") == "minimax" and model_name.startswith("minimax/"):
            # Strip the minimax/ prefix for MiniMax API
            api_model_name = model_name[len("minimax/"):]
        else:
            api_model_name = model_name

        payload = {
            "model": api_model_name,
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

        if response.status_code >= 500 or response.status_code in (408, 409, 425, 502, 503, 504):
            return {
                "error": message or f"Transient OpenRouter error {response.status_code}",
                "status_code": response.status_code,
                "model": model_name,
                "should_retry": True,
                "transient": True,
            }

        if response.status_code == 402 or (title and "Paid Model" in title):
            return {
                "error": f"{model_name or 'Model'} requires credits. Trying alternative model...",
                "status_code": 402,
                "model": model_name,
                "should_retry": True,  # Signal to try another model
                "requires_credits": True,
                "buyCreditsUrl": buy_credits_url,
                "detail": message,
            }

        return {
            "error": message or f"OpenRouter error {response.status_code}",
            "status_code": response.status_code,
            "model": model_name,
            "provider": metadata.get("provider_name"),
            "detail": metadata.get("raw") or metadata.get("detail"),
            "metadata": metadata or None,
        }

    def _fetch_models_from_api(self) -> List[Dict[str, str]]:
        """Fetch available models from OpenRouter API with caching."""
        import time

        # Check cache first (cache for 1 hour)
        cache_duration = 3600  # 1 hour
        current_time = time.time()

        if (self._models_cache is not None and
            self._models_cache_time is not None and
            current_time - self._models_cache_time < cache_duration):
            return self._models_cache

        # Fetch from API
        if not HAS_REQUESTS or requests is None:
            logging.warning("Requests library not available, using fallback models")
            return type(self).FALLBACK_MODELS

        if not self.config["api_key"]:
            logging.warning("No API key configured, using fallback models")
            return type(self).FALLBACK_MODELS

        headers = self._headers()
        timeout_seconds = float(self.config.get("timeout") or 60.0)
        http_client = None
        should_close = False

        try:
            if self.session is not None:
                http_client = self.session
            else:
                # Create a short-lived session when pooling is unavailable
                assert requests is not None  # nosec: B101 - guarded by HAS_REQUESTS check above
                http_client = requests.Session()
                should_close = True

            response = http_client.get(
                self.config["models_endpoint"],
                headers=headers,
                timeout=timeout_seconds,
            )
        except requests.exceptions.RequestException as exc:
            logging.error("Failed to load models from OpenRouter: %s", exc)
            return type(self).FALLBACK_MODELS
        except Exception as exc:  # pragma: no cover - defensive catch
            logging.exception("Unexpected error while fetching models from OpenRouter: %s", exc)
            return type(self).FALLBACK_MODELS
        finally:
            if should_close and http_client is not None:
                http_client.close()

        if response.status_code == 200:
            data = response.json()
            models_data = data.get("data", [])

            # Filter for free models and format them
            available_models = []
            for model in models_data:
                model_id = model.get("id", "")
                # Only include free models (those with :free suffix or no pricing)
                if ":free" in model_id or not any(p in model_id for p in [":paid", ":enterprise"]):
                    available_models.append({
                        "id": model_id,
                        "name": model.get("name", model_id),
                        "context_length": model.get("context_length", 0),
                        "pricing": model.get("pricing", {})
                    })

            # Sort by context length (higher first) then by name
            available_models.sort(key=lambda x: (-x.get("context_length", 0), x.get("name", "")))

            # Cache the result
            self._models_cache = available_models
            self._models_cache_time = current_time

            logging.info(f"Fetched {len(available_models)} models from OpenRouter API")
            return available_models

        logging.warning(f"Failed to fetch models from API: {response.status_code}")
        return type(self).FALLBACK_MODELS

    def _get_candidates(self, requested: Optional[str]) -> List[str]:
        """Get list of models to try, prioritizing the requested one."""
        priority: List[str] = []
        models = self._fetch_models_from_api()

        # If specific model requested, try it first
        if requested:
            priority.append(requested)

        # Add default model if configured and not already in list
        primary = self.config.get("default_model")
        if primary and primary not in priority:
            priority.append(primary)

        # Add configured fallback models
        for fallback in self.config.get("fallback_models", []):
            if fallback and fallback not in priority:
                priority.append(fallback)

        # Add all other models as fallbacks
        for entry in models:
            mid = entry.get("id")
            if mid and mid not in priority:
                priority.append(mid)

        return priority

    def _call_model_api(self, endpoint: str, payload: dict, target_model: str) -> Dict[str, Any]:
        """Make actual API call to OpenRouter."""
        # Type assertion: We know requests is available because this method is only called after _ensure_live_ready
        assert HAS_REQUESTS and requests is not None, "Requests library must be available"
        provider_label = self._provider_label(self._infer_provider_from_model_name(target_model))

        try:
            # Use session for connection pooling if available
            if self.session is not None:
                http_client = self.session
            else:
                http_client = requests  # type: ignore[assignment]
            response = http_client.post(
                endpoint,
                json=payload,
                headers=self._headers(),
                timeout=self.config["timeout"],
            )
            if response.status_code >= 400:
                error_payload = self._normalise_error(response, target_model)
                error_payload.setdefault("provider", provider_label)
                return error_payload

            try:
                data = response.json()
            except (ValueError, json.JSONDecodeError):
                # If JSON parsing fails, return the raw text response
                text = response.text.strip() if response.text else "I wasn't able to produce a response. Please try again."
                logging.debug(f"JSON parsing failed for {target_model}, using raw response: {text[:200]}...")
                return {"response": text, "tokens": len(text.split()), "model": target_model}

            # Handle different response formats for different providers
            if self.config.get("provider") == "minimax":
                # MiniMax response format
                if isinstance(data, dict) and "reply" in data:
                    reply = data.get("reply")
                    if reply is not None:
                        text = str(reply).strip()
                    else:
                        text = "I wasn't able to produce a response. Please try again."
                elif isinstance(data, dict) and "choices" in data:
                    # Fallback to OpenAI-like format
                    choice = (data.get("choices") or [{}])[0]
                    message = choice.get("message", {}) or {}
                    content = message.get("content")
                    if content is not None:
                        text = str(content).strip()
                    else:
                        text = "I wasn't able to produce a response. Please try again."
                else:
                    text = "I wasn't able to produce a response. Please try again."
            else:
                # OpenRouter/OpenAI format
                choice = (data.get("choices") or [{}])[0]
                message = choice.get("message", {}) or {}
                content = message.get("content")
                if content is not None:
                    text = str(content).strip()
                else:
                    text = "I wasn't able to produce a response. Please try again."

            if not text:
                text = "I wasn't able to produce a response. Please try again."

            # Handle token counting for different providers
            if data is not None:
                usage = data.get("usage")
                if usage and isinstance(usage, dict):
                    tokens = usage.get("total_tokens", len(text.split()))
                else:
                    tokens = len(text.split())
            else:
                tokens = len(text.split())

            return {"response": text, "tokens": tokens, "model": target_model, "provider": provider_label}

        except Exception as exc:
            logging.exception("Unexpected error calling OpenRouter")
            return {
                "error": f"Unexpected error calling OpenRouter: {exc}",
                "model": target_model,
                "provider": provider_label,
                "should_retry": True,
            }

    def _call_with_backoff(self, endpoint: str, payload: dict, target_model: str) -> Dict[str, Any]:
        """Call OpenRouter with exponential backoff on retryable errors."""
        attempts = max(1, int(self.config.get("retry_attempts") or 3))
        last_result: Dict[str, Any] = {"error": "Request failed", "model": target_model}

        for attempt in range(attempts):
            result = self._call_model_api(endpoint, payload, target_model)
            if "response" in result:
                return result

            last_result = result
            should_retry = bool(result.get("should_retry"))
            if not should_retry:
                break

            # Stop retrying if we're on the last attempt
            if attempt >= attempts - 1:
                break

            self._sleep_with_backoff(attempt)

        return last_result

    def _open_stream_with_backoff(
        self,
        messages,
        candidate: str,
        temperature: float,
        max_tokens: int,
    ) -> tuple:
        # Type assertion: We know requests is available because _ensure_live_ready would have caught this
        assert HAS_REQUESTS and requests is not None, "Requests library must be available"
        attempts = max(1, int(self.config.get("retry_attempts") or 3))
        last_error: Optional[Dict[str, Any]] = None

        for attempt in range(attempts):
            try:
                response = self._setup_streaming_request(messages, candidate, temperature, max_tokens)
            except requests.exceptions.HTTPError as exc:
                logging.error("OpenRouter streaming HTTP error %s: %s", exc.response.status_code, exc.response.text)
                status_code = exc.response.status_code if exc.response else None
                last_error = {
                    "error": f"OpenRouter streaming HTTP error {status_code}: {exc.response.text if exc.response else exc}",
                    "model": candidate,
                }
                if status_code and status_code >= 500:
                    last_error["should_retry"] = True
            except requests.exceptions.RequestException as exc:
                logging.error("Network error while opening OpenRouter stream: %s", exc)
                last_error = {"error": f"Network error while opening OpenRouter stream: {exc}", "model": candidate, "should_retry": True}
            except Exception as exc:
                logging.exception("Unexpected error opening OpenRouter stream")
                last_error = {"error": f"Unexpected error opening OpenRouter stream: {exc}", "model": candidate, "should_retry": True}
            else:
                if response.status_code < 400:
                    return response, None

                error_info = self._normalise_error(response, candidate)
                response.close()
                last_error = error_info

            should_retry = bool(last_error and last_error.get("should_retry"))
            if attempt >= attempts - 1 or not should_retry:
                break

            self._sleep_with_backoff(attempt)

        if last_error:
            return None, last_error
        return None, {
            "error": "Unable to open OpenRouter stream",
            "model": candidate,
            "provider": self._provider_label(self._infer_provider_from_model_name(candidate)),
        }

    def generate_response(self, messages, model=None, temperature=0.7, max_tokens=1024, use_grokipedia=None):
        """Generate response with optional knowledge grounding from Grokipedia."""
        config = self.config
        
        # Determine whether to use Grokipedia
        if use_grokipedia is None:
            use_grokipedia = config.get("use_grokipedia", True)

        # If Grokipedia is enabled, use the enhanced method
        if use_grokipedia:
            return self.generate_response_with_grokipedia(messages, model, temperature, max_tokens)

        # Otherwise, use direct generation without Grokipedia
        return self._generate_response_direct(messages, model, temperature, max_tokens)

    @staticmethod
    def _should_use_rag_for_query(query: str) -> bool:
        if not query:
            return True
        lowered = query.lower()
        # Culinary / lifestyle keywords that rarely benefit from Grokipedia (engineering-focused)
        culinary_keywords = {
            "recipe",
            "cook",
            "cooking",
            "bake",
            "grill",
            "fry",
            "meal",
            "food",
            "kitchen",
            "ingredient",
            "ingredients",
            "dish",
            "noodle",
            "noodles",
            "chicken",
            "beef",
            "mutton",
            "fish",
            "pasta",
            "soup",
            "salad",
            "dessert",
            "breakfast",
            "lunch",
            "dinner",
            "snack",
            "smoothie",
            "drink",
            "cocktail"
        }
        if any(keyword in lowered for keyword in culinary_keywords):
            return False
        return True

    def get_available_models(self):
        """Get available models, fetching from API if possible."""
        return self._fetch_models_from_api()

    # No cleanup needed for requests library


    def get_default_model(self) -> Optional[str]:
        return self.config.get("default_model")

    def _get_grokipedia_context(self, query: str) -> Dict[str, Any]:
        """Get relevant Grokipedia context for knowledge grounding."""
        if not self.config.get("use_grokipedia") or not HAS_RAG or not get_rag_engine:
            return {"articles_retrieved": 0, "context_blocks": [], "search_metadata": {}}

        try:
            rag_engine = get_rag_engine()
            context = rag_engine.as_context(query, top_k=self.config.get("rag_top_k", 3))

            # Parse the context to extract article information
            context_blocks = []
            if context:
                # Split context by article markers
                articles = context.split("📄 **")
                articles = [art for art in articles if art.strip()]

                for article in articles[1:]:  # Skip the first empty element
                    if "**" in article:
                        title_end = article.find("**")
                        title = article[:title_end].strip()
                        content = article[title_end + 2:].strip()
                        context_blocks.append(f"📄 **{title}**\n{content}")

            return {
                "articles_retrieved": len(context_blocks),
                "context_blocks": context_blocks,
                "query_processed": query,
                "search_metadata": {
                    "total_search_time": 0.001,  # Placeholder
                    "rag_engine_used": True
                }
            }
        except Exception as e:
            logging.debug("Grokipedia context retrieval failed: %s", e)
            return {"articles_retrieved": 0, "context_blocks": [], "search_metadata": {"error": str(e)}}

    def generate_response_with_grokipedia(self, messages, model=None, temperature=0.7, max_tokens=1024):
        """Generate response with knowledge grounding from Grokipedia."""
        # Extract user message for context search
        user_message = ""
        for msg in messages:
            if msg.get("role") == "user":
                user_message = msg.get("content", "")
                break

        if not self._should_use_rag_for_query(user_message):
            logging.debug("Skipping Grokipedia context for query: %s", user_message)
            return self._generate_response_direct(messages, model, temperature, max_tokens)

        # Get Grokipedia context
        grokipedia_context = self._get_grokipedia_context(user_message)

        # Enhance messages with context if available
        enhanced_messages = messages.copy()
        articles_cited = 0

        if grokipedia_context and isinstance(grokipedia_context, dict):
            articles_cited = grokipedia_context.get("articles_retrieved", 0)
            context_blocks = grokipedia_context.get("context_blocks", [])

            if context_blocks and articles_cited > 0:
                context_text = "\n\n".join(context_blocks)
                context_message = {
                    "role": "system",
                    "content": f"You have access to verified knowledge from Grokipedia. Use this information to provide accurate, factual responses:\n\n{context_text}\n\nWhen referencing information from Grokipedia, cite it clearly. If the query doesn't relate to the provided context, you can still use your general knowledge but indicate when you're going beyond the verified facts."
                }
                enhanced_messages.insert(0, context_message)

        # Generate response using enhanced messages, but without Grokipedia to avoid recursion
        result = self._generate_response_direct(
            messages=enhanced_messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )

        # Add knowledge attribution
        if "response" in result:
            result.setdefault(
                "provider",
                self._provider_label(self._infer_provider_from_model_name(result.get("model") or (model or "openrouter")))
            )
            result["grokipedia_used"] = articles_cited > 0
            result["knowledge_sources"] = grokipedia_context
            result["articles_cited"] = articles_cited

        return result

    def _generate_response_direct(self, messages, model=None, temperature=0.7, max_tokens=1024):
        """Direct response generation without Grokipedia processing."""
        config = self.config
        primary_model = model or config.get("default_model")

        # Determine provider based on model prefix
        requested_provider = "openrouter"
        if primary_model and primary_model.startswith("minimax/"):
            requested_provider = "minimax"

        # Create a temporary config for the requested provider if different from current
        if requested_provider != config.get("provider"):
            temp_config = self._create_provider_config(requested_provider)
            # Temporarily update config for this request
            original_config = self.config
            self.config = temp_config
        else:
            temp_config = None
            original_config = None

        try:
            dev_mode = bool(self.config.get("dev_mode"))
            api_key_present = bool(self.config.get("api_key"))

            # In development mode without API keys, return mock responses
            if dev_mode and not api_key_present:
                fallback_model = primary_model or "mock-openrouter-model"
                logging.debug("DEV_MODE enabled without API key; returning mock response for %s", fallback_model)
                result = self._get_mock_response(messages, fallback_model)
                result.setdefault("provider", self._provider_label(requested_provider))
                return result

            if dev_mode and api_key_present:
                logging.debug("DEV_MODE enabled with API key present; proceeding with live %s request.", requested_provider.upper())

            readiness_error = self._ensure_live_ready()
            if readiness_error:
                if isinstance(readiness_error, dict):
                    readiness_error.setdefault("provider", self._provider_label(requested_provider))
                return readiness_error

            attempts = self._get_candidates(model)
            last_error: Dict[str, Any] = {"error": f"No {requested_provider.upper()} models available."}

            for candidate in attempts:
                payload = self._build_payload(messages, candidate, temperature=temperature, max_tokens=max_tokens)
                result = self._call_with_backoff(self.config["chat_endpoint"], payload, candidate)

                if "response" in result:
                    provider_id = self._infer_provider_from_model_name(candidate)
                    result.setdefault("provider", self._provider_label(provider_id))
                    result.setdefault("model", candidate)
                    if primary_model and candidate != primary_model:
                        result.setdefault("notice", f"Primary model '{primary_model}' unavailable. Responded with '{candidate}'.")
                    return result
                last_error = result

            if isinstance(last_error, dict):
                last_error.setdefault("provider", self._provider_label(requested_provider))
                last_error.setdefault("model", primary_model or requested_provider)
            return last_error
        finally:
            # Restore original config if we temporarily changed it
            if temp_config is not None and original_config is not None:
                self.config = original_config

    def _stream_chunks(self, response_text: str, provider_label: Optional[str] = None) -> Iterator[Dict[str, object]]:
        """Stream mock response chunks in development mode."""
        for chunk in self._chunk_text(response_text):
            yield {"content": chunk}
        final_chunk: Dict[str, object] = {
            "done": True,
            "response": response_text,
            "tokens": len(response_text.split())
        }
        if provider_label:
            final_chunk["provider"] = provider_label
        yield final_chunk

    def _setup_streaming_request(self, messages, model_name, temperature, max_tokens):
        """Prepare streaming request and return necessary data."""
        # Type assertion: We know requests is available because _ensure_live_ready would have caught this
        assert HAS_REQUESTS and requests is not None, "Requests library must be available"
        payload = self._build_payload(messages, model_name, temperature=temperature, max_tokens=max_tokens, stream=True)
        headers = self._headers()
        headers["Accept"] = "text/event-stream"
        headers["Connection"] = "keep-alive"  # Keep connection alive for faster streaming

        # Use session for connection pooling if available
        if self.session is not None:
            http_client = self.session
        else:
            http_client = requests  # type: ignore[assignment]
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
        use_grokipedia: Optional[bool] = None,
    ) -> Iterator[Dict[str, object]]:
        """Yield incremental response chunks for realtime streaming with optional Grokipedia grounding."""
        # Determine whether to use Grokipedia
        if use_grokipedia is None:
            use_grokipedia = self.config.get("use_grokipedia", True)

        # Extract user message for context search
        user_message = ""
        for msg in messages:
            if msg.get("role") == "user":
                user_message = msg.get("content", "")
                break

        # Get Grokipedia context if enabled
        grokipedia_context = ""
        if use_grokipedia:
            grokipedia_context = self._get_grokipedia_context(user_message)

        # Enhance messages with context if available
        enhanced_messages = messages.copy()
        if grokipedia_context:
            context_message = {
                "role": "system",
                "content": f"You have access to verified knowledge from Grokipedia. Use this information to provide accurate, factual responses:\n\n{grokipedia_context}\n\nWhen referencing information from Grokipedia, cite it clearly. If the query doesn't relate to the provided context, you can still use your general knowledge but indicate when you're going beyond the verified facts."
            }
            enhanced_messages.insert(0, context_message)

        primary_model = model or self.config.get("default_model")
        if not primary_model:
            yield {"error": "No OpenRouter models configured.", "done": True}
            return

        dev_mode = bool(self.config.get("dev_mode"))
        api_key_present = bool(self.config.get("api_key"))

        # Handle development mode without API keys
        if dev_mode and not api_key_present:
            fallback_model = primary_model or "mock-openrouter-model"
            logging.debug("DEV_MODE streaming without API key; returning mock stream for %s", fallback_model)
            mock = self._get_mock_response(enhanced_messages, fallback_model)
            provider_label = mock.get("provider") or self._provider_label(self.config.get("provider"))
            for chunk in self._stream_chunks(mock["response"], provider_label):
                yield chunk
            return

        if dev_mode and api_key_present:
            logging.debug("DEV_MODE streaming with API key present; proceeding with live stream.")

        # Check readiness
        readiness_error = self._ensure_live_ready()
        if readiness_error:
            error_payload = {**readiness_error, "done": True}
            error_payload.setdefault("provider", self._provider_label(self.config.get("provider")))
            yield error_payload
            return

        attempts = self._get_candidates(model)
        last_error: Optional[Dict[str, object]] = None

        logging.info("Attempting models in order: %s", attempts)

        for candidate in attempts:
            logging.info("Trying model: %s", candidate)
            response, open_error = self._open_stream_with_backoff(enhanced_messages, candidate, temperature, max_tokens)

            if not response:
                if open_error:
                    logging.warning("Streaming setup failed for %s: %s", candidate, open_error.get("error"))
                    if open_error.get("rate_limited"):
                        logging.info("Model %s rate limited upstream, moving to next candidate", candidate)
                    last_error = {**open_error, "done": True}
                    last_error.setdefault(
                        "provider",
                        self._provider_label(self._infer_provider_from_model_name(candidate)),
                    )
                else:
                    last_error = {
                        "error": f"Failed to open stream for {candidate}",
                        "model": candidate,
                        "done": True,
                        "provider": self._provider_label(
                            self._infer_provider_from_model_name(candidate)
                        ),
                    }
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
            payload["provider"] = self._provider_label(
                self._infer_provider_from_model_name(candidate)
            )
            if primary_model and candidate != primary_model:
                # Get model name for better UX
                available_models = self._fetch_models_from_api()
                model_name = next((m["name"] for m in available_models if m["id"] == candidate), candidate)
                payload["notice"] = (
                    f"✓ Switched to {model_name} (primary model rate limited)"
                )
                logging.info(f"✓ Successfully used fallback model: {candidate}")

            # Add Grokipedia usage info
            if grokipedia_context:
                payload["grokipedia_used"] = True
                payload["knowledge_sources"] = "Grokipedia + OpenRouter model"

            yield payload
            return
        if last_error:
            yield last_error
            return
        yield {
            "error": "All OpenRouter model attempts failed.",
            "done": True,
            "provider": self._provider_label(self.config.get("provider")),
        }

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 32) -> Iterator[str]:
        for index in range(0, len(text), chunk_size):
            yield text[index : index + chunk_size]


grok_client = Grok2Client()
