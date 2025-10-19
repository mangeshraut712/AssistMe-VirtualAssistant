from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional
import logging
import os
from datetime import datetime
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from .chat_client import grok_client
from .database import get_db
from .models import Conversation, Message as MessageModel

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8001",
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

@app.get("/health")
def health():
    return {"status": "ok", "service": "assistme-api", "version": "1.0.0", "timestamp": datetime.now().isoformat()}

@app.get("/")
def root():
    return {"message": "AssistMe API is running"}

@app.post("/api/chat/text")
async def chat_text(request: TextChatRequest, db: Optional[Session] = Depends(get_db)):
    logging.info("Chat API called with messages: %s", [m.content for m in request.messages])

    conversation_id = getattr(request, 'conversation_id', None) or None
    conversation_history = []
    conversation_title = f"Conversation {datetime.now().timestamp()}"
    current_conversation_id = conversation_id

    if db and conversation_id:
        # Database is available
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()  # type: ignore
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation_history = (
            db.query(MessageModel)  # type: ignore
            .filter(MessageModel.conversation_id == conversation.id)
            .order_by(MessageModel.created_at.asc())
            .all()
        )
        conversation_title = conversation.title
        current_conversation_id = conversation.id
    elif db and not conversation_id:
        # Create new conversation only if database is available
        title = request.messages[-1].content[:50] if request.messages else "New Chat"
        conversation = Conversation(title=title)  # type: ignore
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        current_conversation_id = conversation.id

    # Use existing messages or just the current request
    if conversation_history:
        payload_messages = [
            {"role": message.role, "content": message.content}
            for message in conversation_history
        ]
    else:
        payload_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]

    result = await run_in_threadpool(
        grok_client.generate_response,
        payload_messages,
        request.model or None,  # type: ignore
        request.temperature or 0.7,
        request.max_tokens or 1024,
    )
    if "error" in result:
        return {"error": result["error"]}

    # Save to database if available, but don't fail if not
    if db and current_conversation_id:
        try:
            # Save user message if not already saved
            for msg in request.messages:
                db_msg = MessageModel(
                    conversation_id=current_conversation_id,  # type: ignore
                    role=msg.role,  # type: ignore
                    content=msg.content,  # type: ignore
                )
                db.add(db_msg)

            # Save assistant response
            assistant_msg = MessageModel(conversation_id=current_conversation_id, role="assistant", content=result["response"])  # type: ignore
            db.add(assistant_msg)
            db.commit()
        except Exception as e:
            logging.warning(f"Failed to save to database: {e}")

    return {
        "response": result["response"],
        "usage": {"tokens": result["tokens"]},
        "model": request.model,
        "conversation_id": current_conversation_id or 0
    }


@app.options("/api/chat/text")
async def chat_text_options() -> Response:
    """Explicitly handle CORS preflight requests."""
    return Response(status_code=204)

@app.get("/api/conversations")
def get_conversations(db: Optional[Session] = Depends(get_db)) -> List[dict]:
    if db:
        conversations = db.query(Conversation).all()  # type: ignore
        return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in conversations]
    else:
        # No database, return empty list
        return []

@app.get("/api/conversations/{conversation_id}")
def get_conversation_messages(conversation_id: int, db: Optional[Session] = Depends(get_db)):
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
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
