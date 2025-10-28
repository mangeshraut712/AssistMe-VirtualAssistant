#!/usr/bin/env python3
"""
Rebuild FAISS index for Grokipedia data.
This script rebuilds the vector embeddings and FAISS index from the current grokipedia.json file.
"""

import os
import sys
import json
import time
from pathlib import Path

# Add repository root to path for backend imports
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

def rebuild_faiss_index():
    """Rebuild the FAISS index from the current Grokipedia data."""
    print("🔄 Rebuilding Grokipedia FAISS Index...")

    try:
        from backend.app.rag.engine import GrokipediaRAG

        # Get data path from environment or default
        data_path = os.getenv("GROKIPEDIA_DATA_PATH", "data/grokipedia.json")

        print(f"📂 Loading data from: {data_path}")

        if not Path(data_path).exists():
            print(f"❌ Data file not found: {data_path}")
            print("Run './scripts/fetch_grokipedia_sample.py' first to create sample data.")
            return False

        # Force fresh initialization
        rag = GrokipediaRAG(data_path=data_path)

        print(f"📄 Loaded {len(rag.documents)} documents")

        if len(rag.documents) == 0:
            print("⚠️  No documents found in data file")
            return False

        # Build the index (this will trigger embedding and FAISS construction)
        start_time = time.time()
        print("🔍 Building embeddings and FAISS index...")

        # Force index build by accessing it
        if hasattr(rag, '_build_index'):
            rag._build_index()

        end_time = time.time()

        # Check if index was built
        if rag._index is not None:
            print("✅ FAISS index built successfully")
            print(f"📊 Index contains {rag._index.ntotal} vectors")
            print(f"⏱️  Build time: {end_time - start_time:.2f}s")
        else:
            print("⚠️  Using keyword search fallback (embeddings not available)")

        print("✅ Index rebuild complete")
        return True

    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure backend dependencies are installed")
        return False
    except Exception as e:
        print(f"❌ Rebuild failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main entry point."""
    print("🚀 Grokipedia FAISS Index Rebuild Tool")
    print("=" * 50)

    success = rebuild_faiss_index()

    if success:
        print("\n🎉 Index rebuild completed successfully!")
        print("You can now use Grokipedia search with improved performance.")
    else:
        print("\n❌ Index rebuild failed.")
        print("Check the error messages above and fix any issues.")

    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
