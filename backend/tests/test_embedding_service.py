import json
import sys
import numpy as np
import pytest
from app.services.embedding_service import EmbeddingService

emb_mod = sys.modules["app.services.embedding_service"]


class MockFaissIndex:
    def __init__(self, dimension):
        self.dimension = dimension
        self.vectors = []

    def add(self, vectors):
        self.vectors.extend(vectors)

    def search(self, q_emb, top_k):
        k = min(top_k, len(self.vectors))
        distances = np.array([[float(i) * 0.1 for i in range(k)]], dtype=np.float32)
        indices = np.array([[i for i in range(k)]], dtype=np.int64)
        return distances, indices


class MockFaissModule:
    IndexFlatL2 = MockFaissIndex


@pytest.mark.asyncio
async def test_search_uninitialized_index_returns_empty():
    service = EmbeddingService()
    results = await service.search("sample query")
    assert results == []


@pytest.mark.asyncio
async def test_search_invalid_top_k_or_empty_query():
    service = EmbeddingService()
    service.index = object()  # dummy truthy
    assert await service.search("", top_k=3) == []
    assert await service.search("   ", top_k=3) == []
    assert await service.search("hello", top_k=0) == []
    assert await service.search("hello", top_k=-1) == []


@pytest.mark.asyncio
async def test_load_from_file_missing_path(tmp_path):
    service = EmbeddingService()
    assert await service.load_from_file(str(tmp_path / "nonexistent.json")) == 0


@pytest.mark.asyncio
async def test_load_from_file_invalid_json_structure(tmp_path):
    service = EmbeddingService()
    file_path = tmp_path / "bad.json"
    file_path.write_text(json.dumps({"error": "not a list"}))
    assert await service.load_from_file(str(file_path)) == 0


@pytest.mark.asyncio
async def test_load_from_file_empty_or_non_dict_entries(tmp_path):
    service = EmbeddingService()
    file_path = tmp_path / "mixed.json"
    file_path.write_text(json.dumps(["string_item", 123, None, {}]))
    assert await service.load_from_file(str(file_path)) == 0


@pytest.mark.asyncio
async def test_build_index_and_search_with_mock_faiss(monkeypatch):
    monkeypatch.setattr(emb_mod, "faiss", MockFaissModule)
    service = EmbeddingService()

    class MockModel:
        def encode(self, texts):
            return np.ones((len(texts), 4), dtype=np.float32)

    service.model = MockModel()
    docs = ["sweet red apple", "ripe yellow banana", "green garden spinach"]
    await service.build_index(docs, source_ids=["id1", "id2", "id3"])

    assert service.index is not None
    assert service.documents == docs
    assert service.source_ids == ["id1", "id2", "id3"]

    results = await service.search("fresh apple", top_k=2)
    assert len(results) == 2
    assert results[0][0] == "sweet red apple"
    assert isinstance(results[0][1], float)


@pytest.mark.asyncio
async def test_load_from_file_success(tmp_path, monkeypatch):
    monkeypatch.setattr(emb_mod, "faiss", MockFaissModule)
    service = EmbeddingService()

    class MockModel:
        def encode(self, texts):
            return np.ones((len(texts), 4), dtype=np.float32)

    service.model = MockModel()
    file_path = tmp_path / "kb.json"
    file_path.write_text(
        json.dumps([
            {"id": "k1", "title": "Doc 1", "content": "Content of doc 1"},
            {"id": "k2", "title": "Doc 2", "content": "Content of doc 2"},
        ])
    )

    count = await service.load_from_file(str(file_path))
    assert count == 2
    assert len(service.documents) == 2
    assert service.source_ids == ["k1", "k2"]


@pytest.mark.asyncio
async def test_build_index_faiss_unavailable(monkeypatch):
    monkeypatch.setattr(emb_mod, "faiss", None)
    service = EmbeddingService()

    class MockModel:
        def encode(self, texts):
            return np.ones((len(texts), 4), dtype=np.float32)

    service.model = MockModel()
    with pytest.raises(RuntimeError, match="faiss is unavailable"):
        await service.build_index(["doc1"])
