# 🤖 AssistMe - Modular AI Assistant Platform

**A production-ready, modular AI assistant with standalone feature packages**

[![React](https://img.shields.io/badge/React-18.x-blue)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-orange)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## 🏗️ Project Structure

```
AssistMe-VirtualAssistant/
├── modules/                    # Standalone feature modules
│   ├── voice-mode/            # 🎤 Gemini Native Audio (30 voices, 24 languages)
│   ├── chat/                  # 💬 Text chat with streaming
│   ├── grokipedia/            # 📚 Knowledge base RAG
│   ├── imagine/               # 🎨 AI image generation
│   ├── speedtest/             # ⚡ Network diagnostics
│   └── ai-studio/             # 🛠️ Model playground
├── src/                       # Main application
│   ├── components/
│   ├── pages/
│   └── App.jsx
├── backend/                   # FastAPI backend
│   ├── app/
│   ├── providers/
│   └── services/
└── archive/                   # Legacy/backup files
```

## ✨ Features

### 🎤 Voice Mode
- **30 HD Voices** with emotional intelligence (Aoede, Charon, Fenrir, Kore, Puck)
- **24 Languages** with native accents
- Real-time audio visualization
- Haptic feedback (mobile)
- Session analytics & export
- **No browser TTS** - Pure Gemini Native Audio

[📖 Voice Mode Docs](./modules/voice-mode/README.md)

### 💬 Chat
- Real-time streaming responses
- Multi-model support (Gemini, Claude, GPT, Llama)
- Conversation history
- Multi-language support
- RAG integration

### 📚 Grokipedia
- Semantic search knowledge base
- Vector embeddings
- Context injection
- Custom data ingestion

### 🎨 Imagine
- AI image generation
- Multiple providers (DALL-E, Flux, Stable Diffusion)
- Style presets
- HD upscaling

### ⚡ Speedtest
- Network latency checker
- API performance monitoring
- Real-time metrics

### 🛠️ AI Studio
- Model playground
- Parameter tuning
- Prompt engineering
- Response comparison

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- Python >= 3.9
- Google API Key (for Gemini)

### Installation

**1. Clone & Install**
```bash
git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant

# Frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
```

**2. Environment Setup**
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Required
GOOGLE_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_key

# Optional
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url
```

**3. Run Development**
```bash
# Frontend (Terminal 1)
npm run dev

# Backend (Terminal 2)
cd backend
python -m app.main
```

Visit: http://localhost:5173

## 📦 Standalone Modules

Each module can be used independently in other projects:

### Install Voice Mode
```bash
cp -r modules/voice-mode /path/to/your-project/
```

See module-specific docs:
- [Voice Mode Integration](./modules/voice-mode/docs/INTEGRATION.md)
- [Chat Integration](./modules/chat/README.md)
- [Grokipedia Integration](./modules/grokipedia/README.md)
- [Imagine Integration](./modules/imagine/README.md)

## 🏛️ Architecture

### Frontend (React + Vite)
- **UI Framework**: React 18 + Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State**: React hooks + Context
- **Routing**: React Router

### Backend (FastAPI)
- **Framework**: FastAPI + Uvicorn
- **AI Providers**: OpenRouter, Google AI
- **Database**: PostgreSQL (optional)
- **Cache**: Redis (optional)
- **Authentication**: JWT

### AI Models
- **Primary**: Gemini 2.5 Flash (Native Audio)
- **Fallbacks**: Gemini 2.0, Claude, GPT-4, Llama
- **Image**: DALL-E 3, Flux, Stable Diffusion

## 🔧 Configuration

### Frontend Config
```javascript
// src/config/app.config.js
export const APP_CONFIG = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001',
  enableVoice: true,
  enableChat: true,
  enableGrokipedia: true,
  enableImagine: true,
};
```

### Backend Config
```python
# backend/app/config.py
class Settings:
    GOOGLE_API_KEY: str
    OPENROUTER_API_KEY: str
    DATABASE_URL: Optional[str]
    REDIS_URL: Optional[str]
```

## 🚢 Deployment

### Vercel (Frontend)
```bash
vercel deploy
```

### Railway/Render (Backend)
```bash
# Set environment variables in dashboard
railway up
```

### Docker
```bash
docker-compose up -d
```

## 📊 Performance

| Metric | Value |
|--------|-------|
| Voice Latency | ~800ms (Gemini API) |
| Chat Response | ~1.2s (streaming) |
| Image Generation | ~5s (DALL-E) |
| Memory Usage | < 200MB |
| Bundle Size | ~500KB (gzipped) |

## 🔒 Security

- ✅ HTTPS required in production
- ✅ API keys in environment variables
- ✅ CORS configured
- ✅ Rate limiting
- ✅ Input validation
- ✅ XSS protection

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) file

## 🙏 Credits

- **Gemini 2.5 Flash** by Google DeepMind
- **OpenRouter** for multi-model access
- **Shadcn UI** for component inspiration
- **Framer Motion** for animations

## 🆘 Support

- 📧 Email: support@assistme.dev
- 🐛 Issues: [GitHub Issues](https://github.com/mangeshraut712/AssistMe-VirtualAssistant/issues)
- 💬 Discord: [Join Community](https://discord.gg/assistme)
- 📖 Docs: [Full Documentation](https://docs.assistme.dev)

## 🗺️ Roadmap

- [ ] Real-time collaboration
- [ ] Plugin system
- [ ] Mobile apps (iOS/Android)
- [x] Voice mode with Gemini Native Audio
- [x] Modular architecture
- [ ] Self-hosted option
- [ ] API marketplace

---

**Made with ❤️ by the AssistMe Team**

[⭐ Star on GitHub](https://github.com/mangeshraut712/AssistMe-VirtualAssistant) · [🚀 Live Demo](https://assistme.vercel.app) · [📚 Docs](https://docs.assistme.dev)
