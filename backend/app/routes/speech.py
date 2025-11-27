"""Speech-to-text API endpoints."""

from typing import Optional

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)

from ..services.whisper_service import whisper_service

router = APIRouter(prefix="/api/speech", tags=["speech"])


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """Transcribe audio file to text.

    Args:
        file: Audio file (wav, mp3, m4a, etc.)
        language: Optional language code

    Returns:
        Transcription result
    """
    try:
        # Read file
        audio_bytes = await file.read()

        # Transcribe
        result = await whisper_service.transcribe(audio_bytes, language)

        return {
            "success": True,
            "text": result["text"],
            "language": result["language"],
            "segments": result["segments"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/transcribe-stream")
async def transcribe_stream(websocket: WebSocket):
    """WebSocket endpoint for streaming audio transcription.

    Client sends binary audio chunks. Send a text message 'end' to trigger transcription.
    Response: JSON with success/text/language/segments.
    """
    await websocket.accept()
    buffer = bytearray()
    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"] is not None:
                buffer.extend(message["bytes"])
            elif "text" in message:
                text = (message["text"] or "").strip().lower()
                if text == "end":
                    # Transcribe accumulated audio
                    result = await whisper_service.transcribe(
                        bytes(buffer), language=None
                    )
                    await websocket.send_json(
                        {
                            "success": True,
                            "text": result["text"],
                            "language": result["language"],
                            "segments": result["segments"],
                        }
                    )
                    await websocket.close(code=1000)
                    break
                elif text == "ping":
                    await websocket.send_text("pong")
            else:
                # Unknown message type; close gracefully
                await websocket.close(code=1003)
                break
    except WebSocketDisconnect:
        return
    except Exception as e:
        try:
            await websocket.send_json({"success": False, "error": str(e)})
            await websocket.close(code=1011)
        finally:
            return


@router.post("/detect-language")
async def detect_language(file: UploadFile = File(...)):
    """Detect language from audio file.

    Args:
        file: Audio file

    Returns:
        Detected language code
    """
    try:
        audio_bytes = await file.read()
        language = await whisper_service.detect_language(audio_bytes)

        return {
            "success": True,
            "language": language,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages."""
    # This is a subset of Whisper supported languages
    return {
        "success": True,
        "languages": [
            {"code": "en", "name": "English"},
            {"code": "hi", "name": "Hindi"},
            {"code": "ta", "name": "Tamil"},
            {"code": "te", "name": "Telugu"},
            {"code": "mr", "name": "Marathi"},
            {"code": "bn", "name": "Bengali"},
            {"code": "gu", "name": "Gujarati"},
            {"code": "kn", "name": "Kannada"},
            {"code": "ml", "name": "Malayalam"},
            {"code": "pa", "name": "Punjabi"},
            {"code": "ur", "name": "Urdu"},
            {"code": "es", "name": "Spanish"},
            {"code": "fr", "name": "French"},
            {"code": "de", "name": "German"},
            {"code": "zh", "name": "Chinese"},
            {"code": "ja", "name": "Japanese"},
            {"code": "ko", "name": "Korean"},
        ],
    }
