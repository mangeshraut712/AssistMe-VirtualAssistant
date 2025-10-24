import json
import logging
import os
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional, Tuple

# Load environment variables from .env files
try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional in production
    pass  # dotenv not available, skip

load_dotenv('secrets.env')  # Load secrets.env first
load_dotenv('.env')         # Override with .env if needed

from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session as SessionType
from starlette.concurrency import run_in_threadpool

# Import chat client with graceful error handling
try:
    from .chat_client import grok_client
    CHAT_CLIENT_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Chat client import failed: {e}. Chat features will be disabled.")
    grok_client = None
    CHAT_CLIENT_AVAILABLE = False

from .database import get_db
from .models import Conversation, Message as MessageModel

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8001",
    "https://assist-me-virtual-assistant.vercel.app",
    "https://assist-me-virtual-assistant.vercel.app",
    "https://assistme-virtualassistant-production.up.railway.app",
]

app = FastAPI(title="AssistMe API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://assist-me-virtual-assistant(-[a-z0-9]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

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
def health():
    return {"status": "ok", "service": "assistme-api", "version": "1.0.0", "timestamp": datetime.now().isoformat()}

@app.get("/env")
def get_env():
    # Debug endpoint to check what env vars are loaded
    return {
        "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY", "NOT_SET")[:20] + "..." if os.getenv("OPENROUTER_API_KEY") else "NOT_SET",
        "DEV_MODE": os.getenv("DEV_MODE", "NOT_SET"),
        "APP_URL": os.getenv("APP_URL", "NOT_SET"),
        "DATABASE_URL": os.getenv("DATABASE_URL", "NOT_SET")[:30] + "..." if os.getenv("DATABASE_URL") else "NOT_SET"
    }

@app.get("/")
def root():
    return {"message": "AssistMe API is running"}


def _ensure_chat_client() -> None:
    if not CHAT_CLIENT_AVAILABLE or grok_client is None:
        raise HTTPException(status_code=503, detail="Chat functionality is not available. Please check server configuration.")

@app.post("/api/chat/text")
async def chat_text(request: TextChatRequest, db: Optional[SessionType] = Depends(get_db)):
    logging.info("Chat API called with messages: %s", [m.content for m in request.messages])

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
        for chunk in grok_client.generate_response_stream(
            payload_messages,
            model_id,
            temperature,
            max_tokens,
        ):
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
async def chat_text_stream_options() -> Response:
    """Handle CORS preflight for the streaming endpoint."""
    return Response(status_code=204)


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
async def chat_text_options() -> Response:
    """Explicitly handle CORS preflight requests."""
    return Response(status_code=204)


@app.get("/api/models")
def list_models():
    _ensure_chat_client()
    return {
        "models": grok_client.get_available_models(),
        "default": grok_client.default_model,
    }


@app.options("/api/models")
async def list_models_options() -> Response:
    return Response(status_code=204)


@app.get("/api/openrouter/status")
def openrouter_status():
    configured = CHAT_CLIENT_AVAILABLE and grok_client is not None
    if not configured:
        return {
            "configured": False,
            "message": "Chat client unavailable. Check server logs and environment variables.",
        }

    return {
        "configured": True,
        "base_url": getattr(grok_client, "base_url", "unknown"),
        "has_api_key": bool(getattr(grok_client, "api_key", "")),
        "default_model": getattr(grok_client, "default_model", None),
        "dev_mode": getattr(grok_client, "dev_mode", False),
    }


@app.options("/api/openrouter/status")
async def openrouter_status_options() -> Response:
    return Response(status_code=204)

@app.get("/api/conversations")
def get_conversations(db: Optional[SessionType] = Depends(get_db)) -> List[dict]:
    if db:
        conversations = db.query(Conversation).all()  # type: ignore
        return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in conversations]
    else:
        # No database, return empty list
        return []


@app.options("/api/conversations")
async def conversations_options() -> Response:
    return Response(status_code=204)


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
async def conversation_detail_options(conversation_id: int) -> Response:  # pragma: no cover - simple CORS response
    return Response(status_code=204)


@app.websocket("/api/chat/voice")
async def voice_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()  # expecting audio data or command
            # Placeholder: Process audio with S2R and get response from Grok-2
            response_text = "Voice processed via S2R architecture and Grok-2 reasoning"
            await websocket.send_json({"response": response_text})
    except Exception as e:
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn

    # Respect platform-provided PORT (e.g. Railway/Render); fall back to local default
    port = int(os.getenv("PORT", "8001"))

    # Bind to localhost for local development, all interfaces for containerized environments
    host = "127.0.0.1" if os.getenv("DEV_MODE", "false").lower() == "true" else "0.0.0.0"

    uvicorn.run(app, host=host, port=port, log_level="info")
