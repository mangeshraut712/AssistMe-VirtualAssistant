# API folder (legacy Vercel serverless)

This directory contains Node serverless functions that previously ran on Vercel.

**GitHub Pages does not run these files.** Production frontend hosting is static Pages only:

https://mangeshraut712.github.io/AssistMe-VirtualAssistant/

## What to run instead

Use the FastAPI app in `backend/` for chat, health, TTS, images, and related routes:

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

See `backend/README.md` for dependencies and environment variables.

## Endpoints (FastAPI / this folder historically)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Chat with AI (streaming) |
| `/api/health` | GET | Health check |
| `/api/tts` | POST | Text-to-Speech |
| `/api/gemini` | POST | Gemini AI |
| `/api/images/generate` | POST | Generate images |

Required secrets belong on the **backend host**, not GitHub Pages:

- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
