# AssistMe Virtual Assistant

**Intelligent Multimodal AI Assistant** - Production-ready web application with advanced AI capabilities.

![Status](https://img.shields.io/badge/status-production--ready-green)
![Features](https://img.shields.io/badge/features-multimodal-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Core Features

### 🤖 **AI Model Integration**
- **10+ Premium Models**: Google, Meta, NVIDIA, Mistral, and more
- **OpenRouter API**: Unified access to cutting-edge AI models
- **Streaming Responses**: Real-time chat with model fallbacks
- **Rate Limiting**: Built-in protection and error handling

### 🧠 **Grokipedia RAG System**
- **xAI Grok Integration**: Direct access to Grok API
- **885K Article Knowledge Base**: Grokipedia integration
- **Smart Proxy Fallback**: Grok API → Local FAISS search
- **Source Citations**: Factually grounded, attributed responses

### 🎨 **Multimodal Generation (MiniMax)**
- **Image Generation**: `/image [prompt]` - AI-powered image creation
- **Video Generation**: `/video [prompt]` - Short video production
- **Text-to-Speech**: `/speech [text]` - High-quality voice synthesis
- **Speech-to-Text**: Real-time voice transcription via WebSocket

### 🤖 **Agentic Workflows**
- **MiniMax M2 Agent**: ReAct agent with GitHub tooling
- **Planning**: `/plan [task]` - Automated task planning and execution
- **GitHub Integration**: Issue creation and repository management

### 🎙️ **Voice Assistant**
- **WebSocket Streaming**: Real-time voice conversations
- **Multi-provider STT/TTS**: MiniMax + Fallback options
- **Session Management**: Redis-backed voice session handling

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- Git
- OpenRouter API key ([openrouter.ai/keys](https://openrouter.ai/keys))
- Optional: MiniMax API key, xAI API key for enhanced features

### Installation
```bash
git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant
cp .env.example secrets.env
# Edit secrets.env with your API keys
```

### Development
```bash
# Start services
docker compose up -d

# Or manual setup
cd backend && pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

cd .. && npm install && npm run dev
```

### Access
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:8001](http://localhost:8001)
- **Health**: [http://localhost:8001/health](http://localhost:8001/health)

## 🏗️ Architecture

```
Frontend (Vercel) ↔️ Backend (Railway) ↔️ AI APIs
    ↓                ↓                 ↓
- HTML/CSS/JS      FastAPI          OpenRouter
- Real-time UI     PostgreSQL       Grok API
- WebSocket        Redis            MiniMax API
- Media Player     Vector DB        GitHub API
```

## 📖 API Keys Configuration

### Required
```bash
OPENROUTER_API_KEY=sk-or-v1-...          # Required for AI chat
DATABASE_URL=postgresql://...            # PostgreSQL connection
```

### Optional (Enhanced Features)
```bash
# xAI Grok Integration
XAI_API_KEY=xai-...                      # Enable Grok API proxy
GROKIPEDIA_USE_GROK_PROXY=false          # true = use Grok, false = local only

# MiniMax Multimodal
MINIMAX_API_KEY=eyJ...                   # Enable image/video/speech generation

# GitHub Integration
GITHUB_TOKEN=ghp_...                     # Enable agent GitHub tooling
```

## ☁️ Production Deployment

### Railway Backend Setup
Set these environment variables in your Railway dashboard:

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here
DATABASE_URL=postgresql://railway-connection-url

# Optional Enhanced Features
XAI_API_KEY=xai-your-grok-key
MINIMAX_API_KEY=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
GITHUB_TOKEN=ghp_your-github-token

# Configuration
APP_URL=https://your-vercel-app.vercel.app
APP_NAME=AssistMe Virtual Assistant
DEV_MODE=false
GROKIPEDIA_USE_GROK_PROXY=false
```

### Vercel Frontend Setup
```bash
npm install -g vercel
vercel --prod
```

## 🎮 Usage Guide

### Chat Commands
- `/plan [task]` - AI agent planning and execution
- `/image [prompt]` - Generate images
- `/video [prompt]` - Create videos
- `/speech [text]` - Convert text to speech

### Voice Features
- Click microphone icon for voice input
- Real-time speech recognition
- AI-powered voice responses

### Settings
- Model selection (10+ available)
- RAG toggle (Grokipedia grounding)
- Voice preferences
- Personalization options

## 🔧 Development

### Testing
```bash
cd backend && pytest
npm test
```

### Code Quality
```bash
pylint backend/app/
npm run lint
```

### Database Management
```bash
# Build FAISS index for RAG
python3 scripts/rebuild_faiss.py

# Add more Grokipedia articles
python3 scripts/fetch_grokipedia_sample.py
```

## 📊 Supported AI Models

| Model | Provider | Context | Status |
|-------|----------|---------|--------|
| Google Gemini 2.0 Flash | Google | 1M tokens | ✅ Working |
| Meta Llama 3.3 70B | Meta | 131K tokens | ✅ Working |
| NVIDIA Nemotron Nano 9B | NVIDIA | 131K tokens | ✅ Working |
| Mistral Nemo | Mistral | 128K tokens | ✅ Working |
| DeepSeek R1 | DeepSeek | 163K tokens | ✅ Working |

## 🛡️ Security & Privacy

- API keys encrypted and never logged
- Rate limiting prevents abuse
- CORS configured for production
- HTTPS enforced in production
- Sensitive data excluded from Git

## 📄 License

MIT License - See LICENSE for details.

## 🙏 Acknowledgments

Built with cutting-edge AI technologies from OpenRouter, xAI, MiniMax, and open-source communities.

---

**🚀 Production-ready AI assistant with multimodal capabilities and Grokipedia-powered knowledge.**
