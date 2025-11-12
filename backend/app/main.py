import json
import logging
import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Load environment variables from .env files
try:
    from dotenv import load_dotenv  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - optional in production
    load_dotenv = None  # type: ignore[assignment]

if load_dotenv:
    load_dotenv('.env')            # Load from .env file in current directory
    load_dotenv()                  # Also load from system environment variables

from fastapi import FastAPI, WebSocket, Depends, HTTPException, Request  # type: ignore[import-not-found]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import-not-found]
from fastapi.responses import Response, StreamingResponse, JSONResponse  # type: ignore[import-not-found]
from pydantic import BaseModel  # type: ignore[import-not-found]
from sqlalchemy.orm import Session as SessionType  # type: ignore[import-not-found]
from starlette.concurrency import run_in_threadpool  # type: ignore[import-not-found]

# Import chat client with graceful error handling
try:
    from .chat_client import grok_client
    CHAT_CLIENT_AVAILABLE = True
    logging.info("Successfully imported chat client")
except ImportError as e:
    logging.warning("Chat client import failed: %s. Chat features will be disabled.", e)
    grok_client = None
    CHAT_CLIENT_AVAILABLE = False
except Exception as e:
    logging.error("Chat client error: %s. Features disabled.", e)
    grok_client = None
    CHAT_CLIENT_AVAILABLE = False

from .database import get_db
from .models import Conversation, Message as MessageModel
from .ai4bharat import ai4bharat_client

# Import kimi_client with graceful error handling
try:
    from .kimi_client import kimi_client
    KIMI_CLIENT_AVAILABLE = True
    logging.info("Successfully imported Kimi client")
except ImportError as e:
    logging.warning("Kimi client import failed: %s. Kimi features will be disabled.", e)
    kimi_client = None
    KIMI_CLIENT_AVAILABLE = False
except Exception as e:
    logging.error("Kimi client error: %s. Features disabled.", e)
    kimi_client = None
    KIMI_CLIENT_AVAILABLE = False

def _normalise_origin(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    origin = value.strip().rstrip("/")
    if not origin:
        return None
    if not origin.startswith(("http://", "https://")):
        origin = f"https://{origin}"
    return origin


def _env_configured_origins() -> List[str]:
    configured: List[str] = []
    for env_name in ("APP_URL", "VERCEL_URL"):
        normalised = _normalise_origin(os.getenv(env_name))
        if normalised:
            configured.append(normalised)

    raw_custom = os.getenv("CORS_ALLOW_ORIGINS", "")
    if raw_custom:
        for entry in raw_custom.split(","):
            normalised = _normalise_origin(entry)
            if normalised:
                configured.append(normalised)
    return configured


ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://assist-me-virtual-assistant.vercel.app",
    "https://assistme-virtualassistant-production.up.railway.app",
]

ALLOWED_ORIGINS.extend(_env_configured_origins())
ALLOWED_ORIGINS = sorted({origin for origin in ALLOWED_ORIGINS if origin})
VERCEL_ORIGIN_PATTERN = re.compile(r"https://assist-me-virtual-assistant(-[a-z0-9]+)?\.vercel\.app")

app = FastAPI(title="AssistMe API", version="1.0.0")

# Configure CORS for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://assist-me-virtual-assistant(-[a-z0-9]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
    ],
    expose_headers=["*"],
    max_age=3600,  # 1 hour
)


def _resolve_origin(request: Request) -> str:
    origin = request.headers.get("origin")
    if origin:
        if origin in ALLOWED_ORIGINS or VERCEL_ORIGIN_PATTERN.fullmatch(origin):
            return origin
    return "*"


def _cors_headers(request: Request, methods: Optional[str] = None) -> Dict[str, str]:
    """Build CORS headers that respect the resolved origin."""
    allow_origin = _resolve_origin(request)
    headers = {
        "Access-Control-Allow-Origin": allow_origin,
        "Vary": "Origin",
    }
    if methods:
        headers["Access-Control-Allow-Methods"] = methods
        headers["Access-Control-Max-Age"] = "86400"
        headers["Access-Control-Allow-Headers"] = request.headers.get(
            "Access-Control-Request-Headers", "*"
        )
    if allow_origin != "*":
        headers["Access-Control-Allow-Credentials"] = "true"
    return headers

class ChatMessage(BaseModel):
    role: str
    content: str

class TextChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1024
    conversation_id: Optional[int] = None


def generate_conversation_title_from_messages(messages: List[ChatMessage]) -> str:
    """Generate a concise conversation title based on the first user message."""
    for message in messages:
        content = (message.content or "").strip()
        if message.role.lower() == "user" and content:
            normalized = " ".join(content.split())
            if len(normalized) > 60:
                return f"{normalized[:57].rstrip()}..."
            return normalized
    return "New Chat"


def _should_update_title(current_title: Optional[str]) -> bool:
    if not current_title:
        return True
    baseline_titles = {"New Chat"}
    if current_title in baseline_titles:
        return True
    if current_title.startswith("Conversation "):
        return True
    return False


def _persist_messages(
    db: Optional[SessionType],
    conversation_id: Optional[int],
    user_messages: List[ChatMessage],
    assistant_content: Optional[str],
    potential_title: Optional[str],
) -> None:
    if not db or not conversation_id:
        return

    try:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()  # type: ignore
        if not conversation:
            return

        for msg in user_messages:
            db_msg = MessageModel(
                conversation_id=conversation_id,  # type: ignore
                role=msg.role,
                content=msg.content,
            )
            db.add(db_msg)

        if assistant_content:
            db.add(
                MessageModel(
                    conversation_id=conversation_id,  # type: ignore
                    role="assistant",
                    content=assistant_content,
                )
            )

        if potential_title and _should_update_title(conversation.title):
            conversation.title = potential_title

        db.commit()
    except Exception as exc:
        logging.warning("Failed to save conversation: %s", exc)
        db.rollback()


def _load_conversation_history(conversation_id: int, db: SessionType) -> List["MessageModel"]:
    return (
        db.query(MessageModel)  # type: ignore
        .filter(MessageModel.conversation_id == conversation_id)
        .order_by(MessageModel.created_at.asc())
        .all()
    )


def _prepare_conversation_context(
    request: TextChatRequest,
    db: Optional[SessionType],
) -> Tuple[Optional[int], List[dict]]:
    conversation_id = getattr(request, "conversation_id", None)
    history_records: List[MessageModel] = []
    current_conversation_id: Optional[int] = conversation_id

    if db and conversation_id:
        conversation = (
            db.query(Conversation).filter(Conversation.id == conversation_id).first()  # type: ignore
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        history_records = _load_conversation_history(conversation.id, db)
        current_conversation_id = conversation.id
    elif db and not conversation_id:
        title = generate_conversation_title_from_messages(request.messages)
        conversation = Conversation(title=title)  # type: ignore
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        current_conversation_id = conversation.id
    else:
        conversation = None

    payload_messages = [
        {"role": message.role, "content": message.content}
        for message in history_records
    ]
    payload_messages.extend(
        {"role": msg.role, "content": msg.content}
        for msg in request.messages
    )

    return current_conversation_id, payload_messages


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"

@app.get("/health")
def health(request: Request):
    headers = _cors_headers(request)
    payload = {
        "status": "ok",
        "service": "assistme-api",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
    }
    return JSONResponse(content=payload, headers=headers)


@app.options("/health")
async def health_options(request: Request) -> Response:
    headers = _cors_headers(request, methods="GET, OPTIONS")
    return Response(status_code=204, headers=headers)

@app.get("/debug")
def debug():
    """Ultra simple debug endpoint with minimal dependencies."""
    return "OK"


@app.get("/api/status")
def api_status(request: Request):
    """Get comprehensive API status and configuration."""
    headers = _cors_headers(request)
    return JSONResponse(
        content={
            "status": "operational",
            "service": "AssistMe API",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "chat_available": CHAT_CLIENT_AVAILABLE,
            "database_connected": bool(os.getenv("DATABASE_URL")),
            "api_key_configured": bool(os.getenv("OPENROUTER_API_KEY")),
        },
        headers=headers
    )

@app.options("/api/status")
async def api_status_options(request: Request) -> Response:
    """Handle CORS preflight for status endpoint."""
    headers = _cors_headers(request, methods="GET, OPTIONS")
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return Response(status_code=204, headers=headers)

@app.options("/{path:path}")
async def options_handler(request: Request, path: str) -> Response:
    """Catch-all OPTIONS handler for CORS preflight requests."""
    headers = _cors_headers(request, methods="GET, POST, PUT, DELETE, OPTIONS, HEAD")
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return Response(status_code=204, headers=headers)

@app.get("/")
def root():
    return {"message": "AssistMe API is running", "status": "healthy"}


def _ensure_chat_client() -> None:
    if not CHAT_CLIENT_AVAILABLE or grok_client is None:
        raise HTTPException(status_code=503, detail="Chat functionality is not available. Please check server configuration.")

@app.post("/api/chat/text")
async def chat_text(request: TextChatRequest, db: Optional[SessionType] = Depends(get_db)):
    logging.info("Chat API called with messages: %s", [m.content for m in request.messages])

    # Check if requesting Kimi model
    if request.model and "kimi" in request.model.lower():
        if not KIMI_CLIENT_AVAILABLE or not kimi_client or not kimi_client.is_available():
            return {"error": "Kimi model is not available. Please check server configuration."}
        
        current_conversation_id, payload_messages = _prepare_conversation_context(request, db)
        
        result = await run_in_threadpool(
            kimi_client.generate_response,
            payload_messages,
            request.temperature or 0.7,
            request.max_tokens or 1024,
        )
    else:
        # Use OpenRouter client for other models
        try:
            _ensure_chat_client()
        except HTTPException as exc:
            return {"error": exc.detail}

        current_conversation_id, payload_messages = _prepare_conversation_context(request, db)

        result = await run_in_threadpool(
            grok_client.generate_response,
            payload_messages,
            request.model or None,  # type: ignore
            request.temperature or 0.7,
            request.max_tokens or 1024,
        )
    
    if "error" in result:
        return {"error": result["error"]}

    generated_title = generate_conversation_title_from_messages(request.messages)

    _persist_messages(
        db,
        current_conversation_id,
        request.messages,
        result.get("response"),
        generated_title,
    )

    return {
        "response": result["response"],
        "usage": {"tokens": result["tokens"]},
        "model": request.model,
        "conversation_id": current_conversation_id or 0,
        "title": generated_title,
    }


@app.post("/api/chat/stream")
async def chat_text_stream(request: TextChatRequest, db: Optional[SessionType] = Depends(get_db)):
    logging.info("Chat stream API called with messages: %s", [m.content for m in request.messages])

    # Check if requesting Kimi model
    use_kimi = request.model and "kimi" in request.model.lower()
    
    if use_kimi:
        if not KIMI_CLIENT_AVAILABLE or not kimi_client or not kimi_client.is_available():
            def error_generator():
                yield _sse_event("error", {"message": "Kimi model is not available. Please check server configuration."})
            return StreamingResponse(error_generator(), media_type="text/event-stream")
    else:
        if not CHAT_CLIENT_AVAILABLE or grok_client is None:
            def error_generator():
                yield _sse_event("error", {"message": "Chat functionality is not available. Please check server configuration."})
            return StreamingResponse(error_generator(), media_type="text/event-stream")

    current_conversation_id, payload_messages = _prepare_conversation_context(request, db)
    candidate_title = generate_conversation_title_from_messages(request.messages)
    user_messages = list(request.messages)
    model_id = request.model or None
    temperature = request.temperature or 0.7
    max_tokens = request.max_tokens or 1024

    def sync_event_generator():
        accumulated_chunks: List[str] = []
        final_tokens: Optional[int] = None

        # Run the streaming call directly since we're in a sync context
        if use_kimi:
            stream_source = kimi_client.generate_response_stream(
                payload_messages,
                temperature,
                max_tokens,
            )
        else:
            stream_source = grok_client.generate_response_stream(
                payload_messages,
                model_id,
                temperature,
                max_tokens,
            )

        for chunk in stream_source:
            if chunk.get("error"):
                error_message = str(chunk.get("error"))
                yield _sse_event(
                    "error",
                    {
                        "message": error_message,
                        "conversation_id": current_conversation_id or 0,
                    },
                )
                _persist_messages(db, current_conversation_id, user_messages, None, candidate_title)
                return

            content_piece = chunk.get("content")
            if content_piece:
                accumulated_chunks.append(str(content_piece))
                yield _sse_event("delta", {"content": content_piece})

            if chunk.get("tokens"):
                final_tokens = int(chunk["tokens"])  # type: ignore[arg-type]

            if chunk.get("done"):
                break

        final_text = "".join(accumulated_chunks)
        final_tokens_value = final_tokens or (len(final_text.split()) if final_text else 0)

        yield _sse_event(
            "done",
            {
                "response": final_text,
                "tokens": final_tokens_value,
                "model": model_id,
                "conversation_id": current_conversation_id or 0,
                "title": candidate_title,
            },
        )

        _persist_messages(db, current_conversation_id, user_messages, final_text, candidate_title)

    return StreamingResponse(sync_event_generator(), media_type="text/event-stream")


@app.options("/api/chat/stream")
async def chat_text_stream_options(request: Request) -> Response:
    """Handle CORS preflight for the streaming endpoint."""
    headers = _cors_headers(request, methods="POST, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.get("/api/chat/text")
def chat_text_info():
    """Get information about the chat text endpoint."""
    return {
        "message": "This endpoint accepts POST requests only. Use POST method to send messages.",
        "usage": {
            "method": "POST",
            "content_type": "application/json",
            "example_request": {
                "messages": [{"role": "user", "content": "Hello, how are you?"}],
                "model": "meta-llama/llama-2-13b-chat:free",
                "temperature": 0.7,
                "max_tokens": 1024
            }
        }
    }


@app.options("/api/chat/text")
async def chat_text_options(request: Request) -> Response:
    """Explicitly handle CORS preflight requests."""
    headers = _cors_headers(request, methods="POST, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.get("/api/models")
def list_models():
    _ensure_chat_client()
    models = grok_client.get_available_models()

    # Add Kimi model if available
    if KIMI_CLIENT_AVAILABLE and kimi_client and kimi_client.is_available():
        models.append({
            "id": "moonshotai/kimi-k2-thinking",
            "name": "Kimi-K2-Thinking (Local)",
        })

    return {
        "models": models,
        "default": grok_client.get_default_model(),
    }


@app.options("/api/models")
async def list_models_options(request: Request) -> Response:
    headers = _cors_headers(request, methods="GET, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.get("/api/openrouter/status")
def openrouter_status():
    configured = CHAT_CLIENT_AVAILABLE and grok_client is not None
    if not configured:
        return {
            "configured": False,
            "message": "Chat client unavailable. Check server logs and environment variables.",
        }

    config = getattr(grok_client, "config", {}) or {}
    return {
        "configured": True,
        "base_url": config.get("base_url", "unknown"),
        "has_api_key": bool(config.get("api_key")),
        "default_model": grok_client.get_default_model(),
        "dev_mode": config.get("dev_mode", False),
    }


@app.get("/api/kimi/status")
def kimi_status():
    """Get status of Kimi-K2-Thinking local model."""
    if not KIMI_CLIENT_AVAILABLE or not kimi_client:
        return {
            "available": False,
            "error": "Kimi client not available - ML dependencies not installed",
        }

    return {
        "available": kimi_client.is_available(),
        "model_info": kimi_client.get_model_info(),
    }


@app.options("/api/openrouter/status")
async def openrouter_status_options(request: Request) -> Response:
    headers = _cors_headers(request, methods="GET, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.options("/api/kimi/status")
async def kimi_status_options(request: Request) -> Response:
    headers = _cors_headers(request, methods="GET, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.get("/api/conversations")
def get_conversations(db: Optional[SessionType] = Depends(get_db)) -> List[dict]:
    if not db:
        # No database, return empty list
        return []
    conversations = db.query(Conversation).all()  # type: ignore
    return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in conversations]


@app.options("/api/conversations")
async def conversations_options(request: Request) -> Response:
    headers = _cors_headers(request, methods="GET, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.get("/api/conversations/{conversation_id}")
def get_conversation_messages(conversation_id: int, db: Optional[SessionType] = Depends(get_db)):
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")

    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()  # type: ignore
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(MessageModel)  # type: ignore
        .filter(MessageModel.conversation_id == conversation_id)
        .order_by(MessageModel.created_at.asc())
        .all()
    )
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at,
            }
            for m in messages
        ]
    }


@app.options("/api/conversations/{conversation_id}")
async def conversation_detail_options(
    request: Request, conversation_id: int
) -> Response:  # pragma: no cover - simple CORS response
    headers = _cors_headers(request, methods="GET, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.websocket("/api/chat/voice")
async def voice_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            _data = await websocket.receive_json()  # expecting audio data or command
            # Placeholder: Process audio with S2R and get response from Grok-2
            # For now, just echo back a fixed response
            response_text = "Voice processed via S2R architecture and Grok-2 reasoning"
            await websocket.send_json({"response": response_text})
    except Exception as e:
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()

# AI4Bharat Endpoints for Indian Language Support

@app.get("/api/ai4bharat/languages")
def get_supported_languages(request: Request):
    """Get list of supported Indian languages"""
    headers = _cors_headers(request)
    languages = ai4bharat_client.get_supported_languages()
    return JSONResponse(
        content={
            "success": True,
            "languages": languages,
            "count": len(languages)
        },
        headers=headers
    )

@app.post("/api/ai4bharat/translate")
async def translate_text(request: Request):
    """Translate text between Indian languages"""
    headers = _cors_headers(request)
    
    try:
        data = await request.json()
        text = data.get("text", "")
        source_lang = data.get("source_language", "en")
        target_lang = data.get("target_language", "hi")
        
        if not text:
            return JSONResponse(
                content={"success": False, "error": "Text is required"},
                status_code=400,
                headers=headers
            )
        
        result = await ai4bharat_client.translate(text, source_lang, target_lang)
        
        return JSONResponse(
            content=result,
            headers=headers
        )
    
    except Exception as e:
        logging.error(f"Translation error: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500,
            headers=headers
        )

@app.post("/api/ai4bharat/detect-language")
async def detect_language(request: Request):
    """Detect language of given text"""
    headers = _cors_headers(request)
    
    try:
        data = await request.json()
        text = data.get("text", "")
        
        if not text:
            return JSONResponse(
                content={"success": False, "error": "Text is required"},
                status_code=400,
                headers=headers
            )
        
        result = await ai4bharat_client.detect_language(text)
        
        return JSONResponse(
            content=result,
            headers=headers
        )
    
    except Exception as e:
        logging.error(f"Language detection error: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500,
            headers=headers
        )

@app.post("/api/ai4bharat/transliterate")
async def transliterate_text(request: Request):
    """Transliterate text between scripts"""
    headers = _cors_headers(request)
    
    try:
        data = await request.json()
        text = data.get("text", "")
        source_script = data.get("source_script", "hi")
        target_script = data.get("target_script", "en")
        
        if not text:
            return JSONResponse(
                content={"success": False, "error": "Text is required"},
                status_code=400,
                headers=headers
            )
        
        result = await ai4bharat_client.transliterate(text, source_script, target_script)
        
        return JSONResponse(
            content=result,
            headers=headers
        )
    
    except Exception as e:
        logging.error(f"Transliteration error: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500,
            headers=headers
        )

if __name__ == "__main__":
    import uvicorn  # type: ignore[import-not-found]

    # Respect platform-provided PORT (e.g. Railway/Render); fall back to local default
    port = int(os.getenv("PORT", "8001"))

    # Allow overriding bind host; default to localhost for safety
    host = os.getenv("FASTAPI_BIND_HOST", "127.0.0.1")

    uvicorn.run(app, host=host, port=port, log_level="info")
