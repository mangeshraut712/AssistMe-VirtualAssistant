import os
import requests
import logging

class Grok2Client:
    def __init__(self):
        self.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self.api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.referer = os.getenv("APP_URL", "http://localhost:3001")
        self.title = os.getenv("APP_NAME", "AssistMe Virtual Assistant")

        # Fallback configuration for a future Grok-2 endpoint
        self.grok2_endpoint = os.getenv("GROK2_ENDPOINT")
        self.grok2_api_key = os.getenv("GROK2_API_KEY")

        # No need for timeout variable since requests handles it per-request
        self.default_models = [
            {"id": "meta-llama/llama-3.1-8b-instruct:free", "name": "Llama 3.1 8B"},
            {"id": "meta-llama/llama-3.1-70b-instruct:free", "name": "Llama 3.1 70B"},
            {"id": "microsoft/wizardlm-2-8x22b:free", "name": "WizardLM 2 8x22B"},
            {"id": "google/gemma-7b:free", "name": "Google Gemma 7B"},
            {"id": "mistralai/codestral-mamba:free", "name": "Codestral Mamba"},
            {"id": "z-ai/glm-4.5-air:free", "name": "Z.AI GLM 4.5 Air"},
            {"id": "deepseek/deepseek-v3-0324:free", "name": "DeepSeek V3"},
            {"id": "microsoft/fastcodellm-13b-instruct:free", "name": "FastCodeLLM 13B"},
            {"id": "meta-llama/llama-2-13b-chat:free", "name": "Llama 2 13B"},
            {"id": "rwkv-4-1.5b-chat:free", "name": "RWKV 4 1.5B"},
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

    def generate_response(self, messages, model=None, temperature=0.7, max_tokens=1024):
        model_name = model or self.default_model or self.default_models[0]["id"]

        if not self.api_key:
            logging.warning("OPENROUTER_API_KEY not configured; returning placeholder response.")
            return {
                "response": "OpenRouter API key is not configured. Please set OPENROUTER_API_KEY to enable live responses.",
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
