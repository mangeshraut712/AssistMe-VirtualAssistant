# 📁 Vercel Serverless API Functions

This directory contains serverless functions for Vercel deployment.

## 📂 Directory Overview

```
api/
├── chat.js              # Chat endpoint (streaming)
├── health.js            # Health check endpoint
├── tts.js               # Text-to-speech endpoint
│
├── gemini/              # Gemini AI endpoints
│   ├── route.js         # Main Gemini route
│   └── ...
│
├── images/              # Image generation endpoints
│   └── generate.js      # Image generation
│
└── xai/                 # xAI/Grok endpoints
    └── ...
```

## 🚀 Deployment

These functions are automatically deployed when pushing to Vercel:

1. Push to GitHub
2. Vercel auto-deploys from `main` branch
3. Functions available at `https://your-app.vercel.app/api/*`

## 📡 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Chat with AI (streaming) |
| `/api/health` | GET | Health check |
| `/api/tts` | POST | Text-to-Speech |
| `/api/gemini` | POST | Gemini AI |
| `/api/images/generate` | POST | Generate images |

## 🔑 Environment Variables

Required in Vercel:
- `OPENROUTER_API_KEY` - OpenRouter API key
- `GEMINI_API_KEY` - Google Gemini API key

## 📝 Notes

- These are edge functions optimized for Vercel's edge network
- They mirror the FastAPI backend functionality for Vercel deployment
- Use the FastAPI backend for local development
