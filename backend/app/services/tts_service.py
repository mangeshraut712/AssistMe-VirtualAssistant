"""Text-to-speech service using gTTS (local/dev-friendly)."""

import asyncio
import base64
import logging
from typing import Dict, Optional

try:
    # gTTS is a simple fallback for local/dev; requires network.
    from gtts import gTTS  # type: ignore
except Exception:  # pragma: no cover - optional dep
    gTTS = None

logger = logging.getLogger(__name__)


class TTSService:
    """Provide text-to-speech audio."""

    async def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        format: str = "mp3",
        speed: float = 1.0,
        language: str = "en",
    ) -> Dict[str, str]:
        """Generate speech audio.

        Returns a dict with {audio: <base64>, format: <str>, provider: <str>}
        """
        text = (text or "").strip()
        if not text:
            raise ValueError("Text is required for TTS")

        # Fallback to gTTS for local dev
        if gTTS:
            return await self._synthesize_gtts(text, format, speed, language)

        raise RuntimeError("No TTS provider configured")

    async def _synthesize_gtts(
        self, text: str, format: str, speed: float, language: str
    ) -> Dict[str, str]:
        """Fallback TTS using gTTS (requires internet)."""
        if not gTTS:
            raise RuntimeError("gTTS is not installed")

        # gTTS only supports mp3, speed via slow flag
        slow = speed < 1.0

        def _do_gtts():
            tts = gTTS(text=text, lang=language, slow=slow)
            # Write to temp bytes buffer
            from io import BytesIO

            buffer = BytesIO()
            tts.write_to_fp(buffer)
            return buffer.getvalue()

        from starlette.concurrency import run_in_threadpool

        last_exc = None
        for attempt in range(2):
            try:
                audio_bytes = await asyncio.wait_for(
                    run_in_threadpool(_do_gtts), timeout=15.0
                )
                last_exc = None
                break
            except Exception as exc:
                last_exc = exc
                if attempt < 1:
                    await asyncio.sleep(0.8)
                    continue
                raise

        if last_exc is not None:
            raise last_exc
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        return {
            "audio": audio_b64,
            "format": "mp3",
            "provider": "gtts",
        }


tts_service = TTSService()
