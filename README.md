# AssistMe Virtual Assistant

An AI-powered web assistant that integrates with OpenRouter to provide responses from premium AI models through a sleek web interface. Built with FastAPI backend and vanilla JavaScript frontend for modern, real-time streaming AI chat experiences.

![Status](https://img.shields.io/badge/status-production--ready-green)
![Models](https://img.shields.io/badge/AI%20Models-8/10%20working-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Features

### Core Capabilities
- **Real-time AI Chat**: Streaming responses from premium AI models
- **Multi-Model Support**: Choose from 10+ curated OpenRouter models
- **Modern UI**: Sleek, responsive web interface with dark/light themes
- **Offline Mode**: Graceful fallback with simulated responses
- **Rate Limiting**: Built-in protection against API abuse
- **CORS Ready**: Deployed across multiple domains (Vercel + Railway)

### AI Models Supported

| Model | Status | Provider | Context | Performance |
|-------|--------|----------|---------|-------------|
| **Google Gemini 2.0 Flash** | ✅ Working | Google | 1M tokens | Fast, multimodal |
| **Meta Llama 3.3 70B** | ✅ Working | Meta | 131K tokens | Excellent quality |
| **NVIDIA Nemotron Nano 9B** | ✅ Working | NVIDIA | 131K tokens | Balanced performance |
| **Mistral Nemo** | ✅ Working | Mistral | 128K tokens | Consistent responses |
| **DeepSeek R1** | ✅ Working | DeepSeek | 163K tokens | RAG-ready |
| **Qwen3 Coder** | ✅ Working | Alibaba | 262K tokens | Code-focused |
| **MoonshotAI Kimi Dev** | ✅ Working | MoonshotAI | 128K tokens | Creative writing |
| **Zhipu GLM 4.5 Air** | ✅ Mixed | Zhipu AI | 128K tokens | Cost-effective |
| **Microsoft MAI DS R1** | ❌ Failing | Microsoft | 163K tokens | Under maintenance |
| **OpenAI GPT OSS 20B** | ❌ Failing | OpenAI | 128K tokens | Access issues |

**8/10 models operational** - includes top performers from Google, Meta, NVIDIA, and Mistral.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- OpenRouter API key (free: [openrouter.ai/keys](https://openrouter.ai/keys))

### 1. Clone and Setup
```bash
git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant
```

### 2. Environment Configuration
```bash
cp .env.example secrets.env
# Edit secrets.env with your OpenRouter API key
```

### 3. Start Services
```bash
# Option A: Using Docker (recommended)
docker compose up -d

# Option B: Local development
cd backend && pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 4. Access Application
- **Frontend**: [http://localhost:3000](http://localhost:3000) (during development)
- **API**: [http://localhost:8001](http://localhost:8001)
- **Health Check**: [http://localhost:8001/health](http://localhost:8001/health)

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Vercel    │    │   Railway   │    │ OpenRouter  │
│  Frontend   │◄──►│   Backend   │◄──►│    API      │
│             │    │             │    │             │
│ - HTML/CSS/JS   │ FastAPI      │   - 10+ Models  │
│ - Real-time UI  │ - PostgreSQL │   - Rate limits │
│ - CORS ready    │ - Redis      │   - Streaming   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Services Overview
- **Frontend (Vercel)**: Static web assets, real-time chat interface
- **Backend (Railway)**: FastAPI server, AI model integration, database
- **Database (PostgreSQL)**: Conversation history and user data
- **Cache (Redis)**: Rate limiting and session management

## 📖 Environment Variables

### Required
```bash
OPENROUTER_API_KEY=sk-or-v1-...          # Your OpenRouter API key
DATABASE_URL=postgresql://...            # PostgreSQL connection
```

### Optional
```bash
APP_URL=https://your-vercel-app.vercel.app # Frontend URL (for OpenRouter referrer)
APP_NAME=AssistMe Virtual Assistant        # App name
DEV_MODE=false                             # Set to true for development mode
REDIS_URL=redis://redis:6379              # Redis for rate limiting
OPENROUTER_DEFAULT_MODEL=google/gemini-2.0-flash-exp:free
FASTAPI_BIND_HOST=0.0.0.0                 # Optional: override bind host (default 127.0.0.1)
```

## 🌐 CORS Configuration

The FastAPI backend ships with Starlette's `CORSMiddleware` enabled so the hosted frontend and API can talk to each other without browser blocks.

- Allowed origins include local dev hosts (`http://localhost:3000`, `http://127.0.0.1:3000`, etc.) and the deployed Vercel/Railway URLs. Update `ALLOWED_ORIGINS` or the regex in `backend/app/main.py` if you add another domain.
- Credentials are enabled, and every GET/POST/OPTIONS handler returns per-request `Access-Control-Allow-Origin` headers through `_cors_headers()`, keeping `/health` and the streaming endpoints compliant with browser checks.
- If you temporarily need to allow a new origin, add it to the list and redeploy; avoid using `"*"` in production.
- After deploying CORS changes, hard-refresh or open an incognito window to clear cached 403s, and verify via the browser Network tab that `/health` responds with the expected headers.

## ☁️ Hosting Configuration (Vercel + Railway)

To keep both platforms aligned with the codebase:
- **Railway backend**
  - `railway.toml` uses Nixpacks and runs `backend/start.sh`; that script binds Uvicorn to the `PORT` variable Railway injects (falling back to `8001` locally) and honours `FASTAPI_BIND_HOST` so you can explicitly set `0.0.0.0` in production.
  - The deployment health check pings `/health`. If you move the endpoint, update `healthcheckPath` and redeploy.
  - Set `APP_URL` to your Vercel domain (for example `https://assist-me-virtual-assistant.vercel.app`) alongside `OPENROUTER_API_KEY`, `DATABASE_URL`, and any cache credentials.
- **Vercel frontend**
  - The static app points to `https://assistme-virtualassistant-production.up.railway.app` by default and `http://localhost:8001` in development. If your API lives elsewhere, update the `<meta name="assistme-api-base">` content in `frontend/index.html`, or override it by defining `window.ASSISTME_API_BASE` before `script.js` loads.
  - Keep the project connected to the `main` branch so new pushes trigger builds. For staging branches, disable auto-deploys or supply a staging backend URL.
- After any deployment, confirm the Network tab shows `/health` succeeding without CORS warnings and that chat streaming requests reach the intended domain.

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Deploy to Vercel
npm install -g vercel
vercel --prod
```

### Backend (Railway)
1. Create Railway project
2. Set environment variables in Railway dashboard
3. Deploy from Git (auto-deploys on push)
4. Configure custom domain if needed

### Production URLs
- **Production Frontend**: `https://assist-Me-virtual-assistant.vercel.app`
- **Production Backend**: `https://assistme-virtualassistant-production.up.railway.app`

## 🧪 Testing

### Model Performance Testing
Run comprehensive model tests:
```bash
# Test all 10 models
python test_models.py  # Development mode testing
curl -X POST http://localhost:8001/api/chat/text \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

### Health Checks
```bash
# Backend health
curl http://localhost:8001/health

# API test
curl -X POST http://localhost:8001/api/chat/text \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the capital of France?"}], "model": "meta-llama/llama-3.3-70b-instruct:free"}'
```

## 📊 API Documentation

### Chat Endpoints
- `POST /api/chat/text` - Single chat completion
- `POST /api/chat/stream` - Streaming chat completion
- `GET /api/conversations` - List conversations
- `GET /api/conversations/{id}` - Get specific conversation
- `GET /api/models` - Available AI models

### Request Format
```json
{
    "messages": [
        {"role": "user", "content": "Your message here"}
    ],
    "model": "google/gemini-2.0-flash-exp:free",
    "temperature": 0.7,
    "max_tokens": 1024
}
```

## 🛠️ Development

### Code Quality
- **Pylint compliant**: All backend code passes quality checks
- **Type hints**: Full Python typing support
- **Error handling**: Comprehensive exception management
- **CORS**: Cross-origin support for multiple domains

### Testing
```bash
# Run Pylint checks
pylint backend/app/

# Test API endpoints
pytest  # If you add tests

# Manual testing
curl -X POST localhost:8001/api/chat/text \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Test"}]}'
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and ensure tests pass
4. Commit: `git commit -m 'Add new feature'`
5. Push: `git push origin feature/new-feature`
6. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **OpenRouter** for unified AI model access
- **Vercel** for seamless frontend deployment
- **Railway** for robust backend hosting
- **FastAPI** for modern Python API framework

---

**Built with ❤️ for AI-powered conversations**
