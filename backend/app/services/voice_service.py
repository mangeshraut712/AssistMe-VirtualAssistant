"""Advanced voice chat service integrating STT, LLM, and TTS."""

import base64
import logging
from typing import Dict, List, Optional

from ..providers import get_provider
from .whisper_service import whisper_service
from .tts_service import tts_service

logger = logging.getLogger(__name__)


class VoiceService:
    """Service for advanced voice chat using Gemini 2.0 Flash."""

    def __init__(self):
        self.provider = get_provider()

    async def process_voice_message(
        self,
        audio_bytes: bytes,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        language: Optional[str] = None,
        voice: Optional[str] = None,
        speed: float = 1.0,
    ) -> Dict:
        """Process voice input and generate voice response.

        Args:
            audio_bytes: Input audio bytes
            conversation_history: Previous conversation messages
            language: Optional language code for transcription
            voice: Optional voice ID for TTS
            speed: Speech speed for TTS

        Returns:
            Dict with transcription, response text, and audio response
        """
        try:
            # Step 1: Transcribe audio to text using Whisper
            logger.info("Transcribing audio input...")
            transcription_result = await whisper_service.transcribe(
                audio_bytes, language=language
            )
            user_text = transcription_result["text"]
            detected_language = transcription_result["language"]

            logger.info(f"Transcribed: {user_text[:100]}... (Language: {detected_language})")

            # Step 2: Prepare messages for LLM
            messages = conversation_history or []
            
            # Add system message for voice chat if not present
            if not any(msg.get("role") == "system" for msg in messages):
                messages.insert(
                    0,
                    {
                        "role": "system",
                        "content": """You are a helpful voice assistant. Provide concise, natural, and conversational responses suitable for voice interaction. Keep your answers brief and to the point, as they will be spoken aloud.""",
                    },
                )

            # Add user message
            messages.append({"role": "user", "content": user_text})

            # Step 3: Get response from Gemini 2.0 Flash
            logger.info("Generating response with Gemini 2.0 Flash...")
            
            # Get voice-optimized model
            if hasattr(self.provider, 'get_voice_optimized_model'):
                model = self.provider.get_voice_optimized_model()
            else:
                model = "google/gemini-2.0-flash-001:free"

            llm_result = await self.provider.chat_completion(
                messages=messages,
                model=model,
                temperature=0.7,
                max_tokens=512,  # Keep responses concise for voice
                stream=False,
            )

            response_text = llm_result["response"]
            logger.info(f"Generated response: {response_text[:100]}...")

            # Step 4: Convert response to speech
            logger.info("Synthesizing speech response...")
            tts_result = await tts_service.synthesize(
                text=response_text,
                voice=voice,
                format="mp3",
                speed=speed,
                language=language or detected_language or "en",
            )

            # Step 5: Return complete result
            return {
                "success": True,
                "transcription": {
                    "text": user_text,
                    "language": detected_language,
                },
                "response": {
                    "text": response_text,
                    "audio": tts_result["audio"],  # base64 encoded
                    "format": tts_result["format"],
                    "model": llm_result.get("model", model),
                    "tokens": llm_result.get("tokens", 0),
                },
            }

        except Exception as e:
            logger.error(f"Voice processing error: {e}")
            raise

    async def process_voice_stream(
        self,
        audio_bytes: bytes,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        language: Optional[str] = None,
    ):
        """Process voice input and stream text response (for faster interaction).

        Args:
            audio_bytes: Input audio bytes
            conversation_history: Previous conversation messages
            language: Optional language code

        Yields:
            Dict chunks with streaming response
        """
        try:
            # Step 1: Transcribe audio
            logger.info("Transcribing audio input...")
            transcription_result = await whisper_service.transcribe(
                audio_bytes, language=language
            )
            user_text = transcription_result["text"]
            detected_language = transcription_result["language"]

            # Yield transcription
            yield {
                "type": "transcription",
                "text": user_text,
                "language": detected_language,
            }

            # Step 2: Prepare messages
            messages = conversation_history or []
            if not any(msg.get("role") == "system" for msg in messages):
                messages.insert(
                    0,
                    {
                        "role": "system",
                        "content": """You are a helpful voice assistant. Provide concise, natural, and conversational responses suitable for voice interaction.""",
                    },
                )
            messages.append({"role": "user", "content": user_text})

            # Step 3: Stream response from LLM
            logger.info("Streaming response from Gemini 2.0 Flash...")
            
            # Get voice-optimized model
            if hasattr(self.provider, 'get_voice_optimized_model'):
                model = self.provider.get_voice_optimized_model()
            else:
                model = "google/gemini-2.0-flash-001:free"

            stream = await self.provider.chat_completion(
                messages=messages,
                model=model,
                temperature=0.7,
                max_tokens=512,
                stream=True,
            )

            # Collect full response for TTS
            full_response = ""
            async for chunk in stream:
                if "content" in chunk:
                    content = chunk["content"]
                    full_response += content
                    yield {"type": "text_chunk", "content": content}
                elif "error" in chunk:
                    yield {"type": "error", "error": chunk["error"]}
                    return

            # Step 4: Generate audio for complete response
            if full_response:
                logger.info("Synthesizing complete response...")
                tts_result = await tts_service.synthesize(
                    text=full_response,
                    format="mp3",
                    speed=1.0,
                    language=language or detected_language or "en",
                )
                yield {
                    "type": "audio",
                    "audio": tts_result["audio"],
                    "format": tts_result["format"],
                }

        except Exception as e:
            logger.error(f"Voice streaming error: {e}")
            yield {"type": "error", "error": str(e)}


# Global instance
voice_service = VoiceService()
