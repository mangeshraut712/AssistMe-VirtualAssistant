"""
Text-to-Speech Service via OpenRouter

Uses OpenRouter API with Gemini models for TTS.
The user has added their Google API key in OpenRouter's BYOK integrations,
so we route through OpenRouter just like we do for chat.

Model: google/gemini-2.5-flash (with audio output)
"""

import asyncio
import base64
import logging
import os
from typing import Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class TTSService:
    """TTS Service using OpenRouter with Gemini models."""

    # OpenRouter Gemini models that support audio output
    VOICE_MODELS = [
        "google/gemini-2.5-flash",
        "google/gemini-2.0-flash-001:free",
        "google/gemini-2.5-flash-lite",
    ]

    # Voice configurations for Gemini TTS
    VOICES = {
        "Puck": {"style": "Lively, playful", "gender": "neutral"},
        "Charon": {"style": "Deep, authoritative", "gender": "male"},
        "Kore": {"style": "Warm, friendly", "gender": "female"},
        "Fenrir": {"style": "Strong, confident", "gender": "male"},
        "Aoede": {"style": "Melodic, expressive", "gender": "female"},
    }

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.base_url = os.getenv(
            "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
        ).rstrip("/")
        self.site_url = os.getenv(
            "APP_URL", "https://assist-me-virtual-assistant.vercel.app"
        )
        self.app_name = os.getenv("APP_NAME", "AssistMe Virtual Assistant")

        if not self.api_key:
            logger.warning("OPENROUTER_API_KEY not set - TTS will fail")

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.app_name,
        }

    async def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        language: str = "en-US",
        style: Optional[str] = None,
        speed: float = 1.0,
    ) -> Dict[str, str]:
        """Generate speech using OpenRouter Gemini models.

        Since OpenRouter doesn't directly support audio output modality,
        we use Gemini to generate a natural-sounding response script,
        then the frontend uses Web Speech API for actual audio.

        For TRUE native audio, you'd need direct Gemini API access.
        This method returns text optimized for TTS playback.
        """
        text = (text or "").strip()
        if not text:
            raise ValueError("Text is required for TTS")

        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")

        selected_voice = voice if voice in self.VOICES else "Puck"
        voice_config = self.VOICES[selected_voice]

        # Since OpenRouter doesn't support native audio output,
        # we'll use Gemini to process the text for better TTS
        # and return it for frontend Web Speech API
        try:
            # Process text for natural speaking
            processed_text = await self._process_for_tts(text, selected_voice, style)
            
            # For now, we'll return the text for frontend TTS
            # Until OpenRouter adds audio modality support
            return {
                "text": processed_text,
                "voice": selected_voice,
                "language": language,
                "style": style or voice_config["style"],
                "provider": "openrouter-gemini",
                "use_web_speech": True,  # Signal frontend to use Web Speech API
            }
        except Exception as e:
            logger.error(f"TTS processing failed: {e}")
            # Return original text if processing fails
            return {
                "text": text,
                "voice": selected_voice,
                "language": language,
                "provider": "passthrough",
                "use_web_speech": True,
            }

    async def _process_for_tts(
        self, text: str, voice: str, style: Optional[str]
    ) -> str:
        """Use Gemini to process text for natural TTS delivery."""
        
        voice_config = self.VOICES.get(voice, self.VOICES["Puck"])
        
        # Create a prompt that helps prepare text for TTS
        system_prompt = f"""You are a text formatter for speech synthesis.
Your task is to reformat the given text for natural, {voice_config['style'].lower()} speech delivery.

Rules:
1. Keep the content and meaning exactly the same
2. Add natural pauses using ... where appropriate
3. Spell out numbers and abbreviations
4. Add emphasis markers where natural
5. Keep it concise and conversational
6. Return ONLY the reformatted text, nothing else"""

        if style:
            system_prompt += f"\n7. Apply a {style} speaking style"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]

        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.VOICE_MODELS[0],  # Use primary Gemini model
            "messages": messages,
            "temperature": 0.3,  # Low temperature for consistent output
            "max_tokens": 500,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers=self._headers())
            
            if response.status_code >= 400:
                logger.warning(f"TTS processing API error: {response.status_code}")
                return text  # Return original on error
            
            data = response.json()
            processed = data["choices"][0]["message"]["content"].strip()
            
            # Clean up any quote marks or formatting artifacts
            processed = processed.strip('"\'')
            
            return processed

    async def generate_voice_response(
        self,
        user_message: str,
        conversation_history: list = None,
        model: str = "google/gemini-2.5-flash",
        voice: str = "Puck",
        language: str = "en-US",
    ) -> Dict[str, str]:
        """Generate an AI response optimized for voice output.

        This is the main method for voice conversations.
        Uses OpenRouter Gemini to generate a natural response,
        formatted for TTS playback.
        """
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")

        voice_config = self.VOICES.get(voice, self.VOICES["Puck"])
        
        system_prompt = f"""You are AssistMe, a helpful AI assistant in a voice conversation.

Speaking style: {voice_config['style']}
Language: {language}

Guidelines for voice responses:
1. Keep responses concise and conversational (2-4 sentences ideal)
2. Use natural speech patterns with occasional pauses
3. Avoid complex formatting, lists, or code blocks
4. Spell out numbers, dates, and abbreviations
5. Be warm, friendly, and engaging
6. End with a natural conversational flow

Remember: This will be spoken aloud, so make it sound natural when read."""

        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history[-10:])  # Keep last 10 turns
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})

        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 300,  # Keep responses short for voice
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=self._headers())
            
            if response.status_code >= 400:
                error_text = response.text
                logger.error(f"Voice API error {response.status_code}: {error_text}")
                raise Exception(f"OpenRouter API error: {response.status_code}")
            
            data = response.json()
            ai_response = data["choices"][0]["message"]["content"].strip()
            
            return {
                "response": ai_response,
                "voice": voice,
                "language": language,
                "provider": "openrouter-gemini",
                "model": data.get("model", model),
                "tokens": data.get("usage", {}).get("total_tokens", 0),
                "use_web_speech": True,
            }

    def get_available_voices(self) -> list:
        """Return list of available voices."""
        return [
            {"id": name, **config}
            for name, config in self.VOICES.items()
        ]

    def get_supported_languages(self) -> list:
        """Return list of supported languages for Web Speech API."""
        return [
            "en-US", "en-GB", "en-AU", "en-IN",
            "es-ES", "es-MX", "fr-FR", "de-DE",
            "it-IT", "pt-BR", "ja-JP", "ko-KR",
            "zh-CN", "zh-TW", "hi-IN", "ar-XA",
            "ru-RU", "nl-NL", "sv-SE", "pl-PL",
        ]


# Singleton instance
tts_service = TTSService()
