"""Knowledge Base and Web Search API endpoints (Grokipedia)."""

import json
import logging
from typing import TypedDict

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..knowledge_schema import GrokipediaRequest, IngestRequest, SearchRequest
from ..services.embedding_service import embedding_service
from ..services.web_search_service import web_search_service

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])
logger = logging.getLogger(__name__)


class KnowledgeSearchResult(TypedDict, total=False):
    """A local or web result normalized for the combined search response."""

    text: str
    score: float
    source: str
    url: str


@router.post("/ingest")
async def ingest_documents(request: IngestRequest):
    """Ingest documents into the knowledge base."""
    valid_documents = [doc.strip() for doc in request.documents if doc and doc.strip()]
    if not valid_documents:
        raise HTTPException(status_code=400, detail="No non-empty documents provided")

    try:
        await embedding_service.build_index(valid_documents)

        return {
            "success": True,
            "count": len(valid_documents),
            "message": "Knowledge base updated",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to ingest documents: {exc}")
        raise HTTPException(status_code=500, detail="Request failed") from exc


@router.post("/search")
async def search_knowledge(request: SearchRequest):
    """
    Search the knowledge base and optionally the web.

    This endpoint combines local RAG with web search for comprehensive results.
    """
    query = request.normalized_query()
    if not query:
        raise HTTPException(status_code=400, detail="Search query must not be empty")

    try:
        results: list[KnowledgeSearchResult] = []

        # First, search local knowledge base if available
        if embedding_service.index:
            local_results = await embedding_service.search(query, request.top_k)
            results.extend([
                {
                    "text": text,
                    "score": float(score),
                    "source": "local"
                }
                for text, score in local_results
            ])

        # Then, search the web if enabled
        if request.use_web_search:
            web_results = await web_search_service.search_web(
                query,
                max_results=request.top_k
            )
            results.extend([
                {
                    "text": f"{r['title']}: {r['content']}",
                    "score": r.get("score", 0.5),
                    "source": "web",
                    "url": r.get("url", "")
                }
                for r in web_results
            ])

        # Sort by score and limit results
        results.sort(key=lambda x: x["score"], reverse=True)
        results = results[:request.top_k * 2]  # Return more results when combining sources

        return {"success": True, "results": results}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Knowledge search failed: {exc}")
        raise HTTPException(status_code=500, detail="Request failed") from exc


@router.post("/grokipedia/stream")
async def grokipedia_stream(request: GrokipediaRequest):
    """
    Streamed Grokipedia article with real-time web search integration.
    """
    async def stream_generator():
        try:
            # 1. Search (First step is non-streamed for context gathering)
            logger.info(f"Grokipedia search for: {request.query}")
            search_results = await web_search_service.search_web(
                request.query,
                max_results=request.max_results,
                search_depth=request.search_depth
            )
            logger.info(f"Found {len(search_results)} sources")

            # 2. Yield metadata first so the frontend knows sources
            yield f"data: {json.dumps({'type': 'metadata', 'sources': search_results})}\n\n"

            # 3. Stream the answer
            async for chunk in web_search_service.stream_answer(
                request.query,
                context_results=search_results
            ):
                if chunk:
                    yield f"data: {json.dumps({'type': 'content', 'delta': chunk})}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Grokipedia stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Request failed'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")


@router.post("/grokipedia")
async def grokipedia_search(request: GrokipediaRequest):
    """
    Grokipedia-style deep search with AI-generated answers.
    """
    query = request.normalized_query()
    if not query:
        raise HTTPException(status_code=400, detail="Search query must not be empty")

    try:
        search_results = await web_search_service.search_web(
            query,
            max_results=request.max_results,
            search_depth=request.search_depth
        )

        # For non-streaming, collect the streamed answer.
        answer = ""
        async for chunk in web_search_service.stream_answer(query, context_results=search_results):
            answer += chunk

        return {
            "success": True,
            "query": query,
            "answer": answer,
            "sources": search_results,
            "search_depth": request.search_depth
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Grokipedia search failed: {exc}")
        raise HTTPException(status_code=500, detail="Request failed") from exc


@router.get("/stats")
async def knowledge_stats():
    """Return knowledge base stats."""
    count = len(embedding_service.documents) if embedding_service.documents else 0
    return {
        "success": True,
        "documents": count,
        "web_search_enabled": True,
        "tavily_enabled": web_search_service.use_tavily
    }
