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
                        elif data.get("Heading"):
                            # For disambiguation pages, use heading as context
                            results.append({
                                "title": data.get("Heading", "Summary"),
                                "url": data.get("AbstractURL", ""),
                                "content": f"Information about {data.get('Heading', 'this topic')}",
                                "score": 0.6
                            })

                        # Add related topics - get more content from each
                        for topic in data.get("RelatedTopics", [])[:max_results]:
                            if isinstance(topic, dict) and topic.get("Text"):
                                # Extract text, removing HTML anchor tags
                                text = topic.get("Text", "")
                                results.append({
                                    "title": text[:80] + "..." if len(text) > 80 else text,
                                    "url": topic.get("FirstURL", ""),
                                    "content": text,
                                    "score": 0.7
                                })
                            # Handle nested topics (categories)
                            elif isinstance(topic, dict) and topic.get("Topics"):
                                for subtopic in topic.get("Topics", [])[:3]:
                                    if subtopic.get("Text"):
                                        text = subtopic.get("Text", "")
                                        results.append({
                                            "title": text[:80] + "..." if len(text) > 80 else text,
                                            "url": subtopic.get("FirstURL", ""),
                                            "content": text,
                                            "score": 0.6
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
        """Fallback results when all search methods fail - use AI's own knowledge."""
        logger.warning(f"Web search unavailable for '{query}'. AI will use its own knowledge.")
        return [{
            "title": "AI Knowledge Base",
            "url": "",
            "content": f"Use your extensive training knowledge to write a comprehensive article about: {query}. Include all factual information you know about this topic.",
            "score": 0.5
        }]

    async def stream_answer(
        self,
        query: str,
        context_results: Optional[List[Dict[str, str]]] = None,
        model: str = "google/gemini-2.5-flash-preview-05-20"
    ):
        """
        Stream a comprehensive Wikipedia-style article using search results.
        Designed to generate deep, insightful, well-researched content.
        """
        try:
            if not context_results:
                context_results = await self.search_web(query, max_results=10)

            # AI Knowledge Base is a valid fallback, so don't return an error
            if not context_results:
                yield "I couldn't find any information about that topic. Please try again later."
                return

            # Build rich context from search results
            context_text = ""
            source_urls = []
            for i, result in enumerate(context_results, 1):
                title = result.get('title', 'Unknown Source')
                url = result.get('url', '')
                content = result.get('content', '')
                context_text += f"[Source {i}] {title}\nURL: {url}\nContent: {content}\n\n"
                if url:
                    source_urls.append(url)

            # Ultra-comprehensive system prompt for deep research articles
            system_prompt = """You are an expert encyclopedia writer with deep knowledge across all subjects. Your mission is to create comprehensive, insightful, and beautifully written articles that truly educate and benefit readers.

## CRITICAL REQUIREMENTS:

### 1. LENGTH & DEPTH (MANDATORY)
- **Minimum 2500-4000 words** - This is NON-NEGOTIABLE
- Every section must have substantial content (200-400 words each)
- No placeholder text or thin paragraphs
- Deep dive into every aspect of the subject

### 2. ARTICLE STRUCTURE

**LEAD SECTION (No heading)**
Write 4-5 substantial paragraphs that provide:
- Complete overview of the subject
- Key significance and global impact
- Timeline of major events/achievements
- Why this topic matters to readers
- Use **bold** for the subject's first mention and critical terms

**## Overview** (400+ words)
- Comprehensive introduction to the subject
- Historical context and background
- Core definition and scope
- Global significance and relevance today

**## Historical Background** (400+ words)
- Origins and early development
- Key milestones and turning points
- Evolution over time
- Important figures and their contributions

**## Core Concepts / Key Features** (500+ words)
- Detailed breakdown of main components
- In-depth analysis of key aspects
- Technical details where relevant
- Real-world applications and examples

**## Development & Evolution** (400+ words)
- Chronological development
- Major phases and transitions
- Innovations and breakthroughs
- Current state and modern developments

**## Impact & Significance** (400+ words)
- Global influence and reach
- Economic, social, or cultural impact
- Statistical data and measurable effects
- Case studies and concrete examples

**## Challenges & Controversies** (300+ words)
- Key debates and disagreements
- Criticisms and limitations
- Ongoing challenges
- Multiple perspectives presented fairly

**## Future Outlook** (300+ words)
- Emerging trends and predictions
- Potential developments
- Expert opinions on future direction
- Opportunities and risks ahead

**## See Also**
- List 6-10 related topics as bullet points
- Each should be a searchable concept

**## References**
- Numbered list of all source URLs
- Format: 1. https://source-url.com/path

### 3. WRITING QUALITY

**Voice & Tone:**
- Authoritative yet accessible
- Engaging and educational
- Professional encyclopedia quality
- Avoid jargon without explanation

**Content Standards:**
- Every claim supported by evidence
- Rich with specific facts, dates, numbers
- Include expert quotes when available
- Balance breadth with depth
- Smooth transitions between sections

**Citations:**
- Use inline citations [1], [2], [3] throughout
- Every paragraph should have 2-4 citations
- Cluster citations for well-sourced facts: [1][3][5]

### 4. READER VALUE
Your article must:
- Teach something new and valuable
- Provide insights not obvious from a quick search
- Connect ideas and show relationships
- Give readers a complete understanding
- Be worth their time to read fully

### 5. ABSOLUTELY AVOID:
- Short, superficial paragraphs
- Generic filler content
- Repeating the same information
- Vague statements without specifics
- Thin sections (every section must be substantial)
- Ending abruptly without proper conclusion"""

            user_prompt = f"""Write a comprehensive, deeply researched encyclopedia article about: **{query}**

CRITICAL: This must be AT LEAST 2500 words with substantial, insightful content in every section.

Use these research sources (cite them as [1], [2], etc.):

{context_text}

SOURCE URLS FOR REFERENCES SECTION:
{chr(10).join(f'{i+1}. {url}' for i, url in enumerate(source_urls) if url)}

REMEMBER:
1. Write AT LEAST 2500-4000 words total
2. Each major section needs 300-500 words minimum
3. Include deep analysis and expert insights
4. Cite sources throughout with [1], [2], [3] format
5. End with ## See Also (bullet list) and ## References (numbered URLs)
6. Make this article truly valuable and educational for readers
7. Polish and refine - don't just output raw information

Generate your comprehensive article now:"""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            from ..providers import get_provider
            provider = get_provider()

            # Models to try in order of preference (Gemini for best Wikipedia-style content)
            models_to_try = [
                model,
                "google/gemini-2.0-flash-exp:free",
                "google/gemini-2.5-pro-exp-03-25:free",
                "meta-llama/llama-4-maverick:free"
            ]

            last_error = None
            for try_model in models_to_try:
                try:
                    logger.info(f"Generating comprehensive article with: {try_model}")
                    stream_generator = await provider.chat_completion_stream(
                        messages=messages,
                        model=try_model,
                        temperature=0.3,  # Lower for more focused, comprehensive output
                        max_tokens=8000   # Allow for 2500-4000 word articles
                    )

                    async for chunk in stream_generator:
                        if hasattr(chunk, 'delta') and chunk.delta:
                            yield chunk.delta

                    # If we get here without error, break the loop
                    return

                except Exception as model_error:
                    last_error = model_error
                    logger.warning(f"Model {try_model} failed: {model_error}. Trying next...")
                    continue

            # All models failed
            if last_error:
                raise last_error

        except Exception as e:
            logger.error(f"Grokipedia streaming failed: {e}")
            yield f"\n\n---\n\n⚠️ **Error generating article:** {str(e)}\n\nPlease try again later."

    def _fallback_format_answer(self, context_results: List[Dict[str, str]]) -> str:
        """Fallback formatting if LLM fails."""
        if not context_results:
            return "No results found."

        answer_parts = ["## Search Results\n\n*AI generation unavailable. Showing raw search results:*\n"]
        for i, result in enumerate(context_results, 1):
            if result["title"] != "AI Summary" and result["content"]:
                answer_parts.append(f"### [{i}] {result['title']}")
                if result["url"]:
                    answer_parts.append(f"*Source: {result['url']}*")
                answer_parts.append(f"\n{result['content']}\n")

        return "\n".join(answer_parts)


# Global instance
web_search_service = WebSearchService()
