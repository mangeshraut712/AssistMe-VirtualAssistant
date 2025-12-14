"""Services package - with optional imports for CI compatibility."""

# These services require heavy ML dependencies
# Import them conditionally to allow CI to pass without faiss/whisper

try:
    from .embedding_service import embedding_service
except ImportError:
    embedding_service = None

try:
    from .whisper_service import whisper_service
except ImportError:
    whisper_service = None

__all__ = ["whisper_service", "embedding_service"]
