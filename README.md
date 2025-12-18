# 🤖 AssistMe - Next-Gen AI Virtual Assistant

**A production-ready AI assistant featuring Voice Mode 4.0, Deep Research, and Native Multilingual Support.**

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Codacy](https://img.shields.io/badge/Codacy-A-00C853?logo=codacy&logoColor=white)](https://www.codacy.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| **🎤 Voice Mode 4.0** | Bi-directional voice chat with Gemini Live API and 30+ voices |
| **📚 Grokipedia** | Deep research engine with RAG and auto-citations |
| **🇮🇳 AI4Bharat** | 22+ Indian languages support (translation, transliteration) |
| **🎨 Imagine Studio** | Free unlimited image generation (Flux, Pollinations) |
| **⚡ Speed Test** | Professional network diagnostics and benchmarking |
| **✍️ Writing Tools** | Grammar checking and paraphrasing |

---

## 📁 Project Structure

```
AssistMe-VirtualAssistant/
├── src/                        # ⚛️ React Frontend
│   ├── components/
│   │   ├── features/           # Feature panels (Voice, Grokipedia, etc.)
│   │   ├── layout/             # Layout components (Sidebar, Header)
│   │   └── ui/                 # Reusable UI components
│   ├── config/                 # App configuration
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # API clients and utilities
│   ├── pages/                  # Page components
│   └── utils/                  # Helper functions
│
├── backend/                    # 🐍 FastAPI Backend
│   ├── app/
│   │   ├── routes/             # API endpoints
│   │   ├── services/           # Business logic
│   │   ├── providers/          # AI provider integrations
│   │   └── middleware.py       # Request middleware
│   ├── .flake8                 # Python linting config
│   ├── .pylintrc               # Pylint config (9.23/10)
│   └── requirements.txt        # Python dependencies
│
├── api/                        # ⚡ Vercel Edge Functions
├── public/                     # Static assets
├── .github/workflows/          # CI/CD pipelines
└── Configuration files         # ESLint, Prettier, Codacy, etc.
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org))
- **Python** 3.10+ ([Download](https://python.org))
- **OpenRouter API Key** ([Get one free](https://openrouter.ai))

### Installation

```bash
# Clone the repository
git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant

# Install frontend dependencies
npm install

# Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Configuration

Create `.env` files:

**Root `.env`:**
```env
VITE_BACKEND_URL=http://localhost:8001
```

**Backend `.env`:**
```env
OPENROUTER_API_KEY=your_key_here
GOOGLE_API_KEY=your_gemini_key_here  # Optional: for Gemini TTS
```

### Run Development Servers

```bash
# Terminal 1: Frontend (port 5173)
npm run dev

# Terminal 2: Backend (port 8001)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

Visit **http://localhost:5173** 🚀

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.0 | UI Framework |
| Vite | 6.0 | Build Tool |
| Tailwind CSS | 3.4 | Styling |
| Framer Motion | 12.0 | Animations |
| Lucide Icons | Latest | Icon Library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.115+ | API Framework |
| Pydantic | 2.10+ | Data Validation |
| SQLAlchemy | 2.0+ | ORM |
| httpx | 0.28+ | HTTP Client |
| structlog | 24.4+ | Structured Logging |

### AI Providers
- **OpenRouter** - Multi-model access (GPT-4, Claude, Gemini, Grok)
- **Google Gemini** - Native audio and TTS
- **Pollinations** - Free image generation

---

## 📊 Code Quality

| Tool | Score/Status |
|------|-------------|
| **ESLint** | ✅ 0 errors |
| **Flake8** | ✅ 0 errors |
| **Pylint** | ⭐ 9.23/10 |
| **Bandit** | ✅ No security issues |
| **npm audit** | ✅ 0 vulnerabilities |

---

## 🔧 Scripts

```bash
# Development
npm run dev           # Start frontend dev server
npm run build         # Production build
npm run lint          # Run ESLint
npm run preview       # Preview production build

# Backend
cd backend
uvicorn app.main:app --reload  # Start with hot reload
flake8 app/                     # Run linting
pylint app/                     # Run Pylint
```

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

- **[Voice Mode Quick Start](./docs/VOICE_QUICKSTART.md)** - Get started with voice features
- **[Voice Setup Guide](./docs/VOICE_SETUP.md)** - Detailed configuration
- **[Project Roadmap](./docs/ROADMAP.md)** - Future development plans
- **[API Documentation](./docs/)** - See docs folder for all guides

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  <strong>Built with ❤️ by Mangesh Raut</strong><br>
  <a href="https://github.com/mangeshraut712/AssistMe-VirtualAssistant">GitHub</a> •
  <a href="https://github.com/mangeshraut712">Portfolio</a>
</p>
