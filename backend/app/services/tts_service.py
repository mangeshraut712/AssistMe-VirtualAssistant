"""
Text-to-Speech Service with Gemini Native Audio Support
Supports:
- Gemini 2.5 Flash Native Audio (30 HD voices, 24 languages, emotional intelligence)
- gTTS fallback for development
"""

import asyncio
import base64
import logging
import os
from typing import Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class TTSService:
    """Advanced TTS with Gemini Native Audio."""

    def __init__(self):
        self.gemini_api_key = os.getenv("GOOGLE_API_KEY", "").strip()
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        
        # Gemini Native Audio voices (samples - there are 30 total)
        self.GEMINI_VOICES = {
            "en": ["Aoede", "Charon", "Fenrir", "Kore", "Puck"],
            "hi": ["Kore", "Puck"],  # Multi-lingual voices
            "es": ["Aoede", "Charon"],
            "fr": ["Fenrir", "Kore"],
            "de": ["Puck", "Aoede"],
            "ja": ["Charon", "Kore"],
            "ko": ["Fenrir", "Puck"],
            "zh": ["Aoede", "Kore"],
        }

    async def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        format: str = "mp3",
        speed: float = 1.0,
        language: str = "en",
    ) -> Dict[str, str]:
        """Generate high-quality speech audio using Gemini Native Audio.
        
        Features:
        - 30 HD voices with emotional intelligence
        - Natural accents and prosody
        - Context-aware pacing
        - 24 languages supported
        """
        text = (text or "").strip()
        if not text:
            raise ValueError("Text is required for TTS")

        # Try Gemini Native Audio first (premium quality)
        if self.gemini_api_key:
            try:
                return await self._synthesize_gemini_native(text, voice, language, speed)
            except Exception as e:
                logger.warning(f"Gemini Native Audio failed: {e}, falling back to gTTS")

        # Fallback to gTTS (basic quality)
        return await self._synthesize_gtts(text, format, speed, language)

    async def _synthesize_gemini_native(
        self, text: str, voice: Optional[str], language: str, speed: float
    ) -> Dict[str, str]:
        """Use Gemini 2.5 Flash Native Audio for premium TTS."""
        
        # Select appropriate voice for language
        lang_code = language.split("-")[0]  # en-US -> en
        available_voices = self.GEMINI_VOICES.get(lang_code, self.GEMINI_VOICES["en"])
        
        if voice and voice in available_voices:
            selected_voice = voice
        else:
            # Use first available voice for this language
            selected_voice = available_voices[0]

        # Gemini Native Audio API endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_api_key}"
        
        # Request with voice configuration
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"Speak this text naturally with emotion and proper accent: {text}"
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.8,  # Natural variation
                "topP": 0.95,
                "topK": 40,
                "maxOutputTokens": 1024,
                "responseMimeType": "audio/mp3",  # Request audio output
                "speechConfig": {
                    "voiceConfig": {
                        "voiceName": selected_voice,
                        "languageCode": language
                    },
                    "audioEncoding": "MP3",
                    "speakingRate": speed,
                    "pitch": 0.0,  # Natural pitch
                    "volumeGainDb": 0.0,  # Natural volume
                    "effectsProfileId": ["headphone-class-device"],  # Optimized for headphones
                }
            }
        }

        headers = {
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code != 200:
                raise Exception(f"Gemini API error: {response.status_code} - {response.text}")
            
            data = response.json()
            
            # Extract audio from response
            # Gemini returns base64 audio in the content
            if "candidates" in data and len(data["candidates"]) > 0:
                candidate = data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    for part in candidate["content"]["parts"]:
                        if "inlineData" in part:
                            audio_b64 = part["inlineData"]["data"]
                            return {
                                "audio": audio_b64,
                                "format": "mp3",
                                "provider": "gemini-native-audio",
                                "voice": selected_voice,
                                "language": language
                            }
            
            raise Exception("No audio data in Gemini response")

    async def _synthesize_gtts(
        self, text: str, format: str, speed: float, language: str
    ) -> Dict[str, str]:
        """Fallback TTS using gTTS (basic quality, requires internet)."""
        try:
            from gtts import gTTS
        except ImportError:
            raise RuntimeError("gTTS is not installed. Install with: pip install gtts")

        # gTTS only supports mp3, speed via slow flag
        slow = speed < 1.0
        lang_code = language.split("-")[0]  # en-US -> en

        def _do_gtts():
            tts = gTTS(text=text, lang=lang_code, slow=slow)
            from io import BytesIO
            buffer = BytesIO()
            tts.write_to_fp(buffer)
            return buffer.getvalue()

        from starlette.concurrency import run_in_threadpool

        try:
            audio_bytes = await asyncio.wait_for(
                run_in_threadpool(_do_gtts), timeout=15.0
            )
        except Exception as e:
            logger.error(f"gTTS failed: {e}")
            raise

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        return {
            "audio": audio_b64,
            "format": "mp3",
            "provider": "gtts",
        }


tts_service = TTSService()
