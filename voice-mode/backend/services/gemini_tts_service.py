"""
Gemini Native Audio TTS Service
Premium text-to-speech using Gemini 2.5 Flash with 30 HD voices

NO BROWSER FALLBACK - Pure Gemini Native Audio only
"""

import asyncio
import base64
import logging
import os
from typing import Dict, Optional

import httpx

# Import voice config
import sys
from pathlib import Path
config_path = Path(__file__).parent.parent / "config"
sys.path.insert(0, str(config_path))
from voices_config import (
    VOICE_MODELS,
    GEMINI_VOICES,
    VOICE_PROFILES,
    TTS_CONFIG,
    get_voice_for_language,
    get_language_bcp47,
)

logger = logging.getLogger(__name__)


class GeminiTTSService:
    """
    Premium TTS Service powered exclusively by Gemini 2.5 Flash Native Audio.
    
    Features:
    - 30 HD voices with emotional intelligence
    - Natural accents and prosody
    - Context-aware pacing
    - 24 languages supported
    - 48kHz, 128kbps MP3 output
    
    NO browser SpeechSynthesis fallback - Gemini only.
    """

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY", "").strip()
        if not self.api_key:
            logger.warning(
                "GOOGLE_API_KEY not set. Gemini Native Audio will not function."
            )
        
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.model = "gemini-2.5-flash"  # Native audio model
        
    async def synthesize(
        self,
        text: str,
        language: str = "en-US",
        voice: Optional[str] = None,
        speed: float = 1.05,
        enable_emotions: bool = True,
    ) -> Dict[str, str]:
        """
        Generate premium speech audio using Gemini Native Audio.
        
        Args:
            text: Text to convert to speech
            language: BCP 47 language code (e.g., 'en-US', 'hi-IN')
            voice: Voice name (Aoede, Charon, Fenrir, Kore, Puck)
            speed: Speech rate (0.5-2.0, default 1.05)
            enable_emotions: Enable emotional intelligence
            
        Returns:
            Dict with audio (base64), format, provider, voice, language
            
        Raises:
            ValueError: If text is empty or API key missing
            Exception: If Gemini API fails
        """
        text = (text or "").strip()
        if not text:
            raise ValueError("Text is required for TTS")
        
        if not self.api_key:
            raise ValueError(
                "GOOGLE_API_KEY not configured. Set environment variable to use Gemini TTS."
            )
        
        # Parse language code
        lang_code = language.split("-")[0]  # en-US -> en
        bcp47_lang = get_language_bcp47(lang_code)
        
        # Select voice
        selected_voice = get_voice_for_language(lang_code, voice)
        
        # Validate voice exists
        if selected_voice not in VOICE_PROFILES:
            logger.warning(f"Unknown voice '{selected_voice}', defaulting to Aoede")
            selected_voice = "Aoede"
        
        logger.info(
            f"Synthesizing with Gemini: voice={selected_voice}, "
            f"lang={bcp47_lang}, speed={speed}"
        )
        
        # Build API request
        url = f"{self.base_url}/models/{self.model}:generateContent"
        
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }
        
        # Enhanced prompt for emotional intelligence
        if enable_emotions:
            enhanced_text = (
                f"Speak this text naturally with appropriate emotion, "
                f"tone, and pacing. Use proper emphasis and natural pauses: {text}"
            )
        else:
            enhanced_text = text
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": enhanced_text}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": TTS_CONFIG["temperature"],
                "topP": TTS_CONFIG["top_p"],
                "topK": TTS_CONFIG["top_k"],
                "maxOutputTokens": TTS_CONFIG["max_output_tokens"],
                "responseMimeType": "audio/mp3",
                "speechConfig": {
                    "voiceConfig": {
                        "voiceName": selected_voice,
                        "languageCode": bcp47_lang,
                    },
                    "audioEncoding": TTS_CONFIG["audio_encoding"],
                    "speakingRate": speed,
                    "pitch": 0.0,  # Natural pitch
                    "volumeGainDb": 0.0,  # Natural volume
                    "effectsProfileId": [TTS_CONFIG["effects_profile"]],
                    "enableEmotions": enable_emotions,
                    "enableContextAwarePacing": TTS_CONFIG[
                        "enable_context_aware_pacing"
                    ],
                },
            },
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code != 200:
                    error_detail = response.text
                    logger.error(
                        f"Gemini API error {response.status_code}: {error_detail}"
                    )
                    raise Exception(
                        f"Gemini TTS failed: HTTP {response.status_code}"
                    )
                
                data = response.json()
                
                # Extract audio from response
                audio_b64 = self._extract_audio(data)
                
                if not audio_b64:
                    raise Exception("No audio data in Gemini response")
                
                return {
                    "audio": audio_b64,
                    "format": "mp3",
                    "provider": "gemini-native-audio",
                    "voice": selected_voice,
                    "language": bcp47_lang,
                    "voice_profile": VOICE_PROFILES[selected_voice],
                }
                
        except httpx.TimeoutException:
            logger.error("Gemini API timeout")
            raise Exception("TTS request timed out")
        except Exception as e:
            logger.error(f"Gemini TTS error: {e}")
            raise
    
    def _extract_audio(self, response_data: dict) -> Optional[str]:
        """Extract base64 audio from Gemini API response."""
        try:
            if "candidates" in response_data and len(response_data["candidates"]) > 0:
                candidate = response_data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    for part in candidate["content"]["parts"]:
                        if "inlineData" in part:
                            return part["inlineData"]["data"]
        except Exception as e:
            logger.error(f"Failed to extract audio: {e}")
        return None
    
    def get_available_voices(self, language: str = "en") -> list:
        """Get list of available voices for a language."""
        lang_code = language.split("-")[0]
        lang_config = GEMINI_VOICES.get(lang_code, GEMINI_VOICES["en"])
        return lang_config["voices"]
    
    def get_voice_info(self, voice_name: str) -> Optional[dict]:
        """Get detailed information about a voice."""
        return VOICE_PROFILES.get(voice_name)
    
    def get_supported_languages(self) -> list:
        """Get list of all supported languages."""
        return [
            {
                "code": code,
                "name": config["name"],
                "voices": config["voices"],
                "default_voice": config["default"],
            }
            for code, config in GEMINI_VOICES.items()
        ]


# Singleton instance
gemini_tts_service = GeminiTTSService()
