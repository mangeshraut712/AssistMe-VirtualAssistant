"""Live Grokipedia retrieval engine with API integration and fallback support."""

from __future__ import annotations

import json
import logging
import os
import asyncio
import time
import threading
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple, TYPE_CHECKING
from urllib.parse import quote

try:
    import aiohttp  # type: ignore[import-not-found]
except ImportError:
    aiohttp = None  # type: ignore[assignment]

# Keep legacy FAISS imports for fallback
try:
    import numpy as np  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - optional dependency
    np = None  # type: ignore[assignment]

try:
    import faiss  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - optional dependency
    faiss = None  # type: ignore[assignment]

try:
    from sentence_transformers import SentenceTransformer  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - optional dependency
    SentenceTransformer = None  # type: ignore[assignment]

try:
    from langchain.tools import Tool  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - optional dependency
    Tool = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


class GrokipediaRAG:
    """Grokipedia retrieval engine with Grok API proxy and local fallback support."""

    def __init__(self, data_path: Optional[str] = None):
        # Configure Grok API proxy settings (current approach for Grokipedia access)
        self.use_grok_proxy = os.getenv("GROKIPEDIA_USE_GROK_PROXY", "false").lower() == "true"
        self.xai_api_key = os.getenv("XAI_API_KEY")  # For Grok API proxy search

        # Local data fallback
        default_path = Path(__file__).resolve().parents[1] / "data" / "grokipedia.json"
        self.data_path = Path(data_path or os.getenv("GROKIPEDIA_DATA_PATH", default_path))
        self.model_name = os.getenv("GROKIPEDIA_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        self.documents = self._load_documents()
        self._lock = threading.Lock()
        self._model: Optional[Any] = None
        self._index: Optional[Any] = None
        self._embeddings: Optional[Any] = None
        self._metadata: List[Dict[str, Any]] = []

        if self.use_grok_proxy and self.xai_api_key:
            logger.info("🇬 Grokipedia Grok proxy enabled - using Grok API for search")
        elif self.documents:
            logger.info("📁 Using local Grokipedia data (%d articles)", len(self.documents))
        else:
            logger.warning("⚠️  No Grokipedia data available - add grokipedia.json with 885K articles dataset")

    def _load_documents(self) -> List[Dict[str, Any]]:
        if not self.data_path.exists():
            logger.warning("Grokipedia dataset missing at %s", self.data_path)
            return []
        try:
            with self.data_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except Exception as exc:  # pragma: no cover - file read issues
            logger.error("Failed to load Grokipedia dataset: %s", exc)
            return []

        results = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            content = (item.get("content") or "").strip()
            summary = (item.get("summary") or "").strip()
            if not content and not summary:
                continue
            results.append(
                {
                    "id": item.get("id"),
                    "title": item.get("title"),
                    "summary": summary,
                    "content": content,
                    "tags": item.get("tags", []),
                }
            )
        return results

    def _ensure_model(self) -> None:
        if self._model is not None or SentenceTransformer is None:
            return
        if SentenceTransformer is None:
            logger.warning("sentence-transformers not available; Grokipedia RAG will fall back to keyword search.")
            return
        try:
            self._model = SentenceTransformer(self.model_name)
        except Exception as exc:  # pragma: no cover - model load failure
            logger.error("Failed to load embedding model '%s': %s", self.model_name, exc)
            self._model = None

    def _embed_documents(self) -> Optional[Any]:
        if not self.documents:
            return None
        if np is None:
            logger.warning("NumPy not available; skipping vector embeddings.")
            return None

        corpus = [f"{doc['title']} {doc['summary']} {doc['content']}" for doc in self.documents]
        if self._model is None:
            return None
        embeddings = self._model.encode(corpus, normalize_embeddings=True)
        return embeddings.astype("float32")

    def _build_index(self) -> None:
        with self._lock:
            if self._index is not None or not self.documents:
                return

            self._ensure_model()
            if self._model is None:
                return

            embeddings = self._embed_documents()
            if embeddings is None:
                return

            self._embeddings = embeddings
            self._metadata = self.documents

            if faiss is not None:
                dimension = embeddings.shape[1]
                index = faiss.IndexFlatIP(dimension)
                index.add(embeddings)
                self._index = index
                logger.info("FAISS index initialised for Grokipedia (%s entries).", len(self.documents))
            else:
                logger.info("FAISS missing; using NumPy similarity for Grokipedia.")

    def _keyword_search(self, query: str, top_k: int) -> List[Dict[str, Any]]:
        tokens = query.lower().split()
        scored: List[Tuple[float, Dict[str, Any]]] = []

        for doc in self.documents:
            haystack = f"{doc.get('title', '')} {doc.get('summary', '')} {doc.get('content', '')}".lower()
            hits = sum(1 for token in tokens if token in haystack)
            if hits:
                scored.append((float(hits), doc))

        scored.sort(key=lambda item: item[0], reverse=True)
        return [doc for _, doc in scored[:top_k]]

    def search_via_grok_proxy(self, query: str, top_k: int = 3) -> Optional[List[Dict[str, Any]]]:
        """Query Grokipedia via Grok API proxy for factual responses."""
        if not self.use_grok_proxy or not self.xai_api_key or aiohttp is None:
            return None

        async def grok_api_query():
            try:
                # Type-safe aiohttp usage
                assert aiohttp is not None, "aiohttp not available"
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15)) as session:  # type: ignore[attr-defined]
                    url = "https://api.x.ai/v1/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {self.xai_api_key}",
                        "Content-Type": "application/json"
                    }

                    # Prompt Grok to search/retrieve from Grokipedia knowledge
                    system_prompt = """You are Grok, built by xAI. You have access to Grokipedia, an AI-curated knowledge base with 885K+ articles.

When given a search query, provide factual information from Grokipedia in the following JSON format:
[{
  "title": "Article Title",
  "summary": "Brief summary",
  "content": "Relevant content excerpt",
  "score": 0.95,
  "tags": ["relevant", "tags"]
}]

Return only valid JSON array, no other text. If no relevant information, return []."""

                    payload = {
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Search Grokipedia for: {query}. Return top {top_k} results as JSON array."}
                        ],
                        "model": "grok-2-latest",
                        "temperature": 0.1,
                        "max_tokens": 2000,
                        "stream": False
                    }

                    async with session.post(url, json=payload, headers=headers) as response:
                        if response.status == 200:
                            data = await response.json()
                            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                            try:
                                results = json.loads(content.strip())
                                return results if isinstance(results, list) else []
                            except json.JSONDecodeError:
                                logger.warning("Failed to parse Grok API response as JSON")
                                return []
                        else:
                            logger.warning(f"Grok API error: {response.status}")
                            return []

            except asyncio.TimeoutError:
                logger.warning("Grok API timeout")
                return []
            except Exception as exc:
                logger.warning(f"Grok API error: {exc}")
                return []

        # Run async query in event loop
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(grok_api_query())
            loop.close()
            return result if result and len(result) > 0 else []
        except Exception as exc:
            logger.warning(f"Failed to query Grok API for Grokipedia: {exc}")
            return []

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search with Grokipedia - tries Grok proxy first, falls back to local."""
        # Try Grok API proxy first if enabled
        if self.use_grok_proxy:
            grok_results = self.search_via_grok_proxy(query, top_k)
            if grok_results and len(grok_results) > 0:
                logger.debug(f"🇬 Found {len(grok_results)} results from Grokipedia via Grok API")
                return grok_results

        # Fallback to local search
        logger.debug("Falling back to local Grokipedia data")
        return self._search_local(query, top_k)

    def _search_local(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Legacy local search method."""
        if not self.documents:
            return []

        self._build_index()
        if self._model is None or np is None:
            return self._keyword_search(query, top_k)

        query_vec = self._model.encode([query], normalize_embeddings=True).astype("float32")

        if self._index is not None and faiss is not None:
            scores, indices = self._index.search(query_vec, top_k)
            matches = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < 0 or idx >= len(self._metadata):
                    continue
                payload = self._metadata[idx].copy()
                payload["score"] = float(score)
                matches.append(payload)
            return matches

        if self._embeddings is None:
            return self._keyword_search(query, top_k)

        similarities = np.dot(self._embeddings, query_vec.T).ravel()
        top_indices = similarities.argsort()[-top_k:][::-1]

        matches = []
        for idx in top_indices:
            payload = self._metadata[idx].copy()
            payload["score"] = float(similarities[idx])
            matches.append(payload)
        return matches

    def as_context(self, query: str, top_k: int = 3) -> str:
        """Generate contextual prompt with cited sources."""
        results = self.search(query, top_k=top_k)
        blocks = []

        # Add source attribution header
        if self.use_grok_proxy:
            sources_used = "Grokipedia via Grok API proxy"
        else:
            sources_used = "local Grokipedia data"
        blocks.append(f"Factual information from {sources_used} (searched: \"{query}\"):")

        for item in results:
            title = item.get('title', 'Untitled')
            summary = item.get('summary', '')
            content = item.get('content', '')
            url = item.get('url', '')

            # Format as concise, cited block
            block = f"📄 **{title}**"
            if summary:
                block += f"\n   {summary}"
            if content and content != summary:
                # Truncate content if too long for context injection
                truncated = content[:500] + "..." if len(content) > 500 else content
                block += f"\n   {truncated}"
            if url:
                block += f"\n   Source: {url}"

            blocks.append(block)

        return "\n\n".join(blocks)


@lru_cache(maxsize=1)
def get_rag_engine() -> GrokipediaRAG:
    return GrokipediaRAG()


def rag_query(query: str, *, top_k: int = 3) -> Sequence[Dict[str, Any]]:
    engine = get_rag_engine()
    return engine.search(query, top_k=top_k)


def create_rag_tool() -> Optional[Any]:
    if Tool is None:
        return None

    engine = get_rag_engine()

    def _lookup(payload: str) -> str:
        results = engine.search(payload, top_k=3)
        return json.dumps(results, ensure_ascii=False)

    description = (
        "Look up background knowledge from Grokipedia. "
        "Input should be a search query; response returns JSON with matching passages."
    )
    return Tool(name="grokipedia_search", func=_lookup, description=description)
