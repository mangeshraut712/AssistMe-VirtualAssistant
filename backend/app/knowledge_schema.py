"""Request limits for unauthenticated knowledge endpoints."""

# These models only declare fields. Pylint's method count does not apply.
# pylint: disable=too-few-public-methods

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field

DocumentText = Annotated[str, Field(min_length=1, max_length=100_000)]


class IngestRequest(BaseModel):
    """Documents accepted into the local knowledge index."""

    documents: list[DocumentText] = Field(min_length=1, max_length=100)


class SearchRequest(BaseModel):
    """Local and web search request."""

    query: str = Field(min_length=1, max_length=4_000)
    top_k: int = Field(default=3, ge=1, le=20)
    use_web_search: bool = True


class GrokipediaRequest(BaseModel):
    """Deep-research article request."""

    query: str = Field(min_length=1, max_length=4_000)
    max_results: int = Field(default=5, ge=1, le=8)
    search_depth: Literal["basic", "advanced"] = "advanced"
