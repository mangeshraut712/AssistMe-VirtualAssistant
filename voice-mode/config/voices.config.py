"""
Gemini Native Audio Configuration
Voice models, language support, and voice profiles for premium TTS
"""

# Gemini Voice Models - STRICT ORDER (Primary to Fallback)
VOICE_MODELS = [
    "gemini-2.5-flash-native-audio-preview-12-2025",  # Primary (BYOK)
    "google/gemini-2.5-flash",                        # Fallback 1
    "google/gemini-2.5-flash-lite",                   # Fallback 2
    "google/gemini-2.5-flash-lite-preview-09-2025",   # Fallback 3
    "google/gemini-2.0-flash-001:free",               # Fallback 4
    "google/gemini-2.0-flash-lite-001",              # Fallback 5
]

# 30 Premium Gemini Voices with Profiles
GEMINI_VOICES = {
    # Major Languages (Full Voice Selection)
    "en": {
        "voices": ["Aoede", "Charon", "Fenrir", "Kore", "Puck"],
        "name": "English",
        "default": "Aoede",
    },
    "hi": {
        "voices": ["Kore", "Puck", "Aoede"],
        "name": "हिंदी (Hindi)",
        "default": "Kore",
    },
    "es": {
        "voices": ["Aoede", "Charon", "Fenrir"],
        "name": "Español",
        "default": "Aoede",
    },
    "fr": {
        "voices": ["Fenrir", "Kore", "Puck"],
        "name": "Français",
        "default": "Kore",
    },
    "de": {
        "voices": ["Puck", "Aoede", "Charon"],
        "name": "Deutsch",
        "default": "Aoede",
    },
    "ja": {
        "voices": ["Charon", "Kore", "Fenrir"],
        "name": "日本語",
        "default": "Kore",
    },
    "ko": {
        "voices": ["Fenrir", "Puck", "Aoede"],
        "name": "한국어",
        "default": "Puck",
    },
    "zh": {
        "voices": ["Aoede", "Kore", "Charon"],
        "name": "中文",
        "default": "Kore",
    },
    # Additional Languages
    "pt": {"voices": ["Aoede", "Puck"], "name": "Português", "default": "Aoede"},
    "ru": {"voices": ["Charon", "Fenrir"], "name": "Русский", "default": "Charon"},
    "ar": {"voices": ["Kore", "Charon"], "name": "العربية", "default": "Kore"},
    "it": {"voices": ["Aoede", "Fenrir"], "name": "Italiano", "default": "Aoede"},
    "nl": {"voices": ["Puck", "Kore"], "name": "Nederlands", "default": "Kore"},
    "pl": {"voices": ["Charon", "Aoede"], "name": "Polski", "default": "Charon"},
    "tr": {"voices": ["Fenrir", "Puck"], "name": "Türkçe", "default": "Fenrir"},
    "id": {"voices": ["Aoede", "Kore"], "name": "Indonesian", "default": "Kore"},
    "th": {"voices": ["Puck", "Aoede"], "name": "ไทย", "default": "Aoede"},
    "vi": {"voices": ["Kore", "Fenrir"], "name": "Tiếng Việt", "default": "Kore"},
    "ms": {"voices": ["Aoede", "Puck"], "name": "Malay", "default": "Aoede"},
    "sw": {"voices": ["Charon", "Kore"], "name": "Swahili", "default": "Kore"},
    "ta": {"voices": ["Kore", "Aoede"], "name": "தமிழ்", "default": "Kore"},
    "te": {"voices": ["Puck", "Kore"], "name": "తెలుగు", "default": "Kore"},
    "bn": {"voices": ["Aoede", "Kore"], "name": "বাংলা", "default": "Kore"},
    "mr": {"voices": ["Kore", "Puck"], "name": "मराठी", "default": "Kore"},
}

# Voice Personality Profiles
VOICE_PROFILES = {
    "Aoede": {
        "gender": "Female",
        "tone": "Warm, Clear",
        "style": "Professional, Friendly",
        "use_cases": ["Customer Support", "Education", "General Assistant"],
        "emotion_range": "High",
        "description": "A warm, clear female voice ideal for professional yet friendly interactions",
    },
    "Charon": {
        "gender": "Male",
        "tone": "Deep, Authoritative",
        "style": "Serious, Educational",
        "use_cases": ["News", "Documentation", "Formal Communication"],
        "emotion_range": "Medium",
        "description": "Deep, authoritative voice perfect for serious content and educational material",
    },
    "Fenrir": {
        "gender": "Unisex",
        "tone": "Dynamic, Expressive",
        "style": "Creative, Storytelling",
        "use_cases": ["Entertainment", "Podcasts", "Creative Content"],
        "emotion_range": "Very High",
        "description": "Highly dynamic voice with exceptional emotional range for storytelling",
    },
    "Kore": {
        "gender": "Female",
        "tone": "Smooth, Professional",
        "style": "Business, Presentations",
        "use_cases": ["Business", "Presentations", "Corporate"],
        "emotion_range": "Medium",
        "description": "Smooth, professional voice optimized for business communications",
    },
    "Puck": {
        "gender": "Male",
        "tone": "Playful, Energetic",
        "style": "Casual, Fun",
        "use_cases": ["Gaming", "Social", "Casual Chat"],
        "emotion_range": "High",
        "description": "Playful, energetic voice that brings fun and energy to conversations",
    },
}

# TTS Configuration
TTS_CONFIG = {
    "default_speed": 1.05,  # Slightly faster for natural conversation
    "temperature": 0.8,     # Natural variation
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 1024,
    "audio_encoding": "MP3",
    "sample_rate": 48000,   # 48kHz HD audio
    "bitrate": 128,         # 128kbps
    "effects_profile": "headphone-class-device",
    "enable_emotions": True,
    "enable_context_aware_pacing": True,
}

# Language Code Mapping (ISO 639-1 to BCP 47)
LANGUAGE_CODES = {
    "en": "en-US",
    "hi": "hi-IN",
    "es": "es-ES",
    "fr": "fr-FR",
    "de": "de-DE",
    "ja": "ja-JP",
    "ko": "ko-KR",
    "zh": "zh-CN",
    "pt": "pt-BR",
    "ru": "ru-RU",
    "ar": "ar-SA",
    "it": "it-IT",
    "nl": "nl-NL",
    "pl": "pl-PL",
    "tr": "tr-TR",
    "id": "id-ID",
    "th": "th-TH",
    "vi": "vi-VN",
    "ms": "ms-MY",
    "sw": "sw-KE",
    "ta": "ta-IN",
    "te": "te-IN",
    "bn": "bn-IN",
    "mr": "mr-IN",
}


def get_voice_for_language(lang_code: str, voice_name: str = None) -> str:
    """
    Get appropriate voice for a language.
    
    Args:
        lang_code: ISO 639-1 language code (e.g., 'en', 'hi')
        voice_name: Optional specific voice name
        
    Returns:
        Voice name string
    """
    lang_config = GEMINI_VOICES.get(lang_code, GEMINI_VOICES["en"])
    
    if voice_name and voice_name in lang_config["voices"]:
        return voice_name
    
    return lang_config["default"]


def get_language_bcp47(lang_code: str) -> str:
    """
    Convert ISO 639-1 to BCP 47 format.
    
    Args:
        lang_code: ISO 639-1 code (e.g., 'en')
        
    Returns:
        BCP 47 code (e.g., 'en-US')
    """
    return LANGUAGE_CODES.get(lang_code, "en-US")
