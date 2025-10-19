from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging
import os
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from .chat_client import grok_client
from .database import get_db
from .models import Conversation, Message as MessageModel

app = FastAPI(title="AssistMe API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://assist-me-virtual-assistant.vercel.app"],  # Frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    return {"status": "ok", "service": "assistme-api"}

@app.get("/")
def root():
    return {"message": "AssistMe API is running"}

@app.post("/api/chat/text")
async def chat_text(request: TextChatRequest, db: Session = Depends(get_db)):
    logging.info("Chat API called with messages: %s", [m.content for m in request.messages])
    
    conversation = None
    if request.conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Create new conversation with first user message as title
        title = request.messages[-1].content[:50] if request.messages else "New Chat"
        conversation = Conversation(title=title)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    for msg in request.messages:
        db_msg = MessageModel(
            conversation_id=conversation.id,
            role=msg.role,
            content=msg.content,
        )
        db.add(db_msg)
    db.commit()

    conversation_history = (
        db.query(MessageModel)
        .filter(MessageModel.conversation_id == conversation.id)
        .order_by(MessageModel.created_at.asc())
        .all()
    )

    payload_messages = [
        {"role": message.role, "content": message.content}
        for message in conversation_history
    ]

    result = await run_in_threadpool(
        grok_client.generate_response,
        payload_messages,
        request.model,
        request.temperature,
        request.max_tokens,
    )
    if "error" in result:
        return {"error": result["error"]}
    
    # Save assistant response
    assistant_msg = MessageModel(conversation_id=conversation.id, role="assistant", content=result["response"])
    db.add(assistant_msg)
    db.commit()

    return {
        "response": result["response"],
        "usage": {"tokens": result["tokens"]},
        "model": request.model,
        "conversation_id": conversation.id
    }

@app.get("/api/conversations")
def get_conversations(db: Session = Depends(get_db)) -> List[dict]:
    conversations = db.query(Conversation).all()
    return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in conversations]

@app.get("/api/conversations/{conversation_id}")
def get_conversation_messages(conversation_id: int, db: Session = Depends(get_db)):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = (
        db.query(MessageModel)
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
    import uvicorn  # type: ignore[import]

    # Respect platform-provided PORT (e.g. Railway/Render); fall back to local default
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
