import pytest
from app.services.web_search_service import WebSearchService, SearchResult


@pytest.mark.anyio
async def test_search_web_empty_query_returns_empty_list():
    service = WebSearchService()
    assert await service.search_web("") == []
    assert await service.search_web("   \n\t ") == []
    assert await service.search_web(None) == []


@pytest.mark.anyio
async def test_search_web_clamps_max_results(monkeypatch):
    service = WebSearchService()
    captured = {}

    async def mock_ddg(query, max_results):
        captured["query"] = query
        captured["max_results"] = max_results
        return []

    monkeypatch.setattr(service, "_search_duckduckgo", mock_ddg)
    service.use_tavily = False

    # Negative clamped to 1
    await service.search_web("quantum computing", max_results=-10)
    assert captured["max_results"] == 1

    # Over 50 clamped to 50
    await service.search_web("quantum computing", max_results=100)
    assert captured["max_results"] == 50

    # Normal value preserved
    await service.search_web("  quantum computing  ", max_results=7)
    assert captured["query"] == "quantum computing"
    assert captured["max_results"] == 7


@pytest.mark.anyio
async def test_stream_answer_empty_query_yields_message():
    service = WebSearchService()
    chunks = []
    async for chunk in service.stream_answer(""):
        chunks.append(chunk)
    assert "".join(chunks) == "Please provide a search query."


@pytest.mark.anyio
async def test_stream_answer_yields_from_stream_generator(monkeypatch):
    service = WebSearchService()

    class MockProvider:
        async def chat_completion_stream(self, **kwargs):
            async def gen():
                yield {"delta": "Quantum "}
                yield {"delta": "mechanics "}
                yield {"delta": "explains physics."}
            return gen()

    import app.providers
    monkeypatch.setattr(app.providers, "get_provider", lambda: MockProvider())

    dummy_context: list[SearchResult] = [
        {"title": "Intro", "url": "https://example.com/qm", "content": "Physics overview", "score": 0.9}
    ]

    collected = []
    async for chunk in service.stream_answer("Quantum Mechanics", context_results=dummy_context):
        collected.append(chunk)

    assert "".join(collected) == "Quantum mechanics explains physics."


def test_fallback_format_answer():
    service = WebSearchService()
    assert service._fallback_format_answer([]) == "No results found."

    results: list[SearchResult] = [
        {"title": "Title 1", "url": "https://example.com/1", "content": "Content 1", "score": 0.8},
        {"title": "AI Summary", "url": "", "content": "Skip AI Summary", "score": 1.0},
    ]
    formatted = service._fallback_format_answer(results)
    assert "Title 1" in formatted
    assert "https://example.com/1" in formatted
    assert "Content 1" in formatted
    assert "Skip AI Summary" not in formatted


def test_fallback_results():
    service = WebSearchService()
    fb = service._fallback_results("Artificial Intelligence")
    assert len(fb) == 1
    assert fb[0]["title"] == "AI Knowledge Base"
    assert "Artificial Intelligence" in fb[0]["content"]
