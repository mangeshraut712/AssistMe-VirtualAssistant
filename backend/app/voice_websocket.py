"""
Real-time voice WebSocket handler for STT/TTS processing
Implements WebSocket connections for audio streaming and voice interaction
"""
import asyncio
import json
import logging
import uuid
from typing import Dict, Optional, Any
from datetime import datetime, timedelta

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

logger = logging.getLogger(__name__)

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

async def mock_stt_processing(audio_data: bytes, session_id: str) -> Dict[str, Any]:
    """
    Mock STT processing for testing
    Returns pre-canned responses based on session context
    """
    # Simple mock logic - alternate responses for testing
    mock_responses = [
        {
            "transcript": "What's the weather like in Pune?",
            "confidence": 0.95,
            "final": True,
            "timestamp": datetime.utcnow().isoformat()
        },
        {
            "transcript": "Show me a map of Pimpri Chinchwad",
            "confidence": 0.92,
            "final": True,
            "timestamp": datetime.utcnow().isoformat()
        },
        {
            "transcript": "Tell me about your capabilities",
            "confidence": 0.88,
            "final": True,
            "timestamp": datetime.utcnow().isoformat()
        }
    ]

    # Cycle through responses based on session ID hash for consistency
    response_index = hash(session_id) % len(mock_responses)
    await asyncio.sleep(0.5)  # Simulate processing delay

    return mock_responses[response_index]

async def mock_llm_response(transcript: str) -> Dict[str, Any]:
    """Mock LLM responses with rich content for testing"""
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

    # Ensure Redis is ready (best-effort)
    await voice_manager.initialize_redis()

    # Create voice session
    session = await voice_manager.create_session(websocket)

    try:
        # Send welcome message
        welcome_msg = {
            "type": "welcome",
            "session_id": session.session_id,
            "message": "Voice session started. Ready for audio streaming."
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

    # Simple mock processing - in real implementation, this would stream to STT API
    # For now, simulate processing every 10 chunks
    if len(session.audio_buffer) >= 10:
        try:
            # Process accumulated audio with mock STT
            stt_result = await mock_stt_processing(b''.join(session.audio_buffer), session.session_id)

            if stt_result.get("final", False):
                # Get LLM response with rich content
                llm_response = await mock_llm_response(stt_result["transcript"])

                # Send combined response
                response = {
                    "type": "voice_response",
                    "session_id": session.session_id,
                    "transcript": stt_result,
                    "response": llm_response,
                    "timestamp": datetime.utcnow().isoformat()
                }

                await websocket.send_json(response)

                # Clear buffer for next utterance
                session.audio_buffer = []
            else:
                # Send interim transcript if available
                if stt_result.get("transcript"):
                    await websocket.send_json({
                        "type": "interim_transcript",
                        "session_id": session.session_id,
                        "transcript": stt_result["transcript"],
                        "confidence": stt_result.get("confidence", 0.0)
                    })

        except Exception as e:
            logger.error(f"Error processing audio chunk: {e}")
            await websocket.send_json({
                "type": "error",
                "error": "audio_processing_failed",
                "message": str(e)
            })
