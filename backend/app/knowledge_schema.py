"""Request limits for unauthenticated knowledge endpoints."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field

DocumentText = Annotated[str, Field(min_length=1, max_length=100_000)]


class IngestRequest(BaseModel):
    """Documents accepted into the local knowledge index."""

    documents: list[DocumentText] = Field(min_length=1, max_length=100)

    def document_count(self) -> int:
        """Return how many documents this request would index."""
        return len(self.documents)

    def longest_document(self) -> int:
        """Return the longest document length, in characters."""
        return max(len(document) for document in self.documents)


class SearchRequest(BaseModel):
    """Local and web search request."""

    query: str = Field(min_length=1, max_length=4_000)
    top_k: int = Field(default=3, ge=1, le=20)
    use_web_search: bool = True

    def normalized_query(self) -> str:
        """Return the query without leading or trailing whitespace."""
        return self.query.strip()

    def result_window(self) -> int:
        """Return how many hits the caller asked for."""
        return self.top_k


class GrokipediaRequest(BaseModel):
    """Deep-research article request."""

    query: str = Field(min_length=1, max_length=4_000)
    max_results: int = Field(default=5, ge=1, le=8)
    search_depth: Literal["basic", "advanced"] = "advanced"

    def normalized_query(self) -> str:
        """Return the query without leading or trailing whitespace."""
        return self.query.strip()

    def uses_advanced_search(self) -> bool:
        """Return whether the caller asked for the deeper search."""
        return self.search_depth == "advanced"
