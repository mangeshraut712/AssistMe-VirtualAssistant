import os
import requests
import logging
import redis
from typing import Optional

class Grok2Client:
    def __init__(self):
        self.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self.api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.referer = os.getenv("APP_URL", "http://localhost:3001")
        self.title = os.getenv("APP_NAME", "AssistMe Virtual Assistant")

        # Fallback configuration for a future Grok-2 endpoint
        self.grok2_endpoint = os.getenv("GROK2_ENDPOINT")
        self.grok2_api_key = os.getenv("GROK2_API_KEY")

        # Rate limiting configuration
        self.redis_client: Optional[redis.Redis] = None
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                self.redis_client = redis.from_url(redis_url)
            except Exception as e:
                logging.warning(f"Failed to connect to Redis: {e}")

        # No need for timeout variable since requests handles it per-request
        self.default_models = [
            {"id": "mistralai/mistral-7b-instruct:free", "name": "Mistral 7B"},
            {"id": "microsoft/wizardlm-2-8x22b:free", "name": "WizardLM 2 8x22B"},
            {"id": "google/gemma-7b-it:free", "name": "Google Gemma 7B"},
            {"id": "openchat/openchat-7b:free", "name": "OpenChat 7B"},
            {"id": "rwkv/rwkv-6-world-clash:free", "name": "RWKV Clash 1.6B"},
            {"id": "rwkv/rwkv-6-world-godot:free", "name": "RWKV Godot 1.5B"},
            {"id": "rwkv/rwkv-6-world-ness:free", "name": "RWKV Ness 1.4B"},
            {"id": "h2oai/h2o-danube-1.8b-chat:free", "name": "H2O Danube 1.8B"},
            {"id": "teknium/openhermes-2.5-mistral-7b:free", "name": "OpenHermes 2.5"},
            {"id": "thedrummer/unsloth-llama-3-8b-abliterated:free", "name": "Unsloth Llama 3"},
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

    def generate_response(self, messages, model=None, temperature=0.7, max_tokens=1024):
        model_name = model or self.default_model or self.default_models[0]["id"]

        if not self.api_key:
            logging.warning("OPENROUTER_API_KEY not configured; returning placeholder response.")
            return {
                "response": "OpenRouter API key is not configured. Please set OPENROUTER_API_KEY to enable live responses.",
                "tokens": 0,
            }

        # Check rate limit
        if not self._check_rate_limit():
            return {
                "error": "Rate limit exceeded. You've reached the daily limit for free model requests (45/day). This resets every 24 hours. To get more requests, consider upgrading your OpenRouter account to unlock 1000 requests/day for just $10.",
                "tokens": 0,
            }

        payload = {
            "model": model_name,
            "messages": self._format_messages(messages),
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

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


grok_client = Grok2Client()
