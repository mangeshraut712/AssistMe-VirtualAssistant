"""
Real-time voice WebSocket handler for STT/TTS processing
Implements WebSocket connections for audio streaming and voice interaction
"""
import asyncio
import json
import logging
import os
import uuid
from typing import Dict, Optional, Any
from datetime import datetime, timedelta

try:
    from .utils.minimax import (
        MiniMaxClientError,
        MiniMaxClientNotConfigured,
        encode_audio_to_base64,
        is_minimax_ready,
        synthesize_speech as minimax_synthesize_speech,
        transcribe_audio as minimax_transcribe_audio,
    )
    MINIMAX_VOICE_READY = is_minimax_ready()
    # Use the imported classes directly
    MiniMaxClientErrorImported = MiniMaxClientError  # type: ignore[assignment]
    MiniMaxClientNotConfiguredImported = MiniMaxClientNotConfigured  # type: ignore[assignment]
except Exception as exc:  # pragma: no cover - optional dependency
    logging.warning("MiniMax voice features unavailable: %s", exc)

    class MiniMaxClientErrorImported(RuntimeError):  # type: ignore[no-redef]
        """Fallback error used when MiniMax voice helpers are unavailable."""

    class MiniMaxClientNotConfiguredImported(RuntimeError):  # type: ignore[no-redef]
        """Fallback configuration error used when MiniMax voice helpers are unavailable."""

    minimax_synthesize_speech = None  # type: ignore[assignment]
    minimax_transcribe_audio = None  # type: ignore[assignment]
    encode_audio_to_base64 = None  # type: ignore[assignment]
    MINIMAX_VOICE_READY = False

VOICE_FEATURE_AVAILABLE = bool(
    MINIMAX_VOICE_READY
    and minimax_transcribe_audio is not None
    and minimax_synthesize_speech is not None
    and encode_audio_to_base64 is not None
)


def _normalise_flag(value: Optional[str]) -> str:
    return (value or "").strip().lower()


_voice_mock_env = _normalise_flag(os.getenv("VOICE_ENABLE_MOCKS", "auto"))
if _voice_mock_env in {"true", "1", "yes", "on"}:
    VOICE_MOCK_ENABLED = True
elif _voice_mock_env in {"false", "0", "no", "off"}:
    VOICE_MOCK_ENABLED = False
else:
    # Auto mode: enable mocks when real voice features are unavailable
    VOICE_MOCK_ENABLED = not VOICE_FEATURE_AVAILABLE

logger = logging.getLogger(__name__)

if not VOICE_FEATURE_AVAILABLE and VOICE_MOCK_ENABLED:
    logger.info("Voice features not configured; enabling mock voice fallback")

VOICE_FEATURE_ACTIVE = VOICE_FEATURE_AVAILABLE or VOICE_MOCK_ENABLED
VOICE_RUNTIME_MODE = "realtime" if VOICE_FEATURE_AVAILABLE else ("mock" if VOICE_MOCK_ENABLED else "off")

try:
    import redis.asyncio as redis  # type: ignore[import-not-found]
except ImportError as exc:  # pragma: no cover
    raise RuntimeError(
        "redis.asyncio is required for voice WebSocket handling. "
        "Install the 'redis' package with asyncio support."
    ) from exc

try:
    from fastapi import WebSocket, WebSocketDisconnect, APIRouter  # type: ignore[import-not-found]
except ImportError as exc:  # pragma: no cover
    raise RuntimeError(
        "FastAPI is required for voice WebSocket handling. "
        "Install the 'fastapi' package to continue."
    ) from exc

try:
    from .settings import get_redis_url
except ImportError as exc:  # pragma: no cover
    raise RuntimeError(
        "Voice WebSocket requires settings helpers. "
        "Ensure backend.app.settings exports 'get_redis_url'."
    ) from exc

router = APIRouter(prefix="/voice", tags=["voice"])

class VoiceSession:
    """Manages voice session state and audio processing"""

    def __init__(self, session_id: str, websocket: WebSocket):
        self.session_id = session_id
        self.websocket = websocket
        self.audio_buffer = []
        self.is_recording = False
        self.voice_enabled = True
        self.created_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.last_partial_transcript: Optional[str] = None

    def update_activity(self):
        self.last_activity = datetime.utcnow()

    def is_expired(self) -> bool:
        """Check if session is older than 30 minutes"""
        return (datetime.utcnow() - self.last_activity) > timedelta(minutes=30)

class VoiceWebsocketManager:
    """Manages WebSocket connections for voice interactions"""

    def __init__(self):
        self.active_sessions: Dict[str, VoiceSession] = {}
        self.redis_client = None
        self.redis_url: Optional[str] = None

    async def initialize_redis(self):
        """Initialize Redis connection for session persistence"""
        if self.redis_client is not None:
            return

        if self.redis_url is None:
            try:
                self.redis_url = get_redis_url()
            except Exception as exc:  # pragma: no cover - defensive logging
                logger.warning("Unable to resolve Redis URL for voice sessions: %s", exc)
                self.redis_url = None

        if not self.redis_url:
            logger.info("Redis URL not configured; voice session persistence disabled")
            return

        try:
            self.redis_client = redis.from_url(self.redis_url)
            await self.redis_client.ping()
            logger.info("Redis connected for voice sessions")
        except Exception as exc:
            logger.warning("Failed to connect to Redis for voice sessions: %s", exc)
            self.redis_client = None

    async def create_session(self, websocket: WebSocket) -> VoiceSession:
        """Create a new voice session"""
        session_id = str(uuid.uuid4())
        session = VoiceSession(session_id, websocket)

        # Store in Redis if available
        if self.redis_client:
            session_data = {
                "session_id": session_id,
                "created_at": session.created_at.isoformat(),
                "voice_enabled": session.voice_enabled,
                "audio_chunks": 0
            }
            await self.redis_client.setex(
                f"voice_session:{session_id}",
                1800,  # 30 minutes
                json.dumps(session_data)
            )

        self.active_sessions[session_id] = session
        logger.info(f"Created voice session: {session_id}")
        return session

    async def get_session(self, session_id: str) -> Optional[VoiceSession]:
        """Get active session by ID"""
        return self.active_sessions.get(session_id)

    async def update_session(self, session_id: str, updates: Dict[str, Any]):
        """Update session metadata in Redis"""
        if self.redis_client:
            session_key = f"voice_session:{session_id}"
            session_data = await self.redis_client.get(session_key)
            if session_data:
                current_data = json.loads(session_data)
                current_data.update(updates)
                await self.redis_client.setex(session_key, 1800, json.dumps(current_data))

    async def end_session(self, session_id: str):
        """Clean up voice session"""
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]

        if self.redis_client:
            await self.redis_client.delete(f"voice_session:{session_id}")

        logger.info(f"Ended voice session: {session_id}")

    async def cleanup_expired_sessions(self):
        """Remove expired sessions periodically"""
        expired = []
        for session_id, session in self.active_sessions.items():
            if session.is_expired():
                expired.append(session_id)

        for session_id in expired:
            await self.end_session(session_id)

        if expired:
            logger.info(f"Cleaned up {len(expired)} expired voice sessions")

# Global voice manager instance
voice_manager = VoiceWebsocketManager()


async def perform_minimax_stt(audio_data: bytes, session_id: str) -> Dict[str, Any]:
    """Run MiniMax STT with graceful fallback to mock behaviour."""
    stt_callable = minimax_transcribe_audio
    if VOICE_FEATURE_AVAILABLE and stt_callable is not None:
        loop = asyncio.get_running_loop()
        try:
            result = await loop.run_in_executor(
                None,
                lambda: stt_callable(audio_data, language=None, audio_format="wav"),
            )
            transcript = (result.get("text") or "").strip()
            if transcript:
                return {
                    "transcript": transcript,
                    "confidence": result.get("confidence") or 0.92,
                    "final": True,
                    "provider": "minimax",
                    "raw": result,
                    "timestamp": datetime.utcnow().isoformat(),
                    "full_transcript": transcript,
                    "progress": 1.0,
                }
        except MiniMaxClientNotConfiguredImported:
            logger.info("MiniMax STT not configured; using mock responses.")
        except MiniMaxClientErrorImported as exc:
            logger.warning("MiniMax STT error: %s", exc)
        except Exception as exc:  # pragma: no cover - defensive log
            logger.exception("Unexpected MiniMax STT failure: %s", exc)

    if VOICE_MOCK_ENABLED:
        return await mock_stt_processing(audio_data, session_id)

    raise MiniMaxClientNotConfiguredImported("Voice transcription not configured")


async def perform_minimax_tts(text: str) -> Optional[str]:
    """Synthesize speech via MiniMax and return base64 audio."""
    tts_callable = minimax_synthesize_speech
    base64_encoder = encode_audio_to_base64
    if not text or not base64_encoder:
        return None
    if VOICE_FEATURE_AVAILABLE and tts_callable is not None:
        loop = asyncio.get_running_loop()
        try:
            audio_bytes = await loop.run_in_executor(
                None,
                lambda: tts_callable(text, audio_format="mp3"),
            )
            return base64_encoder(audio_bytes)
        except MiniMaxClientErrorImported as exc:
            logger.warning("MiniMax TTS error: %s", exc)
        except MiniMaxClientNotConfiguredImported:
            logger.info("MiniMax TTS not configured; skipping audio synthesis.")
        except Exception as exc:  # pragma: no cover - defensive log
            logger.exception("Unexpected MiniMax TTS failure: %s", exc)
    return None

async def mock_stt_processing(audio_data: bytes, session_id: str) -> Dict[str, Any]:
    """
    Mock STT processing for testing
    Returns pre-canned responses based on session context
    """
    if not VOICE_MOCK_ENABLED:
        raise MiniMaxClientNotConfiguredImported("Voice mock processing disabled")
    mock_responses = [
        "What's the weather like in Pune?",
        "Show me a map of Pimpri Chinchwad",
        "Tell me about your capabilities",
    ]
    response_index = hash(session_id) % len(mock_responses)
    full_transcript = mock_responses[response_index]

    # Simulate progressive confidence and partial transcripts based on audio length
    audio_length = max(len(audio_data), 1)
    progress_ratio = min(1.0, audio_length / 16000)  # assume ~1.6s of audio per unit
    min_chars = max(12, int(len(full_transcript) * progress_ratio))
    partial_transcript = full_transcript[:min_chars].rstrip()

    # Avoid cutting words mid-way for intermediate responses
    if progress_ratio < 1.0 and " " in partial_transcript:
        partial_transcript = partial_transcript.rsplit(" ", 1)[0]

    confidence = round(0.6 + (0.35 * progress_ratio), 2)
    await asyncio.sleep(0.15)  # Simulate processing delay

    return {
        "transcript": partial_transcript or full_transcript[:8],
        "confidence": confidence,
        "final": progress_ratio >= 1.0,
        "provider": "mock",
        "timestamp": datetime.utcnow().isoformat(),
        "full_transcript": full_transcript,
        "progress": progress_ratio,
    }

async def generate_live_voice_response(transcript: str, stt_result: Dict[str, Any]) -> Dict[str, Any]:
    """Generate live LLM response using the chat client for ChatGPT/Gemini Live-like experience."""
    try:
        # Import the chat client here to avoid circular imports
        from .chat_client import grok_client

        # Build voice-specific context
        voice_prefix = "🎤 Voice input: This is a spoken conversation. Respond naturally and conversationally, as if in a real dialogue. Keep responses concise but engaging, like ChatGPT or Gemini Live."

        # Create messages list with voice context
        messages = [
            {
                "role": "user",
                "content": f"{voice_prefix}\n\nTranscribed text: {transcript}"
            }
        ]

        # Generate response using the same client as chat
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: grok_client.generate_response(
                messages,
                temperature=0.7,
                max_tokens=1024,
                use_grokipedia=False  # Disable for voice to keep it fast
            )
        )

        if result and "response" in result:
            llm_text = result["response"]
            return {
                "text": llm_text,
                "confidence": 0.95
            }
        else:
            logger.warning("LLM generation failed, falling back to mock")
            return await mock_llm_response(transcript)

    except Exception as e:
        logger.exception(f"Failed to generate live voice response: {e}")
        return await mock_llm_response(transcript)

async def mock_llm_response(transcript: str) -> Dict[str, Any]:
    """Mock LLM responses with rich content for testing when live generation fails"""
    if not VOICE_MOCK_ENABLED:
        raise MiniMaxClientNotConfiguredImported("Voice mock responses disabled")
    text = transcript.lower()

    if "weather" in text and "pune" in text:
        return {
            "text": "Here's the current weather information for Pune.",
            "richContent": {
                "type": "weather",
                "data": {
                    "city": "Pune, Maharashtra",
                    "temperature": "28°C",
                    "condition": "Partly cloudy",
                    "humidity": "65%",
                    "wind_speed": "12 km/h",
                    "forecast": [
                        {"day": "Today", "high": "30°C", "low": "22°C", "condition": "Partly cloudy"},
                        {"day": "Tomorrow", "high": "32°C", "low": "23°C", "condition": "Sunny"}
                    ]
                }
            }
        }
    elif "map" in text and ("pimpri" in text or "chinchwad" in text):
        return {
            "text": "Here's a map of Pimpri-Chinchwad area.",
            "richContent": {
                "type": "map",
                "data": {
                    "location": {"lat": 18.634, "lng": 73.805},
                    "zoom": 12,
                    "markerText": "Pimpri-Chinchwad, Maharashtra",
                    "address": "Pimpri-Chinchwad, Maharashtra 411018, India"
                }
            }
        }
    else:
        return {
            "text": f"I heard you say: '{transcript}'. This is a mock response from the voice system.",
            "confidence": 0.85
        }

@router.websocket("/stream/{client_id}")
async def voice_websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time voice streaming"""
    await websocket.accept()
    logger.info(f"Voice WebSocket connection: {client_id}")

    if not VOICE_FEATURE_ACTIVE:
        await websocket.send_json(
            {
                "type": "error",
                "error": "voice_unavailable",
                "message": "Voice mode is not configured on the server.",
            }
        )
        await websocket.close()
        return

    # Ensure Redis is ready (best-effort)
    await voice_manager.initialize_redis()

    # Create voice session
    session = await voice_manager.create_session(websocket)

    try:
        # Send welcome message
        welcome_msg = {
            "type": "welcome",
            "session_id": session.session_id,
            "voice_available": VOICE_FEATURE_ACTIVE,
            "voice_mode": VOICE_RUNTIME_MODE,
            "message": (
                "Voice session started using real MiniMax voice services."
                if VOICE_FEATURE_AVAILABLE
                else "Voice session started in mock mode. Audio will use canned transcripts."
            ),
        }
        await websocket.send_json(welcome_msg)

        # Keep session alive
        session.update_activity()

        while True:
            try:
                # Set timeout for receiving messages
                data = await asyncio.wait_for(
                    websocket.receive(), timeout=60.0
                )

                session.update_activity()

                if data["type"] == "websocket.receive":
                    message = data.get("text")
                    if message:
                        # Handle text commands
                        try:
                            command = json.loads(message)
                            await handle_voice_command(websocket, session, command)
                        except json.JSONDecodeError:
                            logger.warning("Invalid JSON received")
                            continue

                    elif data.get("bytes"):
                        # Handle binary audio data
                        audio_data = data["bytes"]
                        await process_audio_chunk(websocket, session, audio_data)

                elif data["type"] == "websocket.disconnect":
                    break

            except asyncio.TimeoutError:
                # Send keepalive ping
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break

    except WebSocketDisconnect:
        logger.info(f"Voice WebSocket disconnected: {client_id}")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
    finally:
        # Cleanup session
        await voice_manager.end_session(session.session_id)
        logger.info(f"Voice session cleaned up: {session.session_id}")

async def handle_voice_command(websocket: WebSocket, session: VoiceSession, command: Dict[str, Any]):
    """Handle voice control commands"""
    command_type = command.get("type", "")

    if command_type == "start_recording":
        if session.is_recording:
            return
        session.is_recording = True
        session.audio_buffer = []
        await websocket.send_json({
            "type": "recording_started",
            "session_id": session.session_id,
            "timestamp": datetime.utcnow().isoformat()
        })

    elif command_type == "stop_recording":
        session.is_recording = False
        await websocket.send_json({
            "type": "recording_stopped",
            "session_id": session.session_id,
            "audio_chunks": len(session.audio_buffer)
        })

    elif command_type == "toggle_voice":
        session.voice_enabled = not session.voice_enabled
        await websocket.send_json({
            "type": "voice_toggled",
            "enabled": session.voice_enabled,
            "session_id": session.session_id
        })

    elif command_type == "get_status":
        status = {
            "type": "status",
            "session_id": session.session_id,
            "is_recording": session.is_recording,
            "voice_enabled": session.voice_enabled,
            "created_at": session.created_at.isoformat(),
            "audio_chunks": len(session.audio_buffer)
        }
        await websocket.send_json(status)

async def process_audio_chunk(websocket: WebSocket, session: VoiceSession, audio_data: bytes):
    """Process incoming audio chunk"""
    if not session.is_recording:
        return

    # Buffer audio chunk
    session.audio_buffer.append(audio_data)
    chunk_count = len(session.audio_buffer)

    # Trigger processing on every 4th chunk to provide interim feedback
    if chunk_count < 4:
        return

    try:
        # Double-check websocket is still connected before processing
        if websocket.application_state.value != 1:  # 1 = CONNECTED
            logger.warning(f"WebSocket not connected for session {session.session_id}, skipping processing")
            return

        combined_audio = b"".join(session.audio_buffer)
        stt_result = await perform_minimax_stt(combined_audio, session.session_id)

        # Check again after STT processing (which can take time)
        if websocket.application_state.value != 1:
            logger.warning(f"WebSocket closed during STT processing for session {session.session_id}")
            return

        if stt_result.get("final", False):
            transcript = stt_result.get("full_transcript") or stt_result.get("transcript", "")
            llm_response = await generate_live_voice_response(transcript, stt_result)

            # Check before LLM processing
            if websocket.application_state.value != 1:
                logger.warning(f"WebSocket closed during LLM generation for session {session.session_id}")
                return

            tts_audio = await perform_minimax_tts(llm_response.get("text", ""))

            # Final check before sending response
            if websocket.application_state.value != 1:
                logger.warning(f"WebSocket closed before sending response for session {session.session_id}")
                return

            response = {
                "type": "voice_response",
                "session_id": session.session_id,
                "transcript": stt_result,
                "response": llm_response,
                "ttsAudio": tts_audio,
                "timestamp": datetime.utcnow().isoformat()
            }

            await websocket.send_json(response)
            session.audio_buffer = []
            session.last_partial_transcript = None
        else:
            transcript_text = stt_result.get("transcript")
            if transcript_text and transcript_text != session.last_partial_transcript:
                session.last_partial_transcript = transcript_text

                # Check websocket before sending interim transcript
                if websocket.application_state.value == 1:
                    await websocket.send_json({
                        "type": "interim_transcript",
                        "session_id": session.session_id,
                        "transcript": transcript_text,
                        "confidence": stt_result.get("confidence", 0.0)
                    })
    except MiniMaxClientNotConfiguredImported as exc:
        logger.info("Voice processing skipped: %s", exc)
        if websocket.application_state.value == 1:
            await websocket.send_json(
                {
                    "type": "error",
                    "error": "voice_unconfigured",
                    "message": str(exc),
                }
            )
        session.audio_buffer = []
        session.last_partial_transcript = None
    except Exception as exc:
        logger.error("Error processing audio chunk: %s", exc)
        # Only try to send error message if websocket is still connected
        if websocket.application_state.value == 1:
            try:
                await websocket.send_json({
                    "type": "error",
                    "error": "audio_processing_failed",
                    "message": str(exc)
                })
            except Exception as send_exc:
                logger.error("Failed to send error message: %s", send_exc)
