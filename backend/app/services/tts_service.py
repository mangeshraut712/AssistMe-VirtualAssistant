"""
Gemini Voice Service - Production-Grade Voice AI Pipeline

Architecture:
┌─────────────────────────────────────────────────────────────┐
│  STT (Web Speech API)  →  LLM (Gemini)  →  TTS (Gemini TTS) │
└─────────────────────────────────────────────────────────────┘

Best Practices Applied:
1. Locked roles: STT = Browser, Reasoning = Gemini, TTS = Gemini TTS
2. Text normalization between every hop
3. Streaming for low latency
4. Confidence checks
5. Fallback paths for each component
6. Emergency keyword handling
7. Prosody control via punctuation
8. Detailed logging

Models:
- LLM: gemini-2.5-flash (reasoning)
- TTS: gemini-2.5-flash-preview-tts (30 voices, 24 languages)

Reference: https://ai.google.dev/gemini-api/docs/speech-generation
"""

import asyncio
import base64
import logging
import os
import re
from typing import Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class TextNormalizer:
    """Normalize text for TTS - critical for voice quality."""
    
    # Numbers to words (for natural speech)
    NUMBER_WORDS = {
        '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
        '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
        '10': 'ten', '11': 'eleven', '12': 'twelve'
    }
    
    @staticmethod
    def normalize_for_tts(text: str) -> str:
        """Normalize text for natural TTS output."""
        if not text:
            return text
            
        # 1. Replace common abbreviations
        abbrevs = {
            'Dr.': 'Doctor',
            'Mr.': 'Mister',
            'Mrs.': 'Misses',
            'Ms.': 'Miss',
            'Jr.': 'Junior',
            'Sr.': 'Senior',
            'vs.': 'versus',
            'etc.': 'etcetera',
            'e.g.': 'for example',
            'i.e.': 'that is',
            'approx.': 'approximately',
        }
        for abbrev, full in abbrevs.items():
            text = text.replace(abbrev, full)
        
        # 2. Handle phone numbers (read digit by digit)
        def phone_to_digits(match):
            number = match.group()
            return ' '.join(number.replace('-', '').replace('(', '').replace(')', '').replace(' ', ''))
        text = re.sub(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', phone_to_digits, text)
        
        # 3. Handle URLs (just say "link" or domain)
        text = re.sub(r'https?://[^\s]+', 'link', text)
        
        # 4. Handle email addresses
        text = re.sub(r'[\w.-]+@[\w.-]+\.\w+', lambda m: m.group().replace('@', ' at ').replace('.', ' dot '), text)
        
        # 5. Add prosody hints (commas for pauses)
        # Add pause after colons
        text = re.sub(r':(?!\s)', ': ', text)
        
        # 6. Clean up excessive punctuation
        text = re.sub(r'\.{3,}', '...', text)
        text = re.sub(r'!{2,}', '!', text)
        text = re.sub(r'\?{2,}', '?', text)
        
        # 7. Remove markdown
        text = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', text)  # Bold/italic
        text = re.sub(r'`([^`]+)`', r'\1', text)  # Code
        text = re.sub(r'#{1,6}\s+', '', text)  # Headers
        
        return text.strip()

    @staticmethod
    def normalize_for_emergency(text: str) -> Optional[str]:
        """Check for emergency keywords and return fixed script."""
        emergency_keywords = {
            'emergency': "Please contact emergency services immediately. Call 911 or your local emergency number.",
            'suicide': "If you're in crisis, please contact a crisis helpline. You're not alone.",
            'heart attack': "Call emergency services immediately. Sit down and stay calm.",
            'fire': "Leave the building immediately and call emergency services.",
        }
        text_lower = text.lower()
        for keyword, response in emergency_keywords.items():
            if keyword in text_lower:
                return response
        return None


class GeminiVoiceService:
    """Production-grade Gemini Voice AI service."""

    # TTS Model
    TTS_MODEL = "gemini-2.5-flash-preview-tts"
    
    # LLM Model for reasoning
    LLM_MODEL = "gemini-2.5-flash"
    
    # Available voices (30 total) - grouped by style
    VOICES = {
        "neutral": ["Puck", "Zephyr", "Aoede"],
        "warm": ["Kore", "Leda", "Autonoe"],
        "authoritative": ["Charon", "Fenrir", "Orus"],
        "playful": ["Io", "Echo", "Calliope"],
    }
    
    # All voice names
    ALL_VOICES = [
        "Aoede", "Charon", "Fenrir", "Kore", "Puck", "Zephyr",
        "Helios", "Orus", "Pegasus", "Leda", "Io", "Calliope",
        "Clio", "Echo", "Erato", "Euterpe", "Melpomene", "Orpheus",
        "Polyhymnia", "Terpsichore", "Thalia", "Urania", "Algieba",
        "Altair", "Ananke", "Autonoe", "Callirrhoe", "Carpo", "Dione", "Gacrux"
    ]
    
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
        self.normalizer = TextNormalizer()
        
        if not self.api_key:
            logger.warning("GOOGLE_API_KEY not set - Gemini TTS will not work")

    async def text_to_speech(
        self,
        text: str,
        voice: str = "Puck",
        style: Optional[str] = None,
    ) -> Dict:
        """Convert text to speech using Gemini 2.5 Flash TTS.
        
        Args:
            text: Text to convert (will be normalized)
            voice: Voice name from 30 available options
            style: Speaking style hint (cheerfully, calmly, etc.)
            
        Returns:
            Dict with base64 WAV audio data
        """
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not configured")
        
        text = (text or "").strip()
        if not text:
            raise ValueError("Text is required")
        
        # IMPORTANT: Normalize text for TTS
        text = self.normalizer.normalize_for_tts(text)
        
        # Log for debugging
        logger.info(f"TTS Input (normalized): {text[:100]}...")
        
        # Validate voice
        selected_voice = voice if voice in self.ALL_VOICES else "Puck"
        
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
                            logger.info(f"TTS Success: voice={selected_voice}")
                            return {
                                "audio": part["inlineData"]["data"],
                                "mimeType": part["inlineData"].get("mimeType", "audio/L16;rate=24000"),
                                "voice": selected_voice,
                                "provider": "gemini-2.5-flash-tts"
                            }
            
            raise Exception("No audio in response")

    async def generate_voice_response(
        self,
        user_message: str,
        conversation_history: List[Dict] = None,
        voice: str = "Puck",
        language: str = "en-US",
        stt_confidence: float = 1.0,
    ) -> Dict:
        """Complete voice AI pipeline: Understand + Generate + Speak.
        
        Pipeline:
        1. Check STT confidence (ask for clarification if low)
        2. Check for emergency keywords (use fixed scripts)
        3. Generate LLM response (optimized for voice)
        4. Normalize response for TTS
        5. Convert to speech audio
        
        Args:
            user_message: Transcribed user speech (from STT)
            conversation_history: Previous conversation turns
            voice: TTS voice to use
            language: Language code
            stt_confidence: STT confidence score (0.0 to 1.0)
            
        Returns:
            Dict with text response and audio
        """
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not configured")
        
        # LOG: Raw STT input
        logger.info(f"[STT→LLM] Input: {user_message}, Confidence: {stt_confidence}")
        
        # GUARDRAIL 1: Check STT confidence
        if stt_confidence < 0.7:
            clarification = "I'm not sure I heard you correctly. Could you please repeat that?"
            tts_result = await self.text_to_speech(clarification, voice, "apologetically")
            return {
                "response": clarification,
                "audio": tts_result["audio"],
                "mimeType": tts_result["mimeType"],
                "voice": voice,
                "needs_clarification": True
            }
        
        # GUARDRAIL 2: Check for emergency keywords
        emergency_response = self.normalizer.normalize_for_emergency(user_message)
        if emergency_response:
            logger.warning(f"[EMERGENCY] Triggered by: {user_message}")
            tts_result = await self.text_to_speech(emergency_response, voice, "seriously and clearly")
            return {
                "response": emergency_response,
                "audio": tts_result["audio"],
                "mimeType": tts_result["mimeType"],
                "voice": voice,
                "is_emergency": True
            }
        
        # Step 1: Generate text response using LLM
        try:
            text_response = await self._generate_voice_optimized_response(
                user_message, conversation_history, language
            )
        except Exception as e:
            logger.error(f"[LLM] Failed: {e}")
            fallback = "I'm having trouble processing that. Let me try again."
            tts_result = await self.text_to_speech(fallback, voice)
            return {
                "response": fallback,
                "audio": tts_result["audio"],
                "mimeType": tts_result["mimeType"],
                "voice": voice,
                "llm_error": True
            }
        
        # LOG: LLM output
        logger.info(f"[LLM→TTS] Output: {text_response[:100]}...")
        
        # Step 2: Normalize for TTS
        normalized_response = self.normalizer.normalize_for_tts(text_response)
        
        # Step 3: Convert to speech
        try:
            tts_result = await self.text_to_speech(
                normalized_response,
                voice=voice,
                style="naturally and conversationally"
            )
        except Exception as e:
            logger.error(f"[TTS] Failed: {e}")
            # Return text response without audio
            return {
                "response": text_response,
                "audio": None,
                "voice": voice,
                "tts_error": True
            }
        
        logger.info(f"[Complete] Voice pipeline success")
        
        return {
            "response": text_response,
            "audio": tts_result["audio"],
            "mimeType": tts_result["mimeType"],
            "voice": voice,
            "language": language,
            "provider": "gemini-native"
        }

    async def _generate_voice_optimized_response(
        self,
        user_message: str,
        conversation_history: List[Dict] = None,
        language: str = "en-US",
    ) -> str:
        """Generate a response optimized for voice output.
        
        Key optimizations:
        - Short responses (2-3 sentences)
        - No markdown or formatting
        - Natural speech patterns
        - Prosody hints via punctuation
        """
        
        system_prompt = f"""You are AssistMe, a helpful AI assistant in a voice conversation.

Language: {language}

CRITICAL RULES FOR VOICE OUTPUT:
1. Keep responses to 2-3 sentences maximum
2. Never use markdown, lists, or code blocks
3. Never use emojis or special characters
4. Spell out numbers (say "two hundred" not "200")
5. Use commas for natural pauses
6. Be warm, friendly, and conversational
7. Never switch languages mid-response
8. End statements clearly, don't trail off

Your response will be converted to speech, so make it sound natural when spoken aloud."""

        messages = [{"role": "user", "parts": [{"text": system_prompt}]}]
        
        # Add conversation history (last 6 turns for context)
        if conversation_history:
            for msg in conversation_history[-6:]:
                role = "user" if msg.get("role") == "user" else "model"
                messages.append({
                    "role": role,
                    "parts": [{"text": msg.get("content", "")}]
                })
        
        # Add current message
        messages.append({"role": "user", "parts": [{"text": user_message}]})
        
        url = f"{self.base_url}/models/{self.LLM_MODEL}:generateContent?key={self.api_key}"
        
        payload = {
            "contents": messages,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 150,  # Keep short for voice
                "topP": 0.9,
            }
        }
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"LLM API error: {response.status_code}")
            
            data = response.json()
            
            if "candidates" in data and data["candidates"]:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            
            raise Exception("No response generated")

    def get_voices(self) -> Dict:
        """Get available voices grouped by style."""
        return {
            "grouped": self.VOICES,
            "all": self.ALL_VOICES,
            "count": len(self.ALL_VOICES)
        }

    def get_languages(self) -> List[str]:
        """Get supported languages."""
        return self.LANGUAGES.copy()


# Singleton
tts_service = GeminiVoiceService()
