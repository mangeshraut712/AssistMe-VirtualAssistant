"""
Gemini TTS Service - Direct Google AI API

Uses Gemini 2.5 Flash TTS for natural, expressive speech generation.
Model: gemini-2.5-flash-preview-tts

Features:
- 30 HD voices with emotional intelligence
- 24 languages supported
- Style control via prompts
- WAV audio output (24kHz, 16-bit PCM)

API Reference: https://ai.google.dev/gemini-api/docs/speech-generation
"""

import asyncio
import base64
import logging
import os
from typing import Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class GeminiTTSService:
    """Direct Gemini 2.5 TTS API integration."""

    # TTS Model
    TTS_MODEL = "gemini-2.5-flash-preview-tts"
    
    # Native Audio Model (for conversational AI)
    NATIVE_AUDIO_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
    
    # Available voices (30 total)
    VOICES = [
        "Aoede", "Charon", "Fenrir", "Kore", "Puck",
        "Zephyr", "Helios", "Orus", "Pegasus", "Leda",
        "Io", "Calliope", "Clio", "Echo", "Erato",
        "Euterpe", "Melpomene", "Orpheus", "Polyhymnia", "Terpsichore",
        "Thalia", "Urania", "Algieba", "Altair", "Ananke",
        "Autonoe", "Callirrhoe", "Carpo", "Dione", "Gacrux"
    ]
    
    # Voice styles
    VOICE_STYLES = {
        "Puck": {"style": "Lively, playful", "gender": "neutral"},
        "Charon": {"style": "Deep, authoritative", "gender": "male"},
        "Kore": {"style": "Warm, friendly", "gender": "female"},
        "Fenrir": {"style": "Strong, confident", "gender": "male"},
        "Aoede": {"style": "Melodic, expressive", "gender": "female"},
        "Zephyr": {"style": "Bright, calm", "gender": "neutral"},
    }
    
    # Supported languages
    LANGUAGES = [
        "ar-EG", "de-DE", "en-US", "es-US", "fr-FR", "hi-IN",
        "id-ID", "it-IT", "ja-JP", "ko-KR", "pt-BR", "ru-RU",
        "nl-NL", "pl-PL", "th-TH", "tr-TR", "vi-VN", "ro-RO",
        "uk-UA", "bn-BD", "en-IN", "mr-IN", "ta-IN", "te-IN"
    ]

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY", "").strip()
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        
        if not self.api_key:
            logger.warning("GOOGLE_API_KEY not set - Gemini TTS will not work")

    async def text_to_speech(
        self,
        text: str,
        voice: str = "Puck",
        style: Optional[str] = None,
    ) -> Dict:
        """Convert text to speech audio.
        
        Args:
            text: Text to convert to speech
            voice: Voice name (Puck, Kore, Charon, etc.)
            style: Speaking style hint (cheerful, calm, etc.)
            
        Returns:
            Dict with base64 audio data
        """
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not configured")
        
        text = (text or "").strip()
        if not text:
            raise ValueError("Text is required")
        
        # Validate voice
        selected_voice = voice if voice in self.VOICES else "Puck"
        
        # Add style prefix if specified
        if style:
            prompt_text = f"Say {style}: {text}"
        else:
            prompt_text = text
        
        url = f"{self.base_url}/models/{self.TTS_MODEL}:generateContent?key={self.api_key}"
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt_text}]
            }],
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
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            
            if response.status_code != 200:
                error = response.text
                logger.error(f"Gemini TTS error {response.status_code}: {error}")
                raise Exception(f"TTS API error: {response.status_code}")
            
            data = response.json()
            
            # Extract audio
            if "candidates" in data and data["candidates"]:
                candidate = data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    for part in candidate["content"]["parts"]:
                        if "inlineData" in part:
                            return {
                                "audio": part["inlineData"]["data"],
                                "mimeType": part["inlineData"].get("mimeType", "audio/L16;rate=24000"),
                                "voice": selected_voice,
                                "provider": "gemini-2.5-flash-tts"
                            }
            
            raise Exception("No audio in response")

    async def generate_conversation_response(
        self,
        user_message: str,
        conversation_history: list = None,
        voice: str = "Puck",
        language: str = "en-US",
    ) -> Dict:
        """Generate AI response and convert to speech.
        
        This combines chat generation with TTS for voice conversations.
        
        Args:
            user_message: User's spoken message
            conversation_history: Previous turns
            voice: Voice to use
            language: Language code
            
        Returns:
            Dict with text response and audio
        """
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not configured")
        
        # Step 1: Generate text response using Gemini
        text_response = await self._generate_text_response(
            user_message, conversation_history, language
        )
        
        # Step 2: Convert response to speech
        tts_result = await self.text_to_speech(
            text_response,
            voice=voice,
            style="naturally and warmly"
        )
        
        return {
            "response": text_response,
            "audio": tts_result["audio"],
            "mimeType": tts_result["mimeType"],
            "voice": voice,
            "language": language,
            "provider": "gemini-native"
        }

    async def _generate_text_response(
        self,
        user_message: str,
        conversation_history: list = None,
        language: str = "en-US",
    ) -> str:
        """Generate a voice-optimized text response."""
        
        system_prompt = f"""You are AssistMe, a helpful AI assistant in a voice conversation.

Language: {language}

Guidelines:
1. Keep responses concise (2-3 sentences ideal for voice)
2. Be warm, friendly, and conversational
3. Avoid markdown, lists, or code blocks
4. Spell out numbers and abbreviations
5. Use natural speech patterns

Remember: Your response will be spoken aloud."""

        messages = [{"role": "user", "parts": [{"text": system_prompt}]}]
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-6:]:
                role = "user" if msg.get("role") == "user" else "model"
                messages.append({
                    "role": role,
                    "parts": [{"text": msg.get("content", "")}]
                })
        
        # Add current message
        messages.append({"role": "user", "parts": [{"text": user_message}]})
        
        url = f"{self.base_url}/models/gemini-2.5-flash:generateContent?key={self.api_key}"
        
        payload = {
            "contents": messages,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 200,  # Keep short for voice
            }
        }
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Chat API error: {response.status_code}")
            
            data = response.json()
            
            if "candidates" in data and data["candidates"]:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            
            raise Exception("No response generated")

    def get_voices(self) -> list:
        """Get available voices with styles."""
        return [
            {"name": name, **style}
            for name, style in self.VOICE_STYLES.items()
        ]

    def get_languages(self) -> list:
        """Get supported languages."""
        return self.LANGUAGES.copy()


# Singleton
tts_service = GeminiTTSService()
