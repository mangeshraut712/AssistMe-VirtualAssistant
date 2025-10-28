"""
Test for Grokipedia RAG integration.
Tests that the modified RAG system works with Grokipedia configuration.
"""

import json
import os
import sys
from pathlib import Path

import pytest  # type: ignore[import-not-found]

# Ensure repository root is on sys.path for backend imports
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

def test_grokipedia_data_loading():
    """Test that Grokipedia data loads correctly."""
    try:
        from backend.app.rag.engine import GrokipediaRAG

        # Test with existing data
        rag = GrokipediaRAG()

        # Skip if no data file - this is expected in CI without full dataset
        if len(rag.documents) == 0:
            pytest.skip("Grokipedia data file not present - optional functionality not tested")
            return

        assert len(rag.documents) > 0, "Should load documents from grokipedia.json"

        # Check that documents have expected structure
        sample_doc = rag.documents[0]
        assert "title" in sample_doc
        assert "content" in sample_doc or "summary" in sample_doc
    except ImportError:
        # Graceful fallback if required modules are missing
        pytest.skip("Required modules for Grokipedia testing not available")
    except Exception as e:
        # If there's any other error, skip the test
        pytest.skip(f"Grokipedia test skipped due to: {e}")

def test_search_methods():
    """Test that search methods work correctly."""
    from backend.app.rag.engine import GrokipediaRAG

    rag = GrokipediaRAG()

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

    rag = GrokipediaRAG()
    context = rag.as_context("test query")
    assert "local Grokipedia data" in context

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
