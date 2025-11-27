"""Whisper speech-to-text service."""

import logging
import os
import tempfile
from typing import Any, Dict, Optional

import whisper
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)


class WhisperService:
    """Service for speech-to-text using Whisper."""

    def __init__(self, model_size: str = "base"):
        """Initialize Whisper with specified model size.

        Args:
            model_size: tiny, base, small, medium, large
        """
        self.model_size = model_size
        self.model = None
        self._is_loading = False

    def _load_model(self):
        """Load the model if not already loaded."""
        if self.model:
            return

        if self._is_loading:
            logger.warning("Whisper model is already loading...")
            return

        try:
            self._is_loading = True
            logger.info(f"Loading Whisper model: {self.model_size}...")
            self.model = whisper.load_model(self.model_size)
            logger.info("Whisper model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise
        finally:
            self._is_loading = False

    async def transcribe(
        self,
        audio_file: bytes,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Transcribe audio to text.

        Args:
            audio_file: Audio file bytes
            language: Optional language code (e.g., 'en', 'hi')

        Returns:
            dict with 'text', 'language', 'segments'
        """
        if not self.model:
            await run_in_threadpool(self._load_model)

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_file)
            tmp_path = tmp.name

        try:
            # Run blocking transcribe in threadpool
            def _do_transcribe():
                return self.model.transcribe(
                    tmp_path,
                    language=language,
                    task="transcribe",
                    fp16=False,  # Disable FP16 on CPU to avoid warnings/errors
                )

            result = await run_in_threadpool(_do_transcribe)

            return {
                "text": result["text"].strip(),
                "language": result["language"],
                "segments": result["segments"],
            }
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            raise
        finally:
            # Cleanup
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def detect_language(self, audio_file: bytes) -> str:
        """Detect language from audio.

        Args:
            audio_file: Audio file bytes

        Returns:
            Language code (e.g., 'en', 'hi')
        """
        if not self.model:
            await run_in_threadpool(self._load_model)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_file)
            tmp_path = tmp.name

        try:

            def _do_detect():
                # Load audio and detect language
                import torch
                # Get device from model if available, otherwise use CPU
                device = self.model.device if hasattr(self.model, 'device') else 'cpu'
                if isinstance(device, str) and device == 'cpu':
                    device = torch.device('cpu')
                    
                audio = whisper.load_audio(tmp_path)
                audio = whisper.pad_or_trim(audio)
                mel = whisper.log_mel_spectrogram(audio).to(device)
                _, probs = self.model.detect_language(mel)
                return max(probs, key=probs.get)

            return await run_in_threadpool(_do_detect)
        except Exception as e:
            logger.error(f"Language detection error: {e}")
            raise
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


# Global instance
# We don't initialize it here to avoid loading model on import
whisper_service = WhisperService(model_size=os.getenv("WHISPER_MODEL_SIZE", "base"))
