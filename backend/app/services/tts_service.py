"""
Text-to-Speech Service with Gemini 2.5 Flash TTS Native Audio

Uses the official Gemini TTS model for natural, emotive speech.
Model: gemini-2.5-flash-tts (for pure TTS)
       gemini-2.5-flash-preview-tts (for conversational)

Features:
- 30 HD voices with emotional intelligence
- Natural accents and prosody
- Context-aware pacing
- 24 languages supported
- Style control via prompts
"""

import asyncio
import base64
import logging
import os
from typing import Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class TTSService:
    """Advanced TTS with Gemini 2.5 Flash Native Audio."""

    # Available Gemini TTS voices - natural HD voices
    VOICES = [
        "Zephyr",   # Bright, calm
        "Puck",     # Lively, playful  
        "Charon",   # Deep, authoritative
        "Kore",     # Warm, friendly
        "Fenrir",   # Strong, confident
        "Aoede",    # Melodic, expressive
        "Leda",     # Gentle, soothing
        "Orus",     # Rich, resonant
        "Pegasus",  # Enthusiastic, dynamic
    ]
    
    # Language support
    LANGUAGES = [
        "en-US", "en-GB", "en-AU", "en-IN",
        "es-ES", "es-MX", "fr-FR", "de-DE", 
        "it-IT", "pt-BR", "ja-JP", "ko-KR",
        "zh-CN", "zh-TW", "hi-IN", "ar-XA",
        "ru-RU", "pl-PL", "nl-NL", "sv-SE",
        "da-DK", "fi-FI", "no-NO", "tr-TR"
    ]

    def __init__(self):
        self.google_api_key = os.getenv("GOOGLE_API_KEY", "").strip()
        
        if not self.google_api_key:
            logger.warning("GOOGLE_API_KEY not set - TTS will use fallback")

    async def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        language: str = "en-US",
        style: Optional[str] = None,  # e.g., "cheerful", "calm", "professional"
        speed: float = 1.0,
    ) -> Dict[str, str]:
        """Generate natural speech using Gemini 2.5 Flash TTS.
        
        Args:
            text: The text to speak
            voice: Voice name (Zephyr, Puck, Charon, etc.)
            language: Language code (en-US, es-ES, etc.)
            style: Speaking style (cheerful, calm, professional, etc.)
            speed: Speaking rate (0.5 to 2.0)
            
        Returns:
            Dict with audio (base64), format, provider, voice
        """
        text = (text or "").strip()
        if not text:
            raise ValueError("Text is required for TTS")

        # Use Gemini TTS if API key available
        if self.google_api_key:
            try:
                return await self._synthesize_gemini_tts(text, voice, language, style, speed)
            except Exception as e:
                logger.warning(f"Gemini TTS failed: {e}, trying fallback")
        
        # Fallback to gTTS
        return await self._synthesize_gtts(text, language, speed)

    async def _synthesize_gemini_tts(
        self,
        text: str,
        voice: Optional[str],
        language: str,
        style: Optional[str],
        speed: float,
    ) -> Dict[str, str]:
        """Use Gemini 2.5 Flash TTS for premium natural audio."""
        
        # Select voice
        selected_voice = voice if voice in self.VOICES else "Puck"
        
        # Build the prompt for style control
        style_instruction = ""
        if style:
            style_map = {
                "cheerful": "Speak in a cheerful, upbeat tone with enthusiasm.",
                "calm": "Speak in a calm, soothing, relaxed manner.",
                "professional": "Speak in a clear, professional, business-like tone.",
                "excited": "Speak with excitement and energy!",
                "whisper": "Speak in a soft whisper.",
                "storytelling": "Speak as if telling an engaging story to listeners.",
                "news": "Speak like a professional news anchor.",
            }
            style_instruction = style_map.get(style, f"Speak in a {style} style.")
        
        # Gemini TTS API endpoint
        # Using the generateContent with audio output
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={self.google_api_key}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"{style_instruction}\n\n{text}" if style_instruction else text
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {
                            "voiceName": selected_voice
                        }
                    }
                }
            }
        }

        headers = {
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"Gemini TTS API error {response.status_code}: {error_text}")
                raise Exception(f"Gemini TTS API error: {response.status_code}")
            
            data = response.json()
            
            # Extract audio from response
            if "candidates" in data and len(data["candidates"]) > 0:
                candidate = data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    for part in candidate["content"]["parts"]:
                        if "inlineData" in part:
                            audio_data = part["inlineData"]
                            return {
                                "audio": audio_data["data"],
                                "format": audio_data.get("mimeType", "audio/mp3").split("/")[-1],
                                "provider": "gemini-2.5-flash-tts",
                                "voice": selected_voice,
                                "language": language
                            }
            
            logger.error(f"No audio in Gemini response: {data}")
            raise Exception("No audio data in Gemini TTS response")

    async def _synthesize_gtts(
        self, text: str, language: str, speed: float
    ) -> Dict[str, str]:
        """Fallback TTS using gTTS (basic quality)."""
        try:
            from gtts import gTTS
        except ImportError:
            raise RuntimeError("gTTS not installed. Install: pip install gtts")

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
            "provider": "gtts-fallback",
            "voice": "default",
            "language": language
        }

    def get_available_voices(self) -> list:
        """Return list of available voices."""
        return self.VOICES.copy()
    
    def get_supported_languages(self) -> list:
        """Return list of supported languages."""
        return self.LANGUAGES.copy()


# Singleton instance
tts_service = TTSService()
