"""Web Search Service for Grokipedia using DuckDuckGo and Tavily."""

import logging
import os
from typing import List, Dict, Optional
import aiohttp
import asyncio

logger = logging.getLogger(__name__)


class WebSearchService:
    """Service for performing web searches."""

    def __init__(self):
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
        self.use_tavily = bool(self.tavily_api_key)

    async def search_web(
        self,
        query: str,
        max_results: int = 5,
        search_depth: str = "advanced"
    ) -> List[Dict[str, str]]:
        """
        Search the web using Tavily API or DuckDuckGo fallback.

        Args:
            query: Search query
            max_results: Maximum number of results to return
            search_depth: "basic" or "advanced" (Tavily only)

        Returns:
            List of search results with title, url, and content
        """
        if self.use_tavily:
            return await self._search_tavily(query, max_results, search_depth)
        else:
            return await self._search_duckduckgo(query, max_results)

    async def _search_tavily(
        self,
        query: str,
        max_results: int,
        search_depth: str
    ) -> List[Dict[str, str]]:
        """Search using Tavily API."""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "api_key": self.tavily_api_key,
                    "query": query,
                    "max_results": max_results,
                    "search_depth": search_depth,
                    "include_answer": True,
                    "include_raw_content": False
                }

                async with session.post(
                    "https://api.tavily.com/search",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status != 200:
                        logger.error(f"Tavily API error: {response.status}")
                        return await self._search_duckduckgo(query, max_results)

                    data = await response.json()

                    results = []

                    # Add the AI-generated answer if available
                    if data.get("answer"):
                        results.append({
                            "title": "AI Summary",
                            "url": "",
                            "content": data["answer"],
                            "score": 1.0
                        })

                    # Add search results
                    for item in data.get("results", []):
                        results.append({
                            "title": item.get("title", ""),
                            "url": item.get("url", ""),
                            "content": item.get("content", ""),
                            "score": item.get("score", 0.5)
                        })

                    logger.info(f"Tavily search returned {len(results)} results for: {query}")
                    return results[:max_results]

        except Exception as e:
            logger.error(f"Tavily search failed: {e}")
            return await self._search_duckduckgo(query, max_results)

    async def _search_duckduckgo(
        self,
        query: str,
        max_results: int
    ) -> List[Dict[str, str]]:
        """Search using DuckDuckGo Instant Answer API with retry logic."""
        max_retries = 3
        base_delay = 1.0

        for attempt in range(max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    params = {
                        "q": query,
                        "format": "json",
                        "no_html": 1,
                        "skip_disambig": 1
                    }

                    async with session.get(
                        "https://api.duckduckgo.com/",
                        params=params
                    ) as response:
                        if response.status == 202:
                            # 202 means accepted but processing, wait and retry
                            if attempt < max_retries - 1:
                                delay = base_delay * (2 ** attempt)
                                logger.warning(f"DuckDuckGo 202 Accepted. Retrying in {delay}s...")
                                await asyncio.sleep(delay)
                                continue
                            else:
                                logger.error("DuckDuckGo timed out after retries.")
                                return self._fallback_results(query)

                        if response.status != 200:
                            logger.error(f"DuckDuckGo API error: {response.status}")
                            return self._fallback_results(query)

                        data = await response.json()
                        results = []

                        # Add abstract if available
                        if data.get("Abstract"):
                            results.append({
                                "title": data.get("Heading", "Summary"),
                                "url": data.get("AbstractURL", ""),
                                "content": data["Abstract"],
                                "score": 0.9
                            })

                        # Add related topics
                        for topic in data.get("RelatedTopics", [])[:max_results - 1]:
                            if isinstance(topic, dict) and topic.get("Text"):
                                results.append({
                                    "title": topic.get("Text", "")[:100],
                                    "url": topic.get("FirstURL", ""),
                                    "content": topic.get("Text", ""),
                                    "score": 0.7
                                })

                        if results:
                            logger.info(f"DuckDuckGo search returned {len(results)} results for: {query}")
                            return results[:max_results]
                        else:
                            # If no results, try one more time if not last attempt
                            if attempt < max_retries - 1:
                                continue
                            return self._fallback_results(query)

            except Exception as e:
                logger.error(f"DuckDuckGo search failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                return self._fallback_results(query)

        return self._fallback_results(query)

    def _fallback_results(self, query: str) -> List[Dict[str, str]]:
        """Fallback results when all search methods fail."""
        return [{
            "title": "Search Unavailable",
            "url": "",
            "content": f"I couldn't search the web for '{query}' at the moment. Please try again later or check your internet connection.",
            "score": 0.0
        }]

    async def get_answer(
        self,
        query: str,
        context_results: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Generate a comprehensive answer using search results and OpenRouter LLM.

        Args:
            query: User's question
            context_results: Pre-fetched search results (optional)

        Returns:
            AI-generated answer based on sources
        """
        try:
            if not context_results:
                context_results = await self.search_web(query, max_results=5)

            if not context_results or (
                    len(context_results) == 1 and context_results[0]["title"] == "Search Unavailable"):
                return "I couldn't find any information about that. Please try rephrasing your question or check your internet connection."

            # Prepare context from search results
            context_text = ""
            for i, result in enumerate(context_results, 1):
                context_text += f"Source [{i}]: {result['title']}\nURL: {result['url']}\nContent: {result['content']}\n\n"

            # Construct prompt for Grok
            messages = [
                {
                    "role": "system",
                    "content": "You are Grokipedia, an advanced AI knowledge engine powered by xAI's Grok 4.1. Your goal is to generate a high-quality, Wikipedia-style article based on the provided search results.\n\nGuidelines:\n1. **Structure**: Use Markdown headers (##, ###) to organize the content logically (e.g., Early Life, Career, Impact).\n2. **Tone**: Maintain a neutral, encyclopedic, and professional tone.\n3. **Accuracy**: Stick strictly to the provided search results. Do not hallucinate information not present in the sources.\n4. **Citations**: Cite your sources inline using [1], [2], etc., corresponding to the provided source numbers.\n5. **Formatting**: Use bolding for key terms and lists where appropriate for readability."
                },
                {
                    "role": "user",
                    "content": f"Topic: {query}\n\nSearch Results:\n{context_text}\n\nPlease write a detailed Grokipedia article about '{query}' based ONLY on the above search results."
                }
            ]

            # Get provider and generate answer
            from ..providers import get_provider
            provider = get_provider()

            # Use x-ai/grok-4.1-fast as requested
            model = "x-ai/grok-4.1-fast"

            response = await provider.chat_completion(
                messages=messages,
                model=model,
                temperature=0.3,  # Low temperature for factual accuracy
                max_tokens=1500  # Increased for fuller articles
            )

            return response["response"]

        except Exception as e:
            logger.error(f"Grokipedia answer generation failed: {e}")
            # Fallback to simple formatting if LLM fails
            return self._fallback_format_answer(context_results)

    def _fallback_format_answer(self, context_results: List[Dict[str, str]]) -> str:
        """Fallback formatting if LLM fails."""
        if not context_results:
            return "No results found."

        answer_parts = ["**Search Results (AI generation unavailable):**\n"]
        for i, result in enumerate(context_results, 1):
            if result["title"] != "AI Summary" and result["content"]:
                answer_parts.append(f"{i}. **{result['title']}**")
                if result["url"]:
                    answer_parts.append(f"   {result['url']}")
                answer_parts.append(f"   {result['content'][:200]}...\n")

        return "\n".join(answer_parts)


# Global instance
web_search_service = WebSearchService()
