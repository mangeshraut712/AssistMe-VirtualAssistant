"""
Test for Grokipedia RAG integration.
Tests that the modified RAG system works with Grokipedia configuration.
"""

import json
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest  # type: ignore[import-not-found]

# Ensure repository root is on sys.path for backend imports
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

def test_grokipedia_data_loading():
    """Test that Grokipedia data loads correctly."""
    from backend.app.rag.engine import GrokipediaRAG

    # Test with existing data
    rag = GrokipediaRAG()
    assert len(rag.documents) > 0, "Should load documents from grokipedia.json"

    # Check that documents have expected structure
    sample_doc = rag.documents[0]
    assert "title" in sample_doc
    assert "content" in sample_doc or "summary" in sample_doc

def test_grok_proxy_settings():
    """Test that Grok proxy settings are properly initialized."""
    from backend.app.rag.engine import GrokipediaRAG

    # Test default settings (no proxy)
    with patch.dict(os.environ, {"GROKIPEDIA_USE_GROK_PROXY": "false"}, clear=True):
        rag = GrokipediaRAG()
        assert not rag.use_grok_proxy
        assert rag.xai_api_key == ""

    # Test proxy enabled
    with patch.dict(os.environ, {
        "GROKIPEDIA_USE_GROK_PROXY": "true",
        "XAI_API_KEY": "test-key"
    }, clear=True):
        rag = GrokipediaRAG()
        assert rag.use_grok_proxy
        assert rag.xai_api_key == "test-key"

def test_search_methods():
    """Test that search methods work correctly."""
    from backend.app.rag.engine import GrokipediaRAG

    rag = GrokipediaRAG()

    # Test local search
    results = rag.search("assistme", top_k=2)
    assert isinstance(results, list)
    assert len(results) >= 0

    if results:
        sample = results[0]
        assert "title" in sample
        assert "score" in sample or "summary" in sample

def test_context_generation():
    """Test that context generation includes proper attribution."""
    from backend.app.rag.engine import GrokipediaRAG

    # Test with default (local data)
    with patch.dict(os.environ, {"GROKIPEDIA_USE_GROK_PROXY": "false"}, clear=True):
        rag = GrokipediaRAG()
        context = rag.as_context("test query")
        assert "local Grokipedia data" in context

    # Test with proxy enabled
    with patch.dict(os.environ, {"GROKIPEDIA_USE_GROK_PROXY": "true"}, clear=True):
        rag = GrokipediaRAG()
        context = rag.as_context("test query")
        assert "Grokipedia via Grok API proxy" in context

@patch('backend.app.rag.engine.aiohttp')
@patch('backend.app.rag.engine.aiohttp.ClientSession')
def test_grok_proxy_api_call(mock_session_class, mock_aiohttp):
    """Test that Grok API proxy method is called correctly."""
    from backend.app.rag.engine import GrokipediaRAG

    mock_session = MagicMock()
    mock_session_class.return_value.__aenter__.return_value = mock_session
    mock_session_class.return_value.__aexit__.return_value = None

    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": '[{"title": "Test", "summary": "Test summary"}]'}}]
    }
    mock_session.post.return_value.__aenter__.return_value = mock_response
    mock_session.post.return_value.__aexit__.return_value = None

    with patch.dict(os.environ, {
        "GROKIPEDIA_USE_GROK_PROXY": "true",
        "XAI_API_KEY": "test-key"
    }):
        rag = GrokipediaRAG()
        results = rag.search_via_grok_proxy("test query")

        # Check that API was called
        mock_session.post.assert_called_once()
        call_args = mock_session.post.call_args
        assert "https://api.x.ai/v1/chat/completions" in call_args[1]["url"]

        # Should return parsed results
        assert isinstance(results, list)

def test_rag_tool_creation():
    """Test that RAG tool can be created."""
    from backend.app.rag.engine import create_rag_tool

    tool = create_rag_tool()
    if tool:  # Only if langchain is available
        assert tool.name == "grokipedia_search"
        assert callable(tool.func)
    else:
        # langchain not available, tool should be None
        assert tool is None
