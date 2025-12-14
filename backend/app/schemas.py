"""
Pydantic Schemas for AssistMe API (2025 Edition)

Features:
- Pydantic v2 with model_config
- Strict validation with ConfigDict
- Computed fields and validators
- Proper serialization with model_dump()
- OpenAPI schema improvements
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Annotated, Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    computed_field,
    field_validator,
    model_validator,
)


# ==============================================================================
# Enums
# ==============================================================================

class MessageRole(str, Enum):
    """Chat message roles."""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    FUNCTION = "function"


class ModelProvider(str, Enum):
    """AI model providers."""
    OPENROUTER = "openrouter"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"


# ==============================================================================
# Base Schemas
# ==============================================================================

class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(
        from_attributes=True,  # Enable ORM mode
        populate_by_name=True,  # Allow population by field name or alias
        str_strip_whitespace=True,  # Strip whitespace from strings
        validate_assignment=True,  # Validate on assignment
        extra="forbid",  # Forbid extra fields by default
    )


class TimestampMixin(BaseModel):
    """Mixin for timestamp fields."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = None


# ==============================================================================
# User Schemas
# ==============================================================================

class UserBase(BaseSchema):
    """Base user schema."""
    email: EmailStr
    username: Annotated[str, Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")]


class UserCreate(UserBase):
    """Schema for user creation."""
    password: Annotated[str, Field(min_length=8, max_length=128)]

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Ensure password meets strength requirements."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseSchema):
    """Schema for user login."""
    username: str
    password: str


class UserResponse(UserBase, TimestampMixin):
    """Schema for user response (excludes password)."""
    id: int
    is_active: bool = True


# ==============================================================================
# Authentication Schemas
# ==============================================================================

class Token(BaseSchema):
    """JWT token response."""
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(description="Token expiration time in seconds")


class TokenData(BaseSchema):
    """JWT token payload data."""
    username: str | None = None
    user_id: int | None = None
    exp: datetime | None = None


# ==============================================================================
# Chat Schemas
# ==============================================================================

class ChatMessage(BaseSchema):
    """Single chat message."""

    model_config = ConfigDict(extra="allow")  # Allow extra fields for flexibility

    role: MessageRole | str
    content: str = Field(min_length=1, max_length=100000)
    name: str | None = None  # For function messages

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, v: str | MessageRole) -> str:
        """Normalize role to lowercase string."""
        if isinstance(v, MessageRole):
            return v.value
        return v.lower() if isinstance(v, str) else str(v)


class TextChatRequest(BaseSchema):
    """Request schema for text chat."""

    model_config = ConfigDict(extra="ignore")  # Ignore unknown fields

    messages: list[ChatMessage] = Field(min_length=1, max_length=100)
    model: str | None = Field(default=None, max_length=100)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, ge=1, le=128000)
    conversation_id: int | None = None
    preferred_language: str | None = Field(default=None, max_length=10)
    stream: bool = False

    # Advanced options
    top_p: float | None = Field(default=None, ge=0.0, le=1.0)
    frequency_penalty: float | None = Field(default=None, ge=-2.0, le=2.0)
    presence_penalty: float | None = Field(default=None, ge=-2.0, le=2.0)
    stop: list[str] | None = Field(default=None, max_length=4)

    @model_validator(mode="after")
    def validate_messages(self) -> "TextChatRequest":
        """Ensure messages are valid."""
        if not self.messages:
            raise ValueError("At least one message is required")
        return self


class ChatUsage(BaseSchema):
    """Token usage statistics."""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    @computed_field
    @property
    def estimated_cost(self) -> float:
        """Estimate cost based on typical pricing."""
        # Rough estimate: $0.001 per 1K tokens
        return self.total_tokens * 0.000001


class ChatChoice(BaseSchema):
    """Single chat completion choice."""
    index: int = 0
    message: ChatMessage
    finish_reason: Literal["stop", "length", "content_filter", None] = None


class ChatCompletionResponse(BaseSchema):
    """Chat completion response."""
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp()))
    model: str
    choices: list[ChatChoice]
    usage: ChatUsage | None = None


class StreamDelta(BaseSchema):
    """Streaming response delta."""
    type: Literal["delta", "done", "error", "metadata"] = "delta"
    content: str = ""
    finish_reason: str | None = None


# ==============================================================================
# Conversation Schemas
# ==============================================================================

class ConversationBase(BaseSchema):
    """Base conversation schema."""
    title: str | None = Field(default=None, max_length=200)


class ConversationCreate(ConversationBase):
    """Schema for conversation creation."""
    pass


class ConversationResponse(ConversationBase, TimestampMixin):
    """Schema for conversation response."""
    id: int
    message_count: int = 0


class ConversationWithMessages(ConversationResponse):
    """Conversation with its messages."""
    messages: list[ChatMessage] = []


# ==============================================================================
# Health & Status Schemas
# ==============================================================================

class HealthStatus(BaseSchema):
    """Health check response."""
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    checks: dict[str, bool] = {}


class APIStatus(BaseSchema):
    """API status response."""
    name: str
    version: str
    environment: str
    ai_configured: bool
    database_connected: bool
    uptime_seconds: float | None = None


# ==============================================================================
# Error Schemas
# ==============================================================================

class ErrorDetail(BaseSchema):
    """Error detail schema."""
    loc: list[str | int] | None = None
    msg: str
    type: str


class ErrorResponse(BaseSchema):
    """Standard error response."""
    detail: str | list[ErrorDetail]
    code: str | None = None
    request_id: str | None = None


# ==============================================================================
# Image Generation Schemas
# ==============================================================================

class ImageGenerationRequest(BaseSchema):
    """Request for image generation."""
    prompt: str = Field(min_length=1, max_length=4000)
    model: str = Field(default="dall-e-3")
    size: Literal["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"] = "1024x1024"
    quality: Literal["standard", "hd"] = "standard"
    n: int = Field(default=1, ge=1, le=4)


class GeneratedImage(BaseSchema):
    """Generated image response."""
    url: str
    revised_prompt: str | None = None


class ImageGenerationResponse(BaseSchema):
    """Image generation response."""
    created: int
    images: list[GeneratedImage]


# ==============================================================================
# Voice/Speech Schemas
# ==============================================================================

class TranscriptionRequest(BaseSchema):
    """Request for audio transcription."""
    model: str = Field(default="whisper-1")
    language: str | None = None
    prompt: str | None = None


class TranscriptionResponse(BaseSchema):
    """Transcription response."""
    text: str
    language: str | None = None
    duration: float | None = None


class TTSRequest(BaseSchema):
    """Text-to-speech request."""
    text: str = Field(min_length=1, max_length=4096)
    voice: str = Field(default="alloy")
    model: str = Field(default="tts-1")
    speed: float = Field(default=1.0, ge=0.25, le=4.0)


# ==============================================================================
# Knowledge/RAG Schemas
# ==============================================================================

class KnowledgeSearchRequest(BaseSchema):
    """Knowledge base search request."""
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)
    threshold: float = Field(default=0.7, ge=0.0, le=1.0)


class KnowledgeDocument(BaseSchema):
    """Knowledge document."""
    id: str
    content: str
    score: float
    metadata: dict[str, Any] = {}


class KnowledgeSearchResponse(BaseSchema):
    """Knowledge search response."""
    query: str
    results: list[KnowledgeDocument]
    total: int
