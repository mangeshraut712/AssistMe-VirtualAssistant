from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime

# Define models without Base - will be registered later
class User:
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True)
    email = Column(String(255), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Conversation:
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

class Message:
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String(50))  # user, assistant
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
