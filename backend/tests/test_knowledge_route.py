"""Contracts and regressions for the knowledge base (RAG & Grokipedia) route."""

import importlib
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from tests.support import expect


@pytest.fixture
def client_and_modules(monkeypatch):
    """Provide a TestClient with knowledge router and access to mocked services."""
    knowledge_module = importlib.import_module("app.routes.knowledge")
    app = FastAPI()
    app.include_router(knowledge_module.router)
    client = TestClient(app)
    return client, knowledge_module


def test_ingest_documents_success(client_and_modules, monkeypatch):
    """Valid document list should build the index and return 200 with count."""
    client, module = client_and_modules
    captured = []

    async def fake_build(docs):
        captured.extend(docs)

    monkeypatch.setattr(module.embedding_service, "build_index", fake_build)

    response = client.post(
        "/api/knowledge/ingest",
        json={"documents": ["Document 1 text", "Document 2 text"]},
    )

    expect(response.status_code == 200, "valid ingest request should succeed")
    payload = response.json()
    expect(payload["success"] is True, "success flag must be True")
    expect(payload["count"] == 2, "must report 2 documents indexed")
    expect(captured == ["Document 1 text", "Document 2 text"], "documents forwarded to service")


def test_ingest_documents_rejects_whitespace_only(client_and_modules):
    """Whitespace-only document entries must return HTTP 400 Bad Request."""
    client, _ = client_and_modules

    response = client.post(
        "/api/knowledge/ingest",
        json={"documents": ["   ", "\t\n  "]},
    )

    expect(response.status_code == 400, "empty/whitespace documents must return 400")
    expect("No non-empty documents provided" in response.json()["detail"], "helpful detail")


def test_ingest_documents_handles_service_failure(client_and_modules, monkeypatch):
    """Embedding service exception must return HTTP 500."""
    client, module = client_and_modules

    async def fail_build(docs):
        raise RuntimeError("Vector database unavailable")

    monkeypatch.setattr(module.embedding_service, "build_index", fail_build)

    response = client.post(
        "/api/knowledge/ingest",
        json={"documents": ["Sample doc"]},
    )

    expect(response.status_code == 500, "service failure must return 500")
    expect(response.json()["detail"] == "Request failed", "standard error detail")


def test_search_knowledge_rejects_whitespace_query(client_and_modules):
    """Whitespace-only search query must return HTTP 400 Bad Request."""
    client, _ = client_and_modules

    response = client.post(
        "/api/knowledge/search",
        json={"query": "   \n\t   ", "top_k": 3},
    )

    expect(response.status_code == 400, "whitespace query must return 400")
    expect("Search query must not be empty" in response.json()["detail"], "helpful detail")


def test_search_knowledge_combines_local_and_web_results(client_and_modules, monkeypatch):
    """Search endpoint merges local embedding hits and web search results, sorted by score."""
    client, module = client_and_modules

    monkeypatch.setattr(module.embedding_service, "index", True)

    async def fake_local_search(query, top_k):
        return [("Local result text", 0.95)]

    async def fake_web_search(query, max_results):
        return [{"title": "Web Title", "content": "Web content", "score": 0.85, "url": "https://example.com"}]

    monkeypatch.setattr(module.embedding_service, "search", fake_local_search)
    monkeypatch.setattr(module.web_search_service, "search_web", fake_web_search)

    response = client.post(
        "/api/knowledge/search",
        json={"query": "quantum computing", "top_k": 3, "use_web_search": True},
    )

    expect(response.status_code == 200, "combined search should succeed")
    payload = response.json()
    expect(payload["success"] is True, "success should be True")
    expect(len(payload["results"]) == 2, "both local and web results present")
    expect(payload["results"][0]["score"] == 0.95, "results sorted by descending score")
    expect(payload["results"][0]["source"] == "local", "highest rank is local result")
    expect(payload["results"][1]["source"] == "web", "second rank is web result")


def test_grokipedia_search_empty_query_400(client_and_modules):
    """Empty or whitespace query to /grokipedia must return 400."""
    client, _ = client_and_modules

    response = client.post(
        "/api/knowledge/grokipedia",
        json={"query": "    "},
    )

    expect(response.status_code == 400, "whitespace query must return 400")


def test_grokipedia_search_collects_streamed_answer(client_and_modules, monkeypatch):
    """Non-streaming grokipedia collects all stream chunks into final answer string."""
    client, module = client_and_modules

    async def fake_web_search(query, max_results, search_depth):
        return [{"title": "Source 1", "content": "Info 1", "url": "https://source1.example"}]

    async def fake_stream_answer(query, context_results):
        for chunk in ["Quantum ", "computing ", "is powerful."]:
            yield chunk

    monkeypatch.setattr(module.web_search_service, "search_web", fake_web_search)
    monkeypatch.setattr(module.web_search_service, "stream_answer", fake_stream_answer)

    response = client.post(
        "/api/knowledge/grokipedia",
        json={"query": "Quantum computing", "max_results": 5, "search_depth": "advanced"},
    )

    expect(response.status_code == 200, "grokipedia search should succeed")
    payload = response.json()
    expect(payload["success"] is True, "success flag must be True")
    expect(payload["answer"] == "Quantum computing is powerful.", "answer must concatenate chunks")
    expect(len(payload["sources"]) == 1, "sources list included")


def test_knowledge_stats_endpoint(client_and_modules, monkeypatch):
    """GET /api/knowledge/stats returns document count and service flags."""
    client, module = client_and_modules

    monkeypatch.setattr(module.embedding_service, "documents", ["doc1", "doc2", "doc3"])
    monkeypatch.setattr(module.web_search_service, "use_tavily", False)

    response = client.get("/api/knowledge/stats")

    expect(response.status_code == 200, "stats endpoint should succeed")
    payload = response.json()
    expect(payload["success"] is True, "success should be True")
    expect(payload["documents"] == 3, "should report 3 indexed documents")
    expect(payload["web_search_enabled"] is True, "web search flag should be True")
    expect(payload["tavily_enabled"] is False, "tavily enabled should match service state")
