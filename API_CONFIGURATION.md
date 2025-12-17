# API Configuration & Health Check Guide

## 🌐 Deployment URLs

### Production (Vercel)
- **Frontend:** https://assist-me-virtual-assistant.vercel.app/
- **Health Check:** https://assist-me-virtual-assistant.vercel.app/health
- **Chat API:** https://assist-me-virtual-assistant.vercel.app/api/chat

### Local Development
- **Frontend:** http://localhost:5173/
- **Health Check:** http://localhost:5173/health
- **Chat API:** http://localhost:5173/api/chat
- **FastAPI Backend:** http://localhost:8000/ (when running)

---

## 🏗️ Architecture

### Localhost (Development)
```
Frontend (http://localhost:5173)
    ↓ Vite Proxy
FastAPI Backend (http://localhost:8000)
```

**How it works:**
1. Frontend runs on port 5173
2. FastAPI runs on port 8000
3. Vite proxies `/api/*` requests → `http://localhost:8000`
4. No CORS issues due to same-origin

### Vercel (Production)
```
Frontend (Vercel Edge)
    ↓ Edge Functions
Vercel Serverless Functions (api/*.js)
```

**How it works:**
1. Static frontend served by Vercel CDN
2. API requests routed to Edge Functions
3. Edge Functions in `/api/*.js` handle requests
4. No FastAPI backend needed (serverless)

---

## 📋 API Endpoints

### Health Check
- **Endpoint:** `GET /health` or `GET /api/health`
- **Returns:** Service status, API configuration, version
- **Status Codes:**
  - `200` - Healthy (API keys configured)
  - `503` - Degraded (missing API keys)

**Example Response:**
```json
{
  "status": "healthy",
  "service": "assistme-api",
  "version": "3.0.0",
  "components": {
    "chat_client": {
      "status": "available",
      "provider": "openrouter",
      "api_key_configured": true
    }
  }
}
```

### Chat API
- **Endpoint:** `POST /api/chat`
- **Body:**
```json
{
  "message": "Hello!",
  "model": "google/gemini-2.5-flash",
  "conversationHistory": []
}
```
- **Returns:** AI response

### TTS API
- **Endpoint:** `POST /api/tts`
- **Body:**
```json
{
  "text": "Hello world",
  "language": "en-US",
  "model": "native"
}
```
- **Returns:** Base64 audio data

### Image Generation
- **Endpoint:** `POST /api/images/generate`
- **Body:**
```json
{
  "prompt": "A sunset",
  "model": "flux",
  "size": "1024x1024"
}
```

---

## ⚙️ Configuration Files

### vite.config.js (Localhost Proxy)
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',  // FastAPI backend
      changeOrigin: true,
    },
    '/health': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
```

### vercel.json (Production Routing)
```json
{
  "rewrites": [
    { "source": "/api/chat", "destination": "/api/chat.js" },
    { "source": "/health", "destination": "/api/health.js" }
  ]
}
```

---

## 🔑 Environment Variables

### Required for Production (Vercel)
Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
GOOGLE_API_KEY=AIza...
POLLINATIONS_API_KEY=... (optional)
```

### Required for Localhost
Create `.env` in backend folder:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
GOOGLE_API_KEY=AIza...
```

---

## 🚀 Running Locally

### Option 1: Full Stack (Frontend + FastAPI)

**Terminal 1 - FastAPI Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Access:** http://localhost:5173/
- All `/api/*` requests proxy to FastAPI
- Full backend features available

### Option 2: Frontend Only (Edge Functions)

```bash
npm run dev
```

**Access:** http://localhost:5173/
- Uses Edge Function fallbacks (limited)
- No FastAPI needed
- Some features may not work

---

## 🧪 Testing Health Check

### Test Localhost
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check through proxy
curl http://localhost:5173/health
```

### Test Production
```bash
curl https://assist-me-virtual-assistant.vercel.app/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "assistme-api",
  "components": {
    "chat_client": {
      "status": "available"
    }
  }
}
```

---

## ✅ Verification Checklist

### Localhost
- [ ] FastAPI running on port 8000
- [ ] Frontend running on port 5173
- [ ] `/health` returns 200
- [ ] `/api/chat` accepts messages
- [ ] Voice mode works
- [ ] Image generation works
- [ ] TTS works

### Vercel
- [ ] Site loads: https://assist-me-virtual-assistant.vercel.app/
- [ ] `/health` returns 200
- [ ] API keys configured in Vercel
- [ ] Chat works
- [ ] Voice mode works (standard browser TTS)
- [ ] Image generation works

---

## 🐛 Troubleshooting

### "Failed to fetch" on localhost
- **Cause:** FastAPI backend not running
- **Fix:** Start backend: `cd backend && python -m uvicorn app.main:app --reload --port 8000`

### "API key not configured" on Vercel
- **Cause:** Missing environment variables
- **Fix:** Set `OPENROUTER_API_KEY` in Vercel Dashboard

### CORS errors
- **Localhost:** Should not happen (proxy handles it)
- **Vercel:** Check `vercel.json` headers configuration

### Voice Mode not working
- **Premium Mode:** Requires `/api/tts` endpoint
- **Standard Mode:** Uses browser TTS (always works)

---

## 📊 Feature Availability Matrix

| Feature | Localhost (Full) | Localhost (FE Only) | Vercel |
|---------|------------------|---------------------|--------|
| Chat | ✅ FastAPI | ⚠️ Edge Fallback | ✅ Edge Functions |
| Voice Mode (Standard) | ✅ | ✅ | ✅ |
| Voice Mode (Premium) | ✅ | ❌ | ✅ |
| TTS | ✅ FastAPI | ⚠️ Limited | ✅ Edge |
| Image Gen | ✅ FastAPI | ⚠️ Limited | ✅ Edge |
| Speedtest | ✅ | ✅ | ✅ |
| All Features | ✅ | ⚠️ | ✅ |

---

## 🔗 Quick Links

### Testing URLs
- **Localhost Health:** http://localhost:5173/health
- **Vercel Health:** https://assist-me-virtual-assistant.vercel.app/health
- **Localhost App:** http://localhost:5173/
- **Vercel App:** https://assist-me-virtual-assistant.vercel.app/

### Documentation
- **Vite Proxy:** https://vitejs.dev/config/server-options.html#server-proxy
- **Vercel Rewrites:** https://vercel.com/docs/projects/project-configuration#rewrites
- **OpenRouter API:** https://openrouter.ai/docs

---

**Last Updated:** December 17, 2025
