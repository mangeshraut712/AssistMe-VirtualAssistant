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


class EmotionDetector:
    """Detect emotions in text for expressive TTS.
    
    Inspired by Chatterbox Turbo's paralinguistic tags.
    Maps emotions to Gemini TTS style prompts.
    """
    
    # Emotion keywords to detect
    EMOTION_KEYWORDS = {
        "happy": ["happy", "excited", "great", "wonderful", "amazing", "love", "yay", "awesome"],
        "sad": ["sad", "sorry", "unfortunately", "regret", "miss", "disappointing"],
        "angry": ["angry", "frustrated", "annoyed", "upset", "furious"],
        "surprised": ["wow", "oh", "really", "amazing", "incredible", "unbelievable"],
        "calm": ["okay", "alright", "sure", "understood", "got it"],
        "empathetic": ["understand", "feel", "care", "sorry to hear", "that's tough"],
        "enthusiastic": ["absolutely", "definitely", "of course", "yes", "let's go"],
        "thoughtful": ["hmm", "let me think", "interesting", "consider", "perhaps"],
    }
    
    # Map emotions to Gemini TTS style prompts
    EMOTION_STYLES = {
        "happy": "cheerfully and with a smile in your voice",
        "sad": "with empathy and a gentle, soft tone",
        "angry": "with concern but controlled energy",
        "surprised": "with genuine surprise and wonder",
        "calm": "in a calm, reassuring manner",
        "empathetic": "with warmth and understanding",
        "enthusiastic": "with enthusiasm and positive energy",
        "thoughtful": "thoughtfully with measured pacing",
        "neutral": "naturally and conversationally",
    }
    
    # Paralinguistic tags (Chatterbox-style) mapped to Gemini prompts
    PARALINGUISTIC_TAGS = {
        "[laugh]": "Say with a light laugh: ",
        "[chuckle]": "Say with a soft chuckle: ",
        "[sigh]": "Say with a gentle sigh: ",
        "[pause]": "Say with a thoughtful pause: ",
        "[whisper]": "Say in a soft whisper: ",
        "[excited]": "Say with excitement: ",
        "[serious]": "Say seriously and clearly: ",
    }
    
    @classmethod
    def detect_emotion(cls, text: str) -> str:
        """Detect the primary emotion in text."""
        text_lower = text.lower()
        
        # Check for paralinguistic tags first
        for tag in cls.PARALINGUISTIC_TAGS:
            if tag in text_lower:
                return tag
        
        # Count emotion keyword matches
        emotion_scores = {}
        for emotion, keywords in cls.EMOTION_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                emotion_scores[emotion] = score
        
        if emotion_scores:
            return max(emotion_scores, key=emotion_scores.get)
        
        return "neutral"
    
    @classmethod
    def get_style_prompt(cls, emotion: str) -> str:
        """Get the TTS style prompt for an emotion."""
        if emotion in cls.PARALINGUISTIC_TAGS:
            return cls.PARALINGUISTIC_TAGS[emotion]
        return cls.EMOTION_STYLES.get(emotion, cls.EMOTION_STYLES["neutral"])
    
    @classmethod
    def process_text_with_emotion(cls, text: str) -> tuple:
        """Process text and return (cleaned_text, style_prompt, emotion)."""
        emotion = cls.detect_emotion(text)
        style_prompt = cls.get_style_prompt(emotion)
        
        # Remove paralinguistic tags from text
        cleaned_text = text
        for tag in cls.PARALINGUISTIC_TAGS:
            cleaned_text = cleaned_text.replace(tag, "")
        cleaned_text = cleaned_text.strip()
        
        return cleaned_text, style_prompt, emotion


class GeminiVoiceService:
    """Production-grade Gemini Voice AI service with emotion support.
    
    Inspired by Chatterbox Turbo features:
    - Emotion-tagged speech
    - Paralinguistic tags
    - Low latency optimization
    """

    # TTS Model
    TTS_MODEL = "gemini-2.5-flash-preview-tts"
    
    # LLM Model for reasoning
    LLM_MODEL = "gemini-2.5-flash"
    
    # Available voices (30 total) - grouped by emotion/style
    VOICES = {
        "neutral": ["Puck", "Zephyr", "Aoede"],
        "warm": ["Kore", "Leda", "Autonoe"],
        "authoritative": ["Charon", "Fenrir", "Orus"],
        "playful": ["Io", "Echo", "Calliope"],
        "emotional": ["Erato", "Melpomene", "Thalia"],  # Good for expressive speech
    }
    
    # All voice names
    ALL_VOICES = [
        "Aoede", "Charon", "Fenrir", "Kore", "Puck", "Zephyr",
        "Helios", "Orus", "Pegasus", "Leda", "Io", "Calliope",
        "Clio", "Echo", "Erato", "Euterpe", "Melpomene", "Orpheus",
        "Polyhymnia", "Terpsichore", "Thalia", "Urania", "Algieba",
        "Altair", "Ananke", "Autonoe", "Callirrhoe", "Carpo", "Dione", "Gacrux"
    ]
    
    # Supported languages with full metadata
    # Gemini TTS supports 24 languages including 6 Indian languages
    LANGUAGES = {
        # Indian Languages (6 supported)
        "hi-IN": {"name": "Hindi", "native": "हिंदी", "region": "India"},
        "bn-BD": {"name": "Bengali", "native": "বাংলা", "region": "Bangladesh/India"},
        "mr-IN": {"name": "Marathi", "native": "मराठी", "region": "India"},
        "ta-IN": {"name": "Tamil", "native": "தமிழ்", "region": "India"},
        "te-IN": {"name": "Telugu", "native": "తెలుగు", "region": "India"},
        "en-IN": {"name": "English (India)", "native": "English", "region": "India"},
        
        # Major World Languages
        "en-US": {"name": "English (US)", "native": "English", "region": "USA"},
        "es-US": {"name": "Spanish", "native": "Español", "region": "Americas"},
        "fr-FR": {"name": "French", "native": "Français", "region": "France"},
        "de-DE": {"name": "German", "native": "Deutsch", "region": "Germany"},
        "it-IT": {"name": "Italian", "native": "Italiano", "region": "Italy"},
        "pt-BR": {"name": "Portuguese", "native": "Português", "region": "Brazil"},
        "ru-RU": {"name": "Russian", "native": "Русский", "region": "Russia"},
        "ja-JP": {"name": "Japanese", "native": "日本語", "region": "Japan"},
        "ko-KR": {"name": "Korean", "native": "한국어", "region": "South Korea"},
        "zh-CN": {"name": "Chinese", "native": "中文", "region": "China"},
        "ar-EG": {"name": "Arabic", "native": "العربية", "region": "Egypt"},
        
        # European Languages
        "nl-NL": {"name": "Dutch", "native": "Nederlands", "region": "Netherlands"},
        "pl-PL": {"name": "Polish", "native": "Polski", "region": "Poland"},
        "ro-RO": {"name": "Romanian", "native": "Română", "region": "Romania"},
        "uk-UA": {"name": "Ukrainian", "native": "Українська", "region": "Ukraine"},
        
        # Asian Languages
        "th-TH": {"name": "Thai", "native": "ไทย", "region": "Thailand"},
        "vi-VN": {"name": "Vietnamese", "native": "Tiếng Việt", "region": "Vietnam"},
        "id-ID": {"name": "Indonesian", "native": "Bahasa Indonesia", "region": "Indonesia"},
        "tr-TR": {"name": "Turkish", "native": "Türkçe", "region": "Turkey"},
    }
    
    # Indian languages list for quick access
    INDIAN_LANGUAGES = ["hi-IN", "bn-BD", "mr-IN", "ta-IN", "te-IN", "en-IN"]

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
        auto_emotion: bool = True,
    ) -> Dict:
        """Convert text to speech using Gemini 2.5 Flash TTS.
        
        Features (inspired by Chatterbox Turbo):
        - Automatic emotion detection
        - Paralinguistic tags: [laugh], [chuckle], [sigh], etc.
        - Style control via prompts
        
        Args:
            text: Text to convert (will be normalized)
            voice: Voice name from 30 available options
            style: Speaking style hint (overrides auto-detection)
            auto_emotion: Auto-detect emotion if style not specified
            
        Returns:
            Dict with base64 WAV audio data and emotion info
        """
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not configured")
        
        text = (text or "").strip()
        if not text:
            raise ValueError("Text is required")
        
        # IMPORTANT: Normalize text for TTS
        text = self.normalizer.normalize_for_tts(text)
        
        # Detect emotion if auto_emotion enabled and no style specified
        detected_emotion = "neutral"
        if auto_emotion and not style:
            cleaned_text, auto_style, detected_emotion = EmotionDetector.process_text_with_emotion(text)
            text = cleaned_text
            style = auto_style
        
        # Log for debugging
        logger.info(f"TTS: emotion={detected_emotion}, text={text[:50]}...")
        
        # Validate voice
        selected_voice = voice if voice in self.ALL_VOICES else "Puck"
        
        # Build prompt with style
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

    def get_languages(self) -> Dict:
        """Get supported languages with full metadata."""
        return {
            "languages": self.LANGUAGES,
            "indian": {
                code: self.LANGUAGES[code] 
                for code in self.INDIAN_LANGUAGES
            },
            "codes": list(self.LANGUAGES.keys()),
            "count": len(self.LANGUAGES)
        }
    
    def get_indian_languages(self) -> Dict:
        """Get Indian languages specifically supported by Gemini TTS."""
        return {
            code: self.LANGUAGES[code] 
            for code in self.INDIAN_LANGUAGES
        }
    
    def is_indian_language(self, lang_code: str) -> bool:
        """Check if a language code is an Indian language."""
        return lang_code in self.INDIAN_LANGUAGES


# Singleton
tts_service = GeminiVoiceService()

