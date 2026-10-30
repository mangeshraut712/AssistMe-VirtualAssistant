"""Provider response-contract regressions that do not make network requests."""

import anyio

from app.providers.base import (
    BaseProvider,
    ChatCompletion,
    StreamChunk,
)
from app.providers.openrouter import OpenRouterProvider
from tests.support import expect


class _ProviderWithSeparateStreamMethod(BaseProvider[object]):
    """Minimal provider used to exercise BaseProvider.complete locally."""

    async def chat_completion(self, messages, model=None, temperature=0.7, max_tokens=4096, **kwargs):
        return ChatCompletion(id="local", model=model or "local", choices=[])

    async def chat_completion_stream(
        self, messages, model=None, temperature=0.7, max_tokens=4096, **kwargs
    ):
        async def chunks():
            yield StreamChunk(id="local-1", delta="hello", model=model or "local")

        return chunks()

    async def list_models(self):
        return []

    def is_available(self):
        return True


def test_complete_awaits_the_explicit_stream_method():
    """The unified helper returns an async iterator, not an un-awaited coroutine."""

    async def scenario():
        result = await _ProviderWithSeparateStreamMethod().complete(
            [{"role": "user", "content": "hello"}], stream=True
        )
        return [chunk.delta async for chunk in result]

    expect(anyio.run(scenario) == ["hello"], "complete should expose stream chunks directly")


def test_openrouter_accepts_an_omitted_model_without_a_network_request(monkeypatch):
    """Normal chat callers may omit a model and should use the free fallback list."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    provider = OpenRouterProvider()
    captured = {}

    async def fake_unary_response(url, payload):
        captured["url"] = url
        captured["payload"] = payload
        return {"response": "local", "tokens": 1, "model": payload["model"]}

    monkeypatch.setattr(provider, "_unary_response", fake_unary_response)

    result = anyio.run(
        provider.chat_completion,
        [{"role": "user", "content": "hello"}],
        None,
    )

    expect(result["response"] == "local", "the synthetic provider result should be returned")
    expect(
        captured["payload"]["model"] == "openrouter/free",
        "an omitted model should select the free default before request dispatch",
    )
