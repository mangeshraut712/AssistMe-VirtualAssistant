"""Vector embedding service for knowledge retrieval."""

import json
import logging
import os
from typing import List, Optional, Tuple

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating and searching embeddings."""

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.index = None
        self.documents = []
        self._is_loading = False
        self.source_ids: List[str] = []

    def _load_model(self):
        """Load the model if not already loaded."""
        if self.model:
            return

        if self._is_loading:
            logger.warning("Embedding model is already loading...")
            return

        try:
            self._is_loading = True
            logger.info(f"Loading Embedding model: {self.model_name}...")
            self.model = SentenceTransformer(self.model_name)
            logger.info("Embedding model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Embedding model: {e}")
            raise
        finally:
            self._is_loading = False

    async def embed_text(self, text: str) -> np.ndarray:
        """Generate embedding for text."""
        if not self.model:
            await run_in_threadpool(self._load_model)

        def _do_encode():
            return self.model.encode([text])[0]

        return await run_in_threadpool(_do_encode)

    async def embed_batch(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for multiple texts."""
        if not self.model:
            await run_in_threadpool(self._load_model)

        def _do_encode():
            return self.model.encode(texts)

        return await run_in_threadpool(_do_encode)

    async def build_index(
        self, documents: List[str], source_ids: Optional[List[str]] = None
    ):
        """Build FAISS index from documents."""
        self.documents = documents
        self.source_ids = source_ids or [f"doc-{i}" for i in range(len(documents))]
        embeddings = await self.embed_batch(documents)

        def _do_build():
            # Create FAISS index
            dimension = embeddings.shape[1]
            index = faiss.IndexFlatL2(dimension)
            index.add(embeddings.astype("float32"))
            return index

        self.index = await run_in_threadpool(_do_build)
        logger.info(f"Built index with {len(documents)} documents")

    async def search(self, query: str, top_k: int = 3) -> List[Tuple[str, float]]:
        """Search for similar documents."""
        if not self.index:
            return []

        query_embedding = await self.embed_text(query)

        def _do_search():
            q_emb = query_embedding.astype("float32").reshape(1, -1)
            distances, indices = self.index.search(q_emb, top_k)
            return distances, indices

        distances, indices = await run_in_threadpool(_do_search)

        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx < len(self.documents) and idx >= 0:
                results.append((self.documents[idx], float(distance)))

        return results

    async def load_from_file(self, path: str) -> int:
        """Load documents from a JSON file and build the index.

        File format:
        [
            {"id": "...", "title": "...", "content": "..."},
            ...
        ]
        """
        resolved = path
        if not os.path.exists(resolved):
            logger.warning("Knowledge base file not found at %s", resolved)
            return 0

        with open(resolved, "r", encoding="utf-8") as f:
            data = json.load(f)

        documents: List[str] = []
        source_ids: List[str] = []
        for entry in data:
            # combine title + content for better recall
            text = " ".join(
                str(entry.get(key, "")).strip()
                for key in ("title", "content")
                if entry.get(key)
            ).strip()
            if text:
                documents.append(text)
                source_ids.append(str(entry.get("id", f"doc-{len(source_ids)}")))

        if not documents:
            logger.warning(
                "Knowledge base file %s contained no usable documents", resolved
            )
            return 0

        await self.build_index(documents, source_ids)
        return len(documents)


# Global instance
embedding_service = EmbeddingService()
