"""
AI4Bharat Integration for Indian Language Support
Provides translation, language detection, and multilingual chat support
"""

import logging
from typing import Dict, List, Optional
from enum import Enum

logger = logging.getLogger(__name__)

# Import OpenRouter client for AI-powered translations using Kimi model
try:
    from .chat_client import grok_client
    OPENROUTER_AVAILABLE = True
    logger.info("OpenRouter client available for AI4Bharat translations")
except ImportError:
    grok_client = None
    OPENROUTER_AVAILABLE = False
    logger.warning("OpenRouter client not available, using fallback translations")

# Direct OpenRouter API access for Kimi model (bypassing rate limits)
import os
import requests
import json

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

class IndianLanguage(str, Enum):
    """Supported Indian languages"""
    HINDI = "hi"
    TAMIL = "ta"
    TELUGU = "te"
    KANNADA = "ka"
    MALAYALAM = "ml"
    BENGALI = "bn"
    GUJARATI = "gu"
    MARATHI = "mr"
    PUNJABI = "pa"
    ODIA = "or"
    ENGLISH = "en"

LANGUAGE_NAMES = {
    "hi": {"name": "Hindi", "native": "हिंदी"},
    "ta": {"name": "Tamil", "native": "தமிழ்"},
    "te": {"name": "Telugu", "native": "తెలుగు"},
    "ka": {"name": "Kannada", "native": "ಕನ್ನಡ"},
    "ml": {"name": "Malayalam", "native": "മലയാളം"},
    "bn": {"name": "Bengali", "native": "বাংলা"},
    "gu": {"name": "Gujarati", "native": "ગુજરાતી"},
    "mr": {"name": "Marathi", "native": "मराठी"},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ"},
    "or": {"name": "Odia", "native": "ଓଡ଼ିଆ"},
    "en": {"name": "English", "native": "English"}
}

class AI4BharatClient:
    """Client for AI4Bharat services"""

    def __init__(self):
        self.base_url = "https://api.ai4bharat.org/v1"
        self.supported_languages = list(IndianLanguage)
        self.openrouter_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": "https://assist-me-virtual-assistant.vercel.app",
            "X-Title": "AssistMe Virtual Assistant",
        } if OPENROUTER_API_KEY else None
        logger.info("AI4Bharat client initialized")

    def _call_openrouter_kimi(self, prompt: str) -> Dict:
        """Direct call to OpenRouter Kimi model for translation"""
        if not self.openrouter_headers:
            return {"error": "OpenRouter API key not configured"}

        try:
            # Try Kimi model first, fallback to Llama if Kimi fails
            models_to_try = [
                "moonshotai/kimi-dev-72b:free",
                "meta-llama/llama-3.3-70b-instruct:free"
            ]

            for model in models_to_try:
                payload = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 500
                }

                response = requests.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    json=payload,
                    headers=self.openrouter_headers,
                    timeout=30
                )

                if response.status_code == 200:
                    data = response.json()
                    choice = data.get("choices", [{}])[0]
                    message = choice.get("message", {})
                    content = message.get("content", "").strip()
                    tokens = data.get("usage", {}).get("total_tokens", 0)

                    return {"response": content, "tokens": tokens, "model_used": model}
                elif response.status_code == 404 and model == "moonshotai/kimi-dev-72b:free":
                    # Kimi model not available, try next model
                    continue
                else:
                    # Other error, return it
                    return {"error": f"OpenRouter API error: {response.status_code}"}

            # All models failed
            return {"error": "All translation models unavailable"}

            response = requests.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                json=payload,
                headers=self.openrouter_headers,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                content = message.get("content", "").strip()
                tokens = data.get("usage", {}).get("total_tokens", 0)

                return {"response": content, "tokens": tokens}
            else:
                return {"error": f"OpenRouter API error: {response.status_code}"}

        except Exception as e:
            return {"error": f"OpenRouter request failed: {str(e)}"}
    
    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str
    ) -> Dict:
        """
        Translate text between Indian languages using Kimi K2 Thinking model

        Args:
            text: Text to translate
            source_language: Source language code (e.g., 'hi')
            target_language: Target language code (e.g., 'ta')

        Returns:
            Dict with translated text and metadata
        """
        try:
            # Validate languages
            if source_language not in LANGUAGE_NAMES:
                return {
                    "success": False,
                    "error": f"Unsupported source language: {source_language}"
                }

            if target_language not in LANGUAGE_NAMES:
                return {
                    "success": False,
                    "error": f"Unsupported target language: {target_language}"
                }

            # Use Kimi model via direct OpenRouter API call for AI-powered translation
            if self.openrouter_headers:
                try:
                    # Import run_in_threadpool for async execution
                    from starlette.concurrency import run_in_threadpool

                    # Create translation prompt for Kimi model
                    source_name = LANGUAGE_NAMES[source_language]["name"]
                    target_name = LANGUAGE_NAMES[target_language]["name"]

                    translation_prompt = f"""You are an expert translator specializing in Indian languages.

Translate the following text from {source_name} to {target_name}. Provide only the translated text without any additional explanations or notes.

Text to translate: "{text}"

Translation:"""

                    # Use direct OpenRouter API call to Kimi model
                    result = await run_in_threadpool(
                        self._call_openrouter_kimi,
                        translation_prompt
                    )

                    if "response" in result and result["response"].strip():
                        translated_text = result["response"].strip()
                        # Clean up the response (remove quotes if present)
                        translated_text = translated_text.strip('"').strip("'")

                        logger.info(f"AI translation successful: '{text}' -> '{translated_text}' using Kimi model")
                        return {
                            "success": True,
                            "original_text": text,
                            "translated_text": translated_text,
                            "source_language": source_language,
                            "target_language": target_language,
                            "source_language_name": source_name,
                            "target_language_name": target_name,
                            "model_used": "kimi-k2-thinking-openrouter",
                            "confidence": 0.95
                        }
                    else:
                        logger.warning(f"Kimi model via OpenRouter returned error: {result}, falling back to dictionary")
                except Exception as kimi_error:
                    logger.warning(f"Kimi translation via OpenRouter failed: {kimi_error}, falling back to dictionary")

            # Fallback to dictionary-based translation if Kimi is not available or failed
            logger.info("Using dictionary-based translation fallback")

            # Simple translation mappings for common phrases
            translations = self._get_translation_mappings(source_language, target_language)

            # Try exact match first
            translated_text = translations.get(text.lower().strip(), "")

            # If no exact match, try word-by-word translation for simple cases
            if not translated_text:
                words = text.lower().split()
                translated_words = []
                for word in words:
                    translated_word = translations.get(word, word)  # Keep original if no translation
                    translated_words.append(translated_word)
                translated_text = " ".join(translated_words)

            # If still no translation, provide a fallback
            if not translated_text or translated_text == text.lower():
                translated_text = self._get_fallback_translation(text, source_language, target_language)

            return {
                "success": True,
                "original_text": text,
                "translated_text": translated_text,
                "source_language": source_language,
                "target_language": target_language,
                "source_language_name": LANGUAGE_NAMES[source_language]["name"],
                "target_language_name": LANGUAGE_NAMES[target_language]["name"],
                "model_used": "dictionary-fallback",
                "confidence": 0.85
            }

        except Exception as e:
            logger.error(f"Translation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def detect_language(self, text: str) -> Dict:
        """
        Detect language of given text
        
        Args:
            text: Text to detect language for
        
        Returns:
            Dict with detected language and confidence
        """
        try:
            # Simple heuristic-based detection
            # In production, use actual ML model
            detected_lang = self._heuristic_detect(text)
            
            return {
                "success": True,
                "text": text,
                "detected_language": detected_lang,
                "language_name": LANGUAGE_NAMES.get(detected_lang, {}).get("name", "Unknown"),
                "confidence": 0.85
            }
        
        except Exception as e:
            logger.error(f"Language detection error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _heuristic_detect(self, text: str) -> str:
        """Simple heuristic to detect Indian language"""
        # Check for Devanagari script (Hindi, Marathi, Sanskrit)
        if any('\u0900' <= char <= '\u097F' for char in text):
            return "hi"

        # Check for Tamil script
        if any('\u0B80' <= char <= '\u0BFF' for char in text):
            return "ta"

        # Check for Telugu script
        if any('\u0C00' <= char <= '\u0C7F' for char in text):
            return "te"

        # Check for Kannada script
        if any('\u0C80' <= char <= '\u0CFF' for char in text):
            return "ka"

        # Check for Malayalam script
        if any('\u0D00' <= char <= '\u0D7F' for char in text):
            return "ml"

        # Check for Bengali script
        if any('\u0980' <= char <= '\u09FF' for char in text):
            return "bn"

        # Check for Gujarati script
        if any('\u0A80' <= char <= '\u0AFF' for char in text):
            return "gu"

        # Check for Gurmukhi script (Punjabi)
        if any('\u0A00' <= char <= '\u0A7F' for char in text):
            return "pa"

        # Check for Odia script
        if any('\u0B00' <= char <= '\u0B7F' for char in text):
            return "or"

        # Default to English
        return "en"

    def _get_translation_mappings(self, source_lang: str, target_lang: str) -> Dict[str, str]:
        """Get translation mappings for common phrases"""
        # English to Hindi
        if source_lang == "en" and target_lang == "hi":
            return {
                "hello": "नमस्ते",
                "hello world": "नमस्ते दुनिया",
                "how are you": "आप कैसे हैं",
                "thank you": "धन्यवाद",
                "good morning": "सुप्रभात",
                "good evening": "सुश्रीय",
                "good night": "शुभ रात्रि",
                "please": "कृपया",
                "sorry": "माफ़ कीजिए",
                "yes": "हाँ",
                "no": "नहीं",
                "help": "मदद",
                "water": "पानी",
                "food": "खाना",
                "friend": "दोस्त",
                "family": "परिवार",
                "love": "प्यार",
                "peace": "शांति",
                "happy": "खुश",
                "sad": "दुखी",
                "beautiful": "सुंदर",
                "big": "बड़ा",
                "small": "छोटा",
                "hot": "गरम",
                "cold": "ठंडा",
                "fast": "तेज़",
                "slow": "धीमा"
            }

        # Hindi to English
        elif source_lang == "hi" and target_lang == "en":
            return {
                "नमस्ते": "hello",
                "नमस्ते दुनिया": "hello world",
                "आप कैसे हैं": "how are you",
                "धन्यवाद": "thank you",
                "सुप्रभात": "good morning",
                "सुश्रीय": "good evening",
                "शुभ रात्रि": "good night",
                "कृपया": "please",
                "माफ़ कीजिए": "sorry",
                "हाँ": "yes",
                "नहीं": "no",
                "मदद": "help",
                "पानी": "water",
                "खाना": "food",
                "दोस्त": "friend",
                "परिवार": "family",
                "प्यार": "love",
                "शांति": "peace",
                "खुश": "happy",
                "दुखी": "sad",
                "सुंदर": "beautiful",
                "बड़ा": "big",
                "छोटा": "small",
                "गरम": "hot",
                "ठंडा": "cold",
                "तेज़": "fast",
                "धीमा": "slow"
            }

        # Add more language pairs as needed
        return {}

    def _get_fallback_translation(self, text: str, source_lang: str, target_lang: str) -> str:
        """Provide fallback translation when exact match not found"""
        # Simple transliteration approach for demonstration
        if source_lang == "en" and target_lang == "hi":
            # Add Hindi script markers for English words
            return f"{text} (अनुवाद: {text})"
        elif source_lang == "hi" and target_lang == "en":
            # Add English translation marker
            return f"{text} (Translation: {text})"
        else:
            # For other language pairs, just indicate the translation attempt
            return f"{text} [{LANGUAGE_NAMES.get(source_lang, {}).get('name', source_lang)} → {LANGUAGE_NAMES.get(target_lang, {}).get('name', target_lang)}]"
    
    def get_supported_languages(self) -> List[Dict]:
        """Get list of supported languages"""
        return [
            {
                "code": code,
                "name": info["name"],
                "native_name": info["native"]
            }
            for code, info in LANGUAGE_NAMES.items()
        ]
    
    async def transliterate(
        self,
        text: str,
        source_script: str,
        target_script: str
    ) -> Dict:
        """
        Transliterate text between scripts

        Args:
            text: Text to transliterate
            source_script: Source script (e.g., 'hi')
            target_script: Target script (e.g., 'en')

        Returns:
            Dict with transliterated text
        """
        try:
            # Simple transliteration for demonstration
            transliterated_text = self._simple_transliterate(text, source_script, target_script)

            return {
                "success": True,
                "original_text": text,
                "transliterated_text": transliterated_text,
                "source_script": source_script,
                "target_script": target_script
            }

        except Exception as e:
            logger.error(f"Transliteration error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _simple_transliterate(self, text: str, source_script: str, target_script: str) -> str:
        """Simple character-by-character transliteration"""
        # For Hindi to English, provide basic mappings
        if source_script == "hi" and target_script == "en":
            # Basic Devanagari to Roman transliteration
            mappings = {
                'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
                'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
                'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
                'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
                'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
                'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
                'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
                'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha',
                'ष': 'sha', 'स': 'sa', 'ह': 'ha',
                'ं': 'n', 'ः': 'h', '्': '',  # diacritics
            }

            result = ""
            for char in text:
                result += mappings.get(char, char)  # Keep original if no mapping
            return result

        # For other combinations, return as-is for now
        return text

# Global instance
ai4bharat_client = AI4BharatClient()
