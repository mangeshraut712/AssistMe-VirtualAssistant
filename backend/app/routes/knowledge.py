"""Knowledge Base and Web Search API endpoints (Grokipedia)."""

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.embedding_service import embedding_service
from ..services.web_search_service import web_search_service

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


class IngestRequest(BaseModel):
    documents: List[str]


class SearchRequest(BaseModel):
    query: str
    top_k: int = 3
    use_web_search: bool = True  # Enable web search by default


class GrokipediaRequest(BaseModel):
    query: str
    max_results: int = 5
    search_depth: str = "advanced"  # "basic" or "advanced"


@router.post("/ingest")
async def ingest_documents(request: IngestRequest):
    """Ingest documents into the knowledge base."""
    try:
        if not request.documents:
            raise HTTPException(status_code=400, detail="No documents provided")

        await embedding_service.build_index(request.documents)

        return {
            "success": True,
            "count": len(request.documents),
            "message": "Knowledge base updated",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_knowledge(request: SearchRequest):
    """
    Search the knowledge base and optionally the web.

    This endpoint combines local RAG with web search for comprehensive results.
    """
    try:
        results = []

        # First, search local knowledge base if available
        if embedding_service.index:
            local_results = await embedding_service.search(request.query, request.top_k)
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
                request.query,
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grokipedia")
async def grokipedia_search(request: GrokipediaRequest):
    """
    Grokipedia-style deep search with AI-generated answers.

    This endpoint provides a comprehensive answer with sources,
    similar to the real Grokipedia experience.
    """
    try:
        # Perform web search
        search_results = await web_search_service.search_web(
            request.query,
            max_results=request.max_results,
            search_depth=request.search_depth
        )

        # Generate comprehensive answer
        answer = await web_search_service.get_answer(
            request.query,
            context_results=search_results
        )

        return {
            "success": True,
            "query": request.query,
            "answer": answer,
            "sources": search_results,
            "search_depth": request.search_depth
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
