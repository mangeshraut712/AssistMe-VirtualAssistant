import base64
import json
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# Load environment variables from .env files
try:
    from dotenv import load_dotenv  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - optional in production
    load_dotenv = None  # type: ignore[assignment]

if load_dotenv:
    load_dotenv('../secrets.env')  # Load secrets.env from parent directory
    load_dotenv('.env')            # Override with .env if needed

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

# Import voice websocket functionality
try:
    from .voice_websocket import router as voice_router, voice_manager
    VOICE_AVAILABLE = True
    logging.info("Successfully imported voice WebSocket functionality")
except ImportError as e:
    logging.warning("Voice WebSocket import failed: %s. Voice features will be disabled.", e)
    voice_router = None
    voice_manager = None
    VOICE_AVAILABLE = False

try:
    from .utils.agent import MiniMaxAgentNotConfigured, run_planner
    AGENT_AVAILABLE = True
except Exception as exc:  # pragma: no cover - optional dependency
    logging.warning("MiniMax agent utilities unavailable: %s", exc)
    run_planner = None  # type: ignore[assignment]
    MiniMaxAgentNotConfigured = RuntimeError  # type: ignore[assignment]
    AGENT_AVAILABLE = False

try:
    from .utils.minimax import (
        MiniMaxClientError,
        MiniMaxClientNotConfigured,
        encode_audio_to_base64,
        generate_image,
        generate_video,
        is_minimax_ready,
        synthesize_speech,
        transcribe_audio,
    )
    MULTIMODAL_AVAILABLE = is_minimax_ready()
except Exception as exc:  # pragma: no cover - optional dependency
    logging.warning("MiniMax multimodal utilities unavailable: %s", exc)
    MiniMaxClientError = RuntimeError  # type: ignore[assignment]
    MiniMaxClientNotConfigured = RuntimeError  # type: ignore[assignment]
    generate_image = None  # type: ignore[assignment]
    generate_video = None  # type: ignore[assignment]
    synthesize_speech = None  # type: ignore[assignment]
    transcribe_audio = None  # type: ignore[assignment]
    encode_audio_to_base64 = None  # type: ignore[assignment]
    MULTIMODAL_AVAILABLE = False

try:
    from .rag.engine import get_rag_engine, rag_query as rag_query_engine
    RAG_AVAILABLE = True
except Exception as exc:  # pragma: no cover - optional dependency
    logging.warning("Grokipedia RAG unavailable: %s", exc)
    get_rag_engine = None  # type: ignore[assignment]
    rag_query_engine = None  # type: ignore[assignment]
    RAG_AVAILABLE = False

from .database import get_db
from .models import Conversation, Message as MessageModel

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
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:64609",  # Browser preview port
    "https://assist-me-virtual-assistant.vercel.app",
    "https://assistme-virtualassistant-production.up.railway.app",
]

ALLOWED_ORIGINS.extend(_env_configured_origins())
ALLOWED_ORIGINS = sorted({origin for origin in ALLOWED_ORIGINS if origin})
DEFAULT_ORIGIN_REGEX = r"https://assist-me-virtual-assistant(-[a-z0-9]+)?\.vercel\.app"
CUSTOM_ORIGIN_REGEX = os.getenv("CORS_ALLOW_ORIGIN_REGEX", "").strip()
CORS_ALLOW_ALL = os.getenv("CORS_ALLOW_ALL", "false").lower() == "true"
ACTIVE_ORIGIN_REGEX = CUSTOM_ORIGIN_REGEX or DEFAULT_ORIGIN_REGEX
VERCEL_ORIGIN_PATTERN = re.compile(ACTIVE_ORIGIN_REGEX) if ACTIVE_ORIGIN_REGEX else re.compile(DEFAULT_ORIGIN_REGEX)

app = FastAPI(title="AssistMe API", version="1.0.0")

# Include voice WebSocket router if available
if VOICE_AVAILABLE and voice_router:
    app.include_router(voice_router)
    logging.info("Voice WebSocket router included")
else:
    logging.warning("Voice WebSocket router not available")

# Initialize voice manager on startup
@app.on_event("startup")
async def startup_event():
    if VOICE_AVAILABLE and voice_manager:
        await voice_manager.initialize_redis()
        logging.info("Voice manager initialized")
    if RAG_AVAILABLE and get_rag_engine:
        try:
            await run_in_threadpool(get_rag_engine)
            logging.info("Grokipedia RAG engine warmed")
        except Exception as exc:  # pragma: no cover - defensive log
            logging.warning("Failed to warm Grokipedia RAG engine: %s", exc)

# Configure CORS for cross-origin requests
cors_kwargs = {
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    "allow_headers": ["*"],
    "expose_headers": ["*"],
    "max_age": 3600,
}

if CORS_ALLOW_ALL:
    cors_kwargs["allow_origins"] = ["*"]
    cors_kwargs["allow_credentials"] = False
else:
    configured_origins = ALLOWED_ORIGINS or ["https://assist-me-virtual-assistant.vercel.app"]
    cors_kwargs["allow_origins"] = configured_origins
    cors_kwargs["allow_credentials"] = True

if ACTIVE_ORIGIN_REGEX:
    cors_kwargs["allow_origin_regex"] = ACTIVE_ORIGIN_REGEX

app.add_middleware(CORSMiddleware, **cors_kwargs)


def _resolve_origin(request: Request) -> str:
    if CORS_ALLOW_ALL:
        return request.headers.get("origin") or "*"
    origin = request.headers.get("origin")
    if origin:
        if origin in ALLOWED_ORIGINS or VERCEL_ORIGIN_PATTERN.fullmatch(origin):
            return origin
    return ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else "*"


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
    if allow_origin != "*" and not CORS_ALLOW_ALL:
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
    use_rag: Optional[bool] = False
    rag_query: Optional[str] = None
    user_preferences: Optional[Dict[str, Any]] = None


class AgentPlanRequest(BaseModel):
    prompt: str
    context: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    extra: Optional[Dict[str, Any]] = None


class MultimodalGenerateRequest(BaseModel):
    type: str
    prompt: Optional[str] = None
    text: Optional[str] = None
    audio_b64: Optional[str] = None
    options: Optional[Dict[str, Any]] = None


class RAGQueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 3


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
) -> Tuple[Optional[int], List[dict], Optional[Dict[str, Any]]]:
    conversation_id = getattr(request, "conversation_id", None)
    history_records: List[MessageModel] = []
    current_conversation_id: Optional[int] = conversation_id
    user_preferences: Optional[Dict[str, Any]] = None

    if db and conversation_id:
        conversation = (
            db.query(Conversation).filter(Conversation.id == conversation_id).first()  # type: ignore
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        history_records = _load_conversation_history(conversation.id, db)
        current_conversation_id = conversation.id
        if conversation.user:
            user = conversation.user
            user_preferences = {
                "style": user.style_preset,
                "language": user.preferred_language,
                "voice": user.preferred_voice,
            }
            if user.preferences:
                try:
                    extra_prefs = json.loads(user.preferences)
                    if isinstance(extra_prefs, dict):
                        user_preferences.update(extra_prefs)
                except json.JSONDecodeError:
                    logging.debug("User preferences JSON decode failed for user %s", user.id)
    elif db and not conversation_id:
        title = generate_conversation_title_from_messages(request.messages)
        conversation = Conversation(title=title)  # type: ignore
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        current_conversation_id = conversation.id
        if request.user_preferences:
            # Store preferences snapshot on the conversation for quick retrieval
            try:
                user_preferences = dict(request.user_preferences)
            except Exception:
                user_preferences = request.user_preferences
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

    if request.user_preferences:
        user_preferences = user_preferences or {}
        try:
            user_preferences.update(request.user_preferences)
        except Exception:
            user_preferences = request.user_preferences

    return current_conversation_id, payload_messages, user_preferences


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _serialise_intermediate_steps(steps: Any) -> List[Dict[str, Any]]:
    serialised: List[Dict[str, Any]] = []
    if not steps:
        return serialised
    try:
        iterable = list(steps)
    except TypeError:
        return serialised

    for entry in iterable:
        if isinstance(entry, tuple) and len(entry) == 2:
            action, observation = entry
            serialised.append(
                {
                    "action": getattr(action, "tool", str(action)),
                    "input": getattr(action, "tool_input", ""),
                    "log": getattr(action, "log", ""),
                    "observation": observation,
                }
            )
        else:
            serialised.append({"raw": str(entry)})
    return serialised


def _decode_base64_audio(payload: Optional[str]) -> Optional[bytes]:
    if not payload:
        return None
    try:
        return base64.b64decode(payload)
    except (ValueError, TypeError):
        return None


def _last_user_message(messages: List[ChatMessage]) -> str:
    for message in reversed(messages):
        content = (message.content or "").strip()
        if message.role.lower() == "user" and content:
            return content
    return ""


def _should_use_rag(request: TextChatRequest) -> bool:
    if not RAG_AVAILABLE or rag_query_engine is None:
        return False
    if request.use_rag:
        return True
    default_enabled = os.getenv("GROKIPEDIA_DEFAULT_ENABLED", "false").lower() == "true"
    return default_enabled


def _apply_rag_context(
    payload_messages: List[Dict[str, str]],
    request: TextChatRequest,
) -> Tuple[List[Dict[str, str]], List[Dict[str, Any]]]:
    if not _should_use_rag(request):
        return payload_messages, []

    if rag_query_engine is None:
        return payload_messages, []

    query_text = request.rag_query or _last_user_message(request.messages)
    if not query_text:
        return payload_messages, []

    top_k = int(os.getenv("GROKIPEDIA_TOP_K", "3"))
    try:
        matches = list(rag_query_engine(query_text, top_k=top_k))
    except Exception as exc:  # pragma: no cover - RAG failure
        logging.warning("Grokipedia query failed: %s", exc)
        return payload_messages, []

    if not matches:
        return payload_messages, []

    context_blocks = []
    for doc in matches:
        block = (
            f"Title: {doc.get('title')}\n"
            f"Summary: {doc.get('summary')}\n"
            f"Details: {doc.get('content')}"
        )
        context_blocks.append(block)

    rag_message = {
        "role": "system",
        "content": "Grokipedia context:\n" + "\n\n".join(context_blocks),
    }

    new_messages: List[Dict[str, str]] = []
    inserted = False
    for msg in payload_messages:
        if msg.get("role") == "system":
            new_messages.append(msg)
            continue
        if not inserted:
            new_messages.append(rag_message)
            inserted = True
        new_messages.append(msg)

    if not inserted:
        new_messages.append(rag_message)

    return new_messages, matches


def _apply_personalisation(
    payload_messages: List[Dict[str, str]],
    preferences: Optional[Dict[str, Any]],
) -> List[Dict[str, str]]:
    if not preferences:
        return payload_messages

    instruction_lines: List[str] = []
    style = preferences.get("style") or preferences.get("style_preset")
    language = preferences.get("language") or preferences.get("preferred_language")
    voice = preferences.get("voice") or preferences.get("preferred_voice")
    persona = preferences.get("persona")
    custom = preferences.get("custom") or preferences.get("instructions")

    if style:
        instruction_lines.append(f"Preferred response style: {style}.")
    if language:
        instruction_lines.append(f"Respond using language preference: {language}.")
    if voice:
        instruction_lines.append(f"When producing audio, favour the '{voice}' voice profile.")
    if persona:
        instruction_lines.append(f"Persona guidance: {persona}.")
    if isinstance(custom, dict) and custom:
        instruction_lines.append("Custom instructions: " + json.dumps(custom, ensure_ascii=False))
    elif isinstance(custom, str) and custom.strip():
        instruction_lines.append(f"Custom instructions: {custom.strip()}.")

    if not instruction_lines:
        return payload_messages

    personal_message = {
        "role": "system",
        "content": "Mangesh personalization directives:\n" + "\n".join(instruction_lines),
    }

    updated: List[Dict[str, str]] = []
    inserted = False
    for msg in payload_messages:
        if msg.get("role") == "system":
            updated.append(msg)
            continue
        if not inserted:
            updated.append(personal_message)
            inserted = True
        updated.append(msg)

    if not inserted:
        updated.append(personal_message)

    return updated

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


@app.get("/env")
def get_env():
    # Debug endpoint to check what env vars are loaded
    return {
        "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY", "NOT_SET")[:20] + "..." if os.getenv("OPENROUTER_API_KEY") else "NOT_SET",
        "DEV_MODE": os.getenv("DEV_MODE", "NOT_SET"),
        "APP_URL": os.getenv("APP_URL", "NOT_SET"),
        "DATABASE_URL": os.getenv("DATABASE_URL", "NOT_SET")[:30] + "..." if os.getenv("DATABASE_URL") else "NOT_SET",
        "CHAT_AVAILABLE": CHAT_CLIENT_AVAILABLE,
        "UPTIME": "Application responding"
    }

@app.get("/")
def root():
    return {"message": "AssistMe API is running", "status": "healthy"}


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

    current_conversation_id, payload_messages, user_preferences = _prepare_conversation_context(request, db)

    payload_messages = _apply_personalisation(payload_messages, user_preferences)
    payload_messages, rag_matches = _apply_rag_context(payload_messages, request)

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

    rag_payload = {"used": bool(rag_matches)}
    if rag_matches:
        rag_payload["documents"] = rag_matches

    return {
        "response": result["response"],
        "usage": {"tokens": result["tokens"]},
        "model": request.model,
        "conversation_id": current_conversation_id or 0,
        "title": generated_title,
        "rag": rag_payload,
        "preferences": user_preferences or {},
    }


@app.post("/api/chat/stream")
async def chat_text_stream(request: TextChatRequest, db: Optional[SessionType] = Depends(get_db)):
    logging.info("Chat stream API called with messages: %s", [m.content for m in request.messages])

    if not CHAT_CLIENT_AVAILABLE or grok_client is None:
        def error_generator():
            yield _sse_event("error", {"message": "Chat functionality is not available. Please check server configuration."})
        return StreamingResponse(error_generator(), media_type="text/event-stream")

    current_conversation_id, payload_messages, user_preferences = _prepare_conversation_context(request, db)
    payload_messages = _apply_personalisation(payload_messages, user_preferences)
    payload_messages, rag_matches = _apply_rag_context(payload_messages, request)
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

        rag_payload = {"used": bool(rag_matches)}
        if rag_matches:
            rag_payload["documents"] = rag_matches

        yield _sse_event(
            "done",
            {
                "response": final_text,
                "tokens": final_tokens_value,
                "model": model_id,
                "conversation_id": current_conversation_id or 0,
                "title": candidate_title,
                "rag": rag_payload,
                "preferences": user_preferences or {},
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


@app.post("/api/agent/plan")
async def agent_plan(request: AgentPlanRequest, http_request: Request) -> JSONResponse:
    if not AGENT_AVAILABLE or run_planner is None:
        raise HTTPException(status_code=503, detail="Agent functionality is not available.")

    try:
        result = await run_in_threadpool(
            run_planner,
            request.prompt,
            context=request.context,
            metadata=request.metadata,
            extra=request.extra,
        )
    except MiniMaxAgentNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - protective logging
        logging.exception("MiniMax agent planning failed: %s", exc)
        raise HTTPException(status_code=500, detail="Agent planning failed.") from exc

    headers = _cors_headers(http_request)
    payload = {
        "output": result.get("output"),
        "intermediate_steps": _serialise_intermediate_steps(result.get("intermediate_steps")),
        "raw": result,
    }
    return JSONResponse(content=payload, headers=headers)


@app.options("/api/agent/plan")
async def agent_plan_options(request: Request) -> Response:
    headers = _cors_headers(request, methods="POST, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.post("/api/multimodal/generate")
async def multimodal_generate(request: MultimodalGenerateRequest, http_request: Request) -> JSONResponse:
    if not MULTIMODAL_AVAILABLE:
        raise HTTPException(status_code=503, detail="MiniMax multimodal functionality is not available.")

    req_type = (request.type or "").lower()
    options = request.options or {}

    def _dispatch() -> Dict[str, Any]:
        if req_type == "image":
            if generate_image is None:
                raise MiniMaxClientError("Image generation helper is unavailable.")
            prompt = request.prompt or request.text
            if not prompt:
                raise ValueError("prompt is required for image generation.")
            size = options.get("size", "1024x1024")
            model = options.get("model")
            return generate_image(prompt, size=size, model=model)

        if req_type == "video":
            if generate_video is None:
                raise MiniMaxClientError("Video generation helper is unavailable.")
            prompt = request.prompt or request.text
            if not prompt:
                raise ValueError("prompt is required for video generation.")
            duration = options.get("duration", "6s")
            resolution = options.get("resolution", "720p")
            model = options.get("model")
            return generate_video(prompt, duration=duration, resolution=resolution, model=model)

        if req_type in {"speech", "tts"}:
            if synthesize_speech is None or encode_audio_to_base64 is None:
                raise MiniMaxClientError("Speech synthesis helpers unavailable.")
            text_value = request.text or request.prompt
            if not text_value:
                raise ValueError("text is required for speech synthesis.")
            voice = options.get("voice")
            audio_format = options.get("format", "mp3")
            language = options.get("language")
            model = options.get("model")
            audio_bytes = synthesize_speech(
                text_value,
                voice=voice,
                format=audio_format,
                language=language,
                model=model,
            )
            return {
                "type": "speech",
                "format": audio_format,
                "voice": voice or os.getenv("MINIMAX_TTS_VOICE", "alloy"),
                "b64": encode_audio_to_base64(audio_bytes),
            }

        if req_type in {"transcription", "stt"}:
            if transcribe_audio is None:
                raise MiniMaxClientError("Transcription helper unavailable.")
            audio_bytes = _decode_base64_audio(request.audio_b64)
            if not audio_bytes:
                raise ValueError("audio_b64 payload is required for transcription.")
            language = options.get("language")
            audio_format = options.get("format", "wav")
            model = options.get("model")
            result = transcribe_audio(
                audio_bytes,
                language=language,
                format=audio_format,
                model=model,
            )
            return {"type": "transcription", **result}

        raise ValueError(f"Unsupported multimodal type '{request.type}'.")

    try:
        result = await run_in_threadpool(_dispatch)
    except MiniMaxClientNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except MiniMaxClientError as exc:
        logging.warning("MiniMax multimodal error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive logging
        logging.exception("MiniMax multimodal request failed: %s", exc)
        raise HTTPException(status_code=500, detail="Multimodal generation failed.") from exc

    headers = _cors_headers(http_request)
    return JSONResponse(content=result, headers=headers)


@app.options("/api/multimodal/generate")
async def multimodal_generate_options(request: Request) -> Response:
    headers = _cors_headers(request, methods="POST, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.post("/api/rag/query")
async def rag_query_endpoint(request: RAGQueryRequest, http_request: Request) -> JSONResponse:
    if not RAG_AVAILABLE or rag_query_engine is None:
        raise HTTPException(status_code=503, detail="RAG functionality is not available.")

    top_k = max(1, min(10, request.top_k or 3))

    def _dispatch() -> List[Dict[str, Any]]:
        return list(rag_query_engine(request.query, top_k=top_k))

    try:
        results = await run_in_threadpool(_dispatch)
    except Exception as exc:  # pragma: no cover - defensive logging
        logging.exception("RAG query failed: %s", exc)
        raise HTTPException(status_code=500, detail="RAG query failed.") from exc

    headers = _cors_headers(http_request)
    return JSONResponse(content={"query": request.query, "results": results}, headers=headers)


@app.options("/api/rag/query")
async def rag_query_options(request: Request) -> Response:
    headers = _cors_headers(request, methods="POST, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.get("/api/models")
def list_models():
    _ensure_chat_client()
    return {
        "models": grok_client.get_available_models(),
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


@app.options("/api/openrouter/status")
async def openrouter_status_options(request: Request) -> Response:
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
            await websocket.receive_json()  # expecting audio data or command (placeholder)
            # Placeholder: Process audio with S2R and get response from Grok-2
            # For now, just echo back a fixed response
            response_text = "Voice processed via S2R architecture and Grok-2 reasoning"
            await websocket.send_json({"response": response_text})
    except Exception as e:
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn  # type: ignore[import-not-found]

    # Respect platform-provided PORT (e.g. Railway/Render); fall back to local default
    port = int(os.getenv("PORT", "8001"))

    # Allow overriding bind host; default to localhost for safety
    host = os.getenv("FASTAPI_BIND_HOST", "127.0.0.1")

    uvicorn.run(app, host=host, port=port, log_level="info")
