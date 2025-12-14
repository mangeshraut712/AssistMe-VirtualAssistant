import base64
import hashlib
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
    load_dotenv(".env")  # Load from .env file in current directory
    load_dotenv()  # Also load from system environment variables

# Configure logging immediately
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Import chat client with graceful error handling
# Import AI Provider Factory
try:
    from .providers import get_provider

    # Test provider instantiation
    _provider = get_provider()
    CHAT_CLIENT_AVAILABLE = True
    logging.info(
        f"Successfully initialized AI provider: {_provider.__class__.__name__}"
    )
except Exception as e:
    logging.error(
        "AI Provider initialization failed: %s. Chat features will be disabled.", e
    )
    CHAT_CLIENT_AVAILABLE = False

from fastapi import (  # type: ignore[import-not-found]
    Depends,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy import text as sql_text  # type: ignore[import-not-found]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import-not-found]
from fastapi.responses import (  # type: ignore[import-not-found]
    JSONResponse,
    Response,
    StreamingResponse,
)
try:
    from api_analytics.fastapi import Analytics
except ImportError:
    Analytics = None
    logging.warning("api_analytics module not found. Analytics disabled.")

from pydantic import BaseModel  # type: ignore[import-not-found]
from sqlalchemy.orm import Session as SessionType  # type: ignore[import-not-found]
from starlette.concurrency import run_in_threadpool  # type: ignore[import-not-found]

from .schemas import ChatMessage, TextChatRequest
from .ai4bharat import ai4bharat_client
from .database import get_db
from .models import Conversation
from .models import Message as MessageModel
from .services.rate_limit_service import rate_limit_service


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
VERCEL_ORIGIN_PATTERN = re.compile(
    r"https://assist-me-virtual-assistant(-[a-z0-9]+)?\.vercel\.app"
)

app = FastAPI(title="AssistMe API", version="2.0.0")

# API Analytics middleware (OpenRouter-only stack)
API_ANALYTICS_KEY = os.getenv("API_ANALYTICS_KEY", "").strip()
if API_ANALYTICS_KEY and Analytics:
    app.add_middleware(Analytics, api_key=API_ANALYTICS_KEY)

# Include routers
# Include routers
try:
    from .routes import speech
    app.include_router(speech.router)
    logging.info("✓ Speech router registered")
except Exception as e:
    logging.warning(f"Failed to register speech router: {e}")

try:
    from .routes import knowledge
    app.include_router(knowledge.router)
    logging.info("✓ Knowledge router registered")
except Exception as e:
    logging.warning(f"Failed to register knowledge router: {e}")

try:
    from .routes import tts
    app.include_router(tts.router)
    logging.info("✓ TTS router registered")
except Exception as e:
    logging.warning(f"Failed to register TTS router: {e}")

try:
    from .routes import auth_standalone as auth
    app.include_router(auth.router)
    logging.info("✓ Auth router registered")
except Exception as e:
    logging.warning(f"Failed to register Auth router: {e}")

try:
    from .routes import files
    app.include_router(files.router)
    logging.info("✓ Files router registered")
except Exception as e:
    logging.warning(f"Failed to register Files router: {e}")

try:
    from .routes import image
    app.include_router(image.router)
    logging.info("✓ Image router registered")
except Exception as e:
    logging.warning(f"Failed to register Image router: {e}")

try:
    from .routes import multimodal
    app.include_router(multimodal.router)
    logging.info("✓ Multimodal router registered")
except Exception as e:
    logging.warning(f"Failed to register Multimodal router: {e}")


# Startup validation
@app.on_event("startup")
async def startup_validation():
    """Validate critical environment variables and log warnings"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    warnings = []
    errors = []

    # Check AI Provider configuration
    try:
        provider = get_provider()
        if provider.is_available():
            logging.info(f"✓ AI Provider configured: {provider.__class__.__name__}")
        else:
            warnings.append(
                f"AI Provider {provider.__class__.__name__} is not fully configured (missing API key)"
            )
    except Exception as e:
        errors.append(f"AI Provider error: {str(e)}")

    # Check database configuration
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        logging.info("✓ Database URL configured")
    else:
        logging.info("ℹ Using SQLite fallback database")

    # Check app URL for CORS
    app_url = os.getenv("APP_URL")
    if not app_url:
        warnings.append("APP_URL not set - CORS may not work correctly in production")
    else:
        logging.info(f"✓ App URL configured: {app_url}")

    # Check port configuration
    port = os.getenv("PORT", "8001")
    logging.info(f"✓ Server will bind to port {port}")

    # Log all warnings
    for warning in warnings:
        logging.warning(f"⚠ {warning}")

    # Log all errors
    for error in errors:
        logging.error(f"✗ {error}")

    if errors:
        logging.error("\n" + "=" * 60)
        logging.error("CRITICAL: Application started with configuration errors!")
        logging.error("Please fix the above errors for full functionality.")
        logging.error("=" * 60 + "\n")
    elif warnings:
        logging.warning("\n" + "=" * 60)
        logging.warning("Application started with warnings")
        logging.warning("Some features may not work as expected.")
        logging.warning("=" * 60 + "\n")
    else:
        logging.info("\n" + "=" * 60)
        logging.info("✓ All environment variables configured correctly")
        logging.info("✓ AssistMe API started successfully")
        logging.info("=" * 60 + "\n")

    # Load knowledge base if configured
    try:
        from .services.embedding_service import embedding_service

        default_path = os.path.join(os.path.dirname(__file__), "data/grokipedia.json")
        data_path = os.getenv("GROKIPEDIA_DATA_PATH", default_path)
        loaded = await embedding_service.load_from_file(data_path)
        if loaded:
            logging.info(f"✓ Knowledge base loaded: {loaded} documents")
        else:
            logging.warning(
                "⚠ Knowledge base not loaded; index will remain empty until ingestion"
            )
    except Exception as exc:
        logging.warning(f"Failed to load knowledge base: {exc}")


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


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    return response


def _resolve_origin(request: Request) -> Optional[str]:
    origin = request.headers.get("origin")
    if not origin:
        return None
    if origin in ALLOWED_ORIGINS or VERCEL_ORIGIN_PATTERN.fullmatch(origin):
        return origin
    return None


def _cors_headers(request: Request, methods: Optional[str] = None) -> Dict[str, str]:
    """Build CORS headers that respect the resolved origin."""
    allow_origin = _resolve_origin(request)
    headers: Dict[str, str] = {
        "Vary": "Origin",
    }
    if allow_origin:
        headers["Access-Control-Allow-Origin"] = allow_origin
        headers["Access-Control-Allow-Credentials"] = "true"
    if methods and allow_origin:
        headers["Access-Control-Allow-Methods"] = methods
        headers["Access-Control-Max-Age"] = "86400"
        headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, X-Requested-With"
        )
    return headers


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


def _load_conversation_history(
    conversation_id: int, db: SessionType
) -> List["MessageModel"]:
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
        {"role": msg.role, "content": msg.content} for msg in request.messages
    )

    return current_conversation_id, payload_messages


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.get("/health")
def health(request: Request):
    """Enhanced health check with comprehensive diagnostics"""
    headers = _cors_headers(request)

    # Check database connectivity
    db_status = "not_configured"
    db_error = None
    try:
        from .database import _ensure_database_setup, engine

        if _ensure_database_setup() and engine is not None:
            # Try a simple query to verify connection
            with engine.connect() as conn:
                conn.execute(sql_text("SELECT 1"))
            db_status = "connected"
        elif engine is None:
            db_status = "failed"
    except Exception as e:
        db_status = "error"
        db_error = str(e)
        logging.warning(f"Health check database error: {e}")

    # Check API key configuration
    api_key_configured = bool(os.getenv("OPENROUTER_API_KEY"))

    # Check chat client availability
    try:
        provider = get_provider()
        chat_status = (
            "available"
            if CHAT_CLIENT_AVAILABLE and provider.is_available()
            else "unavailable"
        )
        api_key_configured = provider.is_available()
    except:
        chat_status = "error"
        api_key_configured = False

    # Determine overall status
    overall_status = "healthy"
    if db_status == "error":
        overall_status = "degraded"

    payload = {
        "status": overall_status,
        "service": "assistme-api",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "database": {"status": db_status, "error": db_error},
            "chat_client": {
                "status": chat_status,
                "api_key_configured": api_key_configured,
            },
        },
    }

    # Return appropriate status code
    status_code = 200 if overall_status == "healthy" else 503
    return JSONResponse(content=payload, headers=headers, status_code=status_code)


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
        headers=headers,
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
    headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization, X-Requested-With"
    )
    return Response(status_code=204, headers=headers)


@app.get("/")
def root():
    return {"message": "AssistMe API is running", "status": "healthy"}


def _ensure_chat_client() -> None:
    if not CHAT_CLIENT_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Chat functionality is not available. Please check server configuration.",
        )


async def _detect_and_adapt_language(
    messages: List[Dict[str, str]],
    preferred_language: Optional[str] = None,
) -> tuple[List[Dict[str, str]], Optional[str]]:
    """Detect user's language and adapt system message for multilingual support.

    Args:
        messages: List of chat messages
        preferred_language: User-selected language preference (from frontend)

    Returns:
        Tuple of (adapted messages, detected language code)
    """
    try:
        from .ai4bharat import LANGUAGE_NAMES, ai4bharat_client

        # Get the last user message
        user_message = None
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_message = msg.get("content", "")
                break

        if not user_message or len(user_message) < 10:
            return messages, None

        # If user specified a preferred language, honor it first
        if preferred_language and preferred_language != "auto":
            detected_lang = preferred_language
            detection_result = {
                "success": True,
                "detected_language": preferred_language,
            }
        else:
            # Detect language
            detection_result = await ai4bharat_client.detect_language(user_message)
            detected_lang = detection_result.get("detected_language")

        if not detection_result.get("success"):
            return messages, None

        # Skip if English or unknown, unless preferred language is explicitly set
        if (not detected_lang or detected_lang == "en") and (not preferred_language or preferred_language == "en"):
            return messages, None

        # Handle code-mix specially
        if detected_lang == "code_mix":
            multilingual_instruction = """The user is mixing English and an Indic language. Please:
1. Preserve the mixed-language style naturally.
2. Use transliteration when the user types in Latin script for Indic words.
3. Provide concise, culturally aware answers (avoid literal word-for-word translation)."""
            adapted_messages = []
            system_found = False
            for msg in messages:
                if msg.get("role") == "system":
                    adapted_messages.append(
                        {
                            "role": "system",
                            "content": f"{msg.get('content', '')}\n\n{multilingual_instruction}",
                        }
                    )
                    system_found = True
                else:
                    adapted_messages.append(msg)
            if not system_found:
                adapted_messages.insert(
                    0, {"role": "system", "content": multilingual_instruction}
                )
            logging.info("Multilingual: Detected code-mix, adapted system message")
            return adapted_messages, detected_lang

        lang_info = LANGUAGE_NAMES.get(detected_lang, {})
        lang_name = lang_info.get("name", detected_lang)

        # Add multilingual instruction to system message
        cultural = LANGUAGE_NAMES.get(detected_lang, {}).get("name", detected_lang)
        try:
            from .ai4bharat import CULTURAL_CONTEXT

            cultural_hint = CULTURAL_CONTEXT.get(detected_lang, "")
        except Exception:
            cultural_hint = ""

        multilingual_instruction = f"""
The user is communicating in {lang_name}. Please:
1. Understand their message in {lang_name}
2. Provide your response in {lang_name} as well
3. Maintain natural, fluent {lang_name} throughout the conversation
4. Use culturally relevant examples (dates, currency, idioms) for {cultural}
{f"5. Cultural note: {cultural_hint}" if cultural_hint else ""}
"""

        # Find or create system message
        adapted_messages = []
        system_found = False

        for msg in messages:
            if msg.get("role") == "system":
                adapted_messages.append(
                    {
                        "role": "system",
                        "content": f"{msg.get('content', '')}\n\n{multilingual_instruction}",
                    }
                )
                system_found = True
            else:
                adapted_messages.append(msg)

        if not system_found:
            adapted_messages.insert(
                0, {"role": "system", "content": multilingual_instruction}
            )

        logging.info(f"Multilingual: Detected {lang_name}, adapted system message")
        return adapted_messages, detected_lang

    except Exception as e:
        logging.warning(f"Language detection failed: {e}")
        return messages, None


async def _augment_with_rag_context(
    messages: List[Dict[str, str]], top_k: int = 3
) -> List[Dict[str, str]]:
    """Augment messages with relevant context from knowledge base.

    Args:
        messages: List of chat messages
        top_k: Number of relevant documents to retrieve

    Returns:
        Augmented messages with RAG context injected into system message
    """
    try:
        from .services.embedding_service import embedding_service

        # Get the last user message as the query
        user_query = None
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_query = msg.get("content", "")
                break

        if not user_query or not embedding_service.index:
            return messages

        # Search knowledge base
        results = await embedding_service.search(user_query, top_k)

        if not results:
            return messages

        # Build context from results
        context_parts = []
        for i, (text, score) in enumerate(results, 1):
            context_parts.append(f"[{i}] {text}")

        context = "\n\n".join(context_parts)

        # Inject context into system message or create one
        rag_instruction = f"""You have access to the following relevant information from the knowledge base:

{context}

Use this information to provide accurate and contextual responses. If the information is relevant to the user's question, incorporate it naturally into your answer. If it's not relevant, you can ignore it."""

        # Find existing system message or create new one
        augmented_messages = []
        system_found = False

        for msg in messages:
            if msg.get("role") == "system":
                # Append RAG context to existing system message
                augmented_messages.append(
                    {
                        "role": "system",
                        "content": f"{msg.get('content', '')}\n\n{rag_instruction}",
                    }
                )
                system_found = True
            else:
                augmented_messages.append(msg)

        # If no system message exists, add one at the beginning
        if not system_found:
            augmented_messages.insert(0, {"role": "system", "content": rag_instruction})

        logging.info(f"RAG: Augmented messages with {len(results)} context snippets")
        return augmented_messages

    except Exception as e:
        logging.warning(f"RAG augmentation failed: {e}")
        return messages


@app.post("/api/chat/text")
async def chat_text(
    request: TextChatRequest, db: Optional[SessionType] = Depends(get_db)
):
    logging.info(
        "Chat API called with messages: %s", [m.content for m in request.messages]
    )

    # Rate limiting check
    rate_limit_ok, rate_limit_msg = await rate_limit_service.check_rate_limit()
    if not rate_limit_ok:
        return JSONResponse(
            content={"error": f"Rate limit exceeded: {rate_limit_msg}"},
            status_code=429,
        )

    # Check credits for non-free models
    model = request.model or "google/gemini-2.0-flash"  # Default to OpenRouter model
    credit_ok, credit_msg = await rate_limit_service.check_credits(model)
    if not credit_ok:
        return JSONResponse(
            content={"error": f"Credit limit exceeded: {credit_msg}"},
            status_code=402,
        )

    # Only OpenRouter client is supported
    try:
        _ensure_chat_client()
        provider = get_provider()
    except HTTPException as exc:
        return JSONResponse(
            content={"error": exc.detail},
            status_code=exc.status_code,
        )
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

    current_conversation_id, payload_messages = _prepare_conversation_context(
        request, db
    )

    # Detect language and adapt for multilingual support
    payload_messages, detected_lang = await _detect_and_adapt_language(
        payload_messages,
        preferred_language=request.preferred_language,
    )

    # Augment with RAG context
    payload_messages = await _augment_with_rag_context(payload_messages)

    # Convert Pydantic messages to dicts for provider
    provider_messages = [
        {"role": m["role"], "content": m["content"]} for m in payload_messages
    ]

    # Try to get from cache first
    cache_key = None
    try:
        from .services.cache_service import cache_service

        if cache_service.enabled:
            cache_payload = {
                "model": model,
                "temperature": request.temperature or 0.7,
                "max_tokens": request.max_tokens or 1024,
                "messages": provider_messages,
            }
            cache_digest = hashlib.sha256(
                json.dumps(
                    cache_payload,
                    ensure_ascii=False,
                    separators=(",", ":"),
                    sort_keys=True,
                ).encode("utf-8")
            ).hexdigest()
            cache_key = f"chat:v1:{cache_digest}"
            cached_response = await cache_service.get(cache_key)
            if cached_response:
                logging.info(f"Cache hit for key: {cache_key}")
                generated_title = generate_conversation_title_from_messages(
                    request.messages
                )
                _persist_messages(
                    db,
                    current_conversation_id,
                    request.messages,
                    cached_response.get("response"),
                    generated_title,
                )
                return {
                    "response": cached_response.get("response"),
                    "usage": {"tokens": cached_response.get("tokens", 0)},
                    "model": model,
                    "conversation_id": current_conversation_id or 0,
                    "title": generated_title,
                    "cached": True,
                }
    except Exception as e:
        logging.warning(f"Cache check failed: {e}")

    try:
        result = await provider.chat_completion(
            messages=provider_messages,
            model=model,
            temperature=request.temperature or 0.7,
            max_tokens=request.max_tokens or 1024,
            stream=False,
        )
        # Record usage for rate limiting
        await rate_limit_service.record_request(model, result.get("tokens", 0))
    except Exception as e:
        logging.error(f"Chat completion error: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=502)

    if "error" in result:
        return JSONResponse(content={"error": result["error"]}, status_code=502)

    generated_title = generate_conversation_title_from_messages(request.messages)

    _persist_messages(
        db,
        current_conversation_id,
        request.messages,
        result.get("response"),
        generated_title,
    )

    # Save to cache
    if cache_key:
        try:
            from .services.cache_service import cache_service

            if cache_service.enabled:
                await cache_service.set(
                    cache_key,
                    {"response": result["response"], "tokens": result.get("tokens", 0)},
                    ttl=3600,
                )  # Cache for 1 hour
        except Exception as e:
            logging.warning(f"Cache set failed: {e}")

    return {
        "response": result["response"],
        "usage": {"tokens": result["tokens"]},
        "model": request.model,
        "conversation_id": current_conversation_id or 0,
        "title": generated_title,
    }


@app.post("/api/chat/stream")
async def chat_text_stream(
    request: TextChatRequest, db: Optional[SessionType] = Depends(get_db)
):
    logging.info(
        "Chat stream API called with messages: %s",
        [m.content for m in request.messages],
    )

    if not CHAT_CLIENT_AVAILABLE:

        async def error_generator():
            yield _sse_event(
                "error",
                {
                    "message": "Chat functionality is not available. Please check server configuration."
                },
            )

        return StreamingResponse(error_generator(), media_type="text/event-stream")

    current_conversation_id, payload_messages = _prepare_conversation_context(
        request, db
    )

    # Detect language and adapt for multilingual support
    payload_messages, detected_lang = await _detect_and_adapt_language(
        payload_messages,
        preferred_language=request.preferred_language,
    )

    # Augment messages with RAG context
    payload_messages = await _augment_with_rag_context(payload_messages)

    candidate_title = generate_conversation_title_from_messages(request.messages)
    user_messages = list(request.messages)
    model_id = request.model or None
    temperature = request.temperature or 0.7
    max_tokens = request.max_tokens or 1024

    async def async_event_generator():
        accumulated_chunks: List[str] = []
        final_tokens: Optional[int] = None

        try:
            provider = get_provider()
            provider_messages = [
                {"role": m["role"], "content": m["content"]}
                for m in payload_messages
            ]

            stream_source = await provider.chat_completion(
                messages=provider_messages,
                model=model_id,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

            async for chunk in stream_source:
                if chunk.get("error"):
                    yield _sse_event(
                        "error",
                        {
                            "message": str(chunk.get("error")),
                            "conversation_id": current_conversation_id or 0,
                        },
                    )
                    return

                content = chunk.get("content")
                if content:
                    accumulated_chunks.append(str(content))
                    yield _sse_event("delta", {"content": content})
        except Exception as e:
            logging.error(f"Streaming error: {e}")
            yield _sse_event(
                "error",
                {"message": str(e), "conversation_id": current_conversation_id or 0},
            )
            return

        final_text = "".join(accumulated_chunks)
        final_tokens_value = final_tokens or (
            len(final_text.split()) if final_text else 0
        )

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

        _persist_messages(
            db, current_conversation_id, user_messages, final_text, candidate_title
        )

    return StreamingResponse(async_event_generator(), media_type="text/event-stream")


@app.options("/api/chat/stream")
async def chat_text_stream_options(request: Request) -> Response:
    """Handle CORS preflight for the streaming endpoint."""
    headers = _cors_headers(request, methods="POST, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.get("/api/chat/text")
def chat_text_info():
    """Get information about the chat text endpoint."""
    return {
        "success": True,
        "message": "This endpoint accepts POST requests only. Use POST method to send messages.",
        "usage": {
            "method": "POST",
            "content_type": "application/json",
            "example_request": {
                "messages": [{"role": "user", "content": "Hello, how are you?"}],
                "model": "meta-llama/llama-2-13b-chat:free",
                "temperature": 0.7,
                "max_tokens": 1024,
            },
        },
    }


@app.options("/api/chat/text")
async def chat_text_options(request: Request) -> Response:
    """Explicitly handle CORS preflight requests."""
    headers = _cors_headers(request, methods="POST, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.get("/api/models")
async def list_models():
    try:
        _ensure_chat_client()
        provider = get_provider()
        models = await provider.list_models()
        return {
            "success": True,
            "models": models,
            "default": getattr(provider, "default_model", None),
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error listing models: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e), "models": []},
            status_code=500,
        )


@app.options("/api/models")
async def list_models_options(request: Request) -> Response:
    headers = _cors_headers(request, methods="GET, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.get("/api/provider/status")
def provider_status():
    if not CHAT_CLIENT_AVAILABLE:
        return JSONResponse(
            content={
                "success": False,
                "configured": False,
                "message": "Chat client unavailable.",
            },
            status_code=503,
        )

    try:
        provider = get_provider()
        return {
            "success": True,
            "configured": True,
            "provider": provider.__class__.__name__,
            "available": provider.is_available(),
            "default_model": getattr(provider, "default_model", None),
        }
    except Exception as e:
        return JSONResponse(
            content={"success": False, "configured": False, "error": str(e)},
            status_code=500,
        )


@app.get("/api/rate-limit/status")
async def rate_limit_status(request: Request):
    """Get current rate limit and credit status."""
    headers = _cors_headers(request)
    try:
        status = await rate_limit_service.get_status()
        return JSONResponse(content={"success": True, **status}, headers=headers)
    except Exception as e:
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500,
            headers=headers,
        )


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
    return [
        {"id": c.id, "title": c.title, "created_at": c.created_at}
        for c in conversations
    ]


@app.options("/api/conversations")
async def conversations_options(request: Request) -> Response:
    headers = _cors_headers(request, methods="GET, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.get("/api/conversations/{conversation_id}")
def get_conversation_messages(
    conversation_id: int, db: Optional[SessionType] = Depends(get_db)
):
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
        ],
    }


@app.options("/api/conversations/{conversation_id}")
async def conversation_detail_options(
    request: Request, conversation_id: int
) -> Response:  # pragma: no cover - simple CORS response
    headers = _cors_headers(request, methods="GET, OPTIONS")
    return Response(status_code=204, headers=headers)


@app.websocket("/api/chat/voice")
async def voice_chat(websocket: WebSocket):
    """Advanced voice chat using NVIDIA Nemotron Nano 9B V2 with STT and TTS.
    
    Protocol:
    - Client sends: {"type": "audio", "data": base64_audio, "language": "en", "stream": false}
    - Server responds: {"type": "result", "transcription": {...}, "response": {...}}
    
    For streaming:
    - Client sends: {"type": "audio", "data": base64_audio, "stream": true}
    - Server streams: {"type": "transcription", ...}, {"type": "text_chunk", ...}, {"type": "audio", ...}
    """
    await websocket.accept()
    conversation_history = []
    
    try:
        from .services.voice_service import voice_service
        
        while True:
            # Receive message from client
            message = await websocket.receive_json()
            
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            
            if message.get("type") == "audio":
                try:
                    # Decode base64 audio
                    audio_b64 = message.get("data", "")
                    audio_bytes = base64.b64decode(audio_b64)
                    
                    language = message.get("language")
                    stream = message.get("stream", False)
                    voice = message.get("voice")
                    speed = message.get("speed", 1.0)
                    
                    if stream:
                        # Streaming mode - send chunks as they arrive
                        async for chunk in voice_service.process_voice_stream(
                            audio_bytes=audio_bytes,
                            conversation_history=conversation_history.copy(),
                            language=language,
                        ):
                            await websocket.send_json(chunk)
                            
                            # Update conversation history when we get the full transcription
                            if chunk.get("type") == "transcription":
                                conversation_history.append({
                                    "role": "user",
                                    "content": chunk.get("text", "")
                                })
                    else:
                        # Synchronous mode - send complete result
                        result = await voice_service.process_voice_message(
                            audio_bytes=audio_bytes,
                            conversation_history=conversation_history.copy(),
                            language=language,
                            voice=voice,
                            speed=speed,
                        )
                        
                        # Update conversation history
                        if result.get("success"):
                            conversation_history.append({
                                "role": "user",
                                "content": result["transcription"]["text"]
                            })
                            conversation_history.append({
                                "role": "assistant",
                                "content": result["response"]["text"]
                            })
                        
                        await websocket.send_json({"type": "result", **result})
                        
                except Exception as e:
                    logging.error(f"Voice processing error: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "error": str(e),
                        "success": False
                    })
            
            elif message.get("type") == "reset":
                # Reset conversation history
                conversation_history = []
                await websocket.send_json({
                    "type": "reset_confirmed",
                    "success": True
                })
            
            elif message.get("type") == "end":
                # Client wants to end the session
                await websocket.send_json({
                    "type": "goodbye",
                    "success": True
                })
                break
                
    except WebSocketDisconnect:
        logging.info("Voice chat WebSocket disconnected")
    except Exception as e:
        logging.error(f"Voice chat error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e),
                "success": False
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


# AI4Bharat Endpoints for Indian Language Support


@app.get("/api/ai4bharat/languages")
def get_supported_languages(request: Request):
    """Get list of supported Indian languages"""
    headers = _cors_headers(request)
    languages = ai4bharat_client.get_supported_languages()
    return JSONResponse(
        content={"success": True, "languages": languages, "count": len(languages)},
        headers=headers,
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
                headers=headers,
            )

        result = await ai4bharat_client.translate(text, source_lang, target_lang)

        return JSONResponse(content=result, headers=headers)

    except Exception as e:
        logging.error(f"Translation error: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500,
            headers=headers,
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
                headers=headers,
            )

        result = await ai4bharat_client.detect_language(text)

        return JSONResponse(content=result, headers=headers)

    except Exception as e:
        logging.error(f"Language detection error: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500,
            headers=headers,
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
                headers=headers,
            )

        result = await ai4bharat_client.transliterate(
            text, source_script, target_script
        )

        return JSONResponse(content=result, headers=headers)

    except Exception as e:
        logging.error(f"Transliteration error: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500,
            headers=headers,
        )


if __name__ == "__main__":
    import uvicorn  # type: ignore[import-not-found]

    # Respect platform-provided PORT (e.g. Railway/Render); fall back to local default
    port = int(os.getenv("PORT", "8001"))

    # Allow overriding bind host; default to localhost for safety
    host = os.getenv("FASTAPI_BIND_HOST", "127.0.0.1")

    uvicorn.run(app, host=host, port=port, log_level="info")
