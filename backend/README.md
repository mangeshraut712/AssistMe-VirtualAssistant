# 📁 AssistMe Backend Structure

This document describes the organization of the `backend/` directory.

## 📂 Directory Overview

```
backend/
├── app/                     # Main application package
│   ├── core/                # Core utilities
│   │   └── security.py      # Authentication & security
│   │
│   ├── data/                # Data files
│   │   └── *.json           # Language data, etc.
│   │
│   ├── providers/           # LLM Provider integrations
│   │   ├── __init__.py      # Provider factory
│   │   ├── base.py          # Base provider class
│   │   ├── factory.py       # Provider factory
│   │   └── openrouter.py    # OpenRouter implementation
│   │
│   ├── routes/              # API route handlers
│   │   ├── __init__.py      # Route registration
│   │   ├── auth.py          # Authentication routes
│   │   ├── gemini.py        # Gemini API routes
│   │   ├── health.py        # Health check routes
│   │   ├── image.py         # Image generation routes
│   │   ├── knowledge.py     # Knowledge/Grokipedia routes
│   │   ├── multimodal.py    # Multimodal routes
│   │   ├── speech.py        # Speech routes
│   │   ├── speedtest.py     # Speed test routes
│   │   └── tts.py           # Text-to-speech routes
│   │
│   ├── services/            # Business logic services
│   │   ├── __init__.py      # Service exports
│   │   ├── cache_service.py
│   │   ├── embedding_service.py
│   │   ├── file_service.py
│   │   ├── image_service.py
│   │   ├── rate_limit_service.py
│   │   ├── tts_service.py
│   │   ├── voice_service.py
│   │   ├── web_search_service.py
│   │   └── whisper_service.py
│   │
│   ├── __init__.py          # Package init
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── dependencies.py      # FastAPI dependencies
│   ├── logging_config.py    # Logging configuration
│   ├── main.py              # FastAPI app entry point
│   ├── middleware.py        # Custom middleware
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   └── settings.py          # Environment settings
│
├── alembic/                 # Database migrations
│   └── versions/            # Migration files
│
├── uploads/                 # User uploaded files
│
├── .bandit                  # Security linting config
├── .flake8                  # Flake8 linting config
├── .pylintrc                # Pylint config
├── alembic.ini              # Alembic config
├── Dockerfile               # Docker build file
├── requirements.txt         # Production dependencies
├── requirements-ci.txt      # CI/testing dependencies
└── start.sh                 # Startup script
```

## 🏗️ Architecture

### API Routes → Services → Providers
```
Request → Route Handler → Service → Provider → External API
                                            ↓
Response ← Route Handler ← Service ← Provider ← Response
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **Routes** | HTTP endpoint handlers |
| **Services** | Business logic, processing |
| **Providers** | External API integrations |
| **Models** | Database models (SQLAlchemy) |
| **Schemas** | Request/Response validation (Pydantic) |

## 🔧 Key Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app with all routes |
| `config.py` | Environment configuration |
| `database.py` | Database connection & session |
| `schemas.py` | Pydantic models for validation |
| `middleware.py` | CORS, logging, error handling |

## 🚀 Running the Backend

```bash
# Development
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 🔑 Environment Variables

Required in `backend/.env`:
```env
OPENROUTER_API_KEY=sk-or-...
TAVILY_API_KEY=tvly-...
GEMINI_API_KEY=...
SECRET_KEY=your-secret-key
```

## 📡 API Endpoints

### Chat
- `POST /api/chat` - Send chat message
- `POST /api/chat/stream` - Stream chat response

### Knowledge (Grokipedia)
- `POST /api/knowledge/grokipedia/stream` - Stream article
- `POST /api/knowledge/search` - Search knowledge

### Image
- `POST /api/image/generate` - Generate image

### Voice
- `POST /api/tts/synthesize` - Text to speech
- `POST /api/stt/transcribe` - Speech to text

### Health
- `GET /health` - Health check
- `GET /api/speedtest/run` - Speed test
