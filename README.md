# 🤖 AssistMe - Next-Gen AI Virtual Assistant

**A production-ready AI assistant featuring Advanced Voice Mode, Deep Research, and Native Multilingual Support.**

[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Codacy](https://img.shields.io/badge/Codacy-00C853?logo=codacy&logoColor=white)](https://www.codacy.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🔥 Recent Highlights

- **✨ Premium AI Voice:** Real-time conversation with Gemini Live API and aggressive thinking filters.
- **🚀 AI Network Intelligence:** Advanced speedtest with neural diagnostics and use-case analysis.
- **🎨 Ultra-Premium UI:** Modern design system with glassmorphism, dynamic animations, and responsive layout.
- **♿ Fully Accessible:** 100% WCAG AA compliant with proper contrast and screen reader support.
- **🧠 Intelligent Processing:** Real-time fallback mechanisms and context-aware AI responses.

---

## 🚀 Features

### 🎙️ **Advanced Voice Mode**
- **Premium Mode:** Natural real-time conversations via Gemini Live with zero-latency audio synthesis.
- **Aggressive Filtering:** Advanced "thinking" filter ensures only final spoken responses are displayed.
- **Standard Mode:** High-performance browser-based TTS with offline capabilities.
- **Visual Feedback:** Immersive listening indicators and real-time transcript synchronization.

### 🎨 **Imagine Studio**
- **Premium Mode:** High-fidelity image generation via Gemini Flash.
- **Standard Mode:** Unlimited free generation via Pollinations.ai infrastructure.
- **Pro Features:** Multiple aspect ratios, style presets (Digital Art, Anime, 3D), and smart upscaling.

### 💬 **Intelligent Chat**
- **Omni-Model Support:** Access GPT-4, Claude, Gemini, Grok, and 100+ models via unified OpenRouter integration.
- **Deep Research:** Context-aware RAG pipeline for complex queries with automatic citations.
- **Smart Interface:** Typewriter effects, message actions (Copy/Speak), and interactive suggestion chips.

### ⚡ **Network Intelligence**
- **Ultra Speedtest:** Professional-grade diagnostics measuring Bandwidth, Latency, Jitter, and Bufferbloat.
- **Neural Diagnostics:** AI-powered analysis determining suitability for Gaming, 4K Streaming, and Cloud Work.
- **TCP Simulation:** Realistic speed curves mimicking multi-threaded download/upload behavior.

### 🇮🇳 **Multilingual Engine**
- **Native Support:** Optimized for 22+ Indian languages including Hindi, Marathi, Tamil, and Telugu.
- **Neural Translation:** Real-time translation and transliteration services.

---

## 📁 Project Structure

```
AssistMe-VirtualAssistant/
├── src/                        # ⚛️ React Frontend (Vite)
│   ├── components/
│   │   ├── features/           # Feature-specific modules (Voice, Speedtest, etc.)
│   │   ├── layout/             # Core layout (Header, Sidebar)
│   │   └── ui/                 # Reusable atomic UI components
│   ├── hooks/                  # Custom application hooks
│   ├── lib/                    # API clients and unified libraries
│   └── styles/                 # global CSS and theme tokens
│
├── backend/                    # 🐍 FastAPI Backend
│   ├── app/
│   │   ├── routes/             # REST/WebSocket API endpoints
│   │   ├── services/           # Orchestration and business logic
│   │   └── providers/          # AI Model provider integrations
│   └── requirements.txt        # Backend dependencies
│
├── .github/workflows/          # Automated CI/CD pipelines
└── config/                     # Shared configuration
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** (Latest LTS)
- **Python** (3.10+)
- **OpenRouter API Key** (For multi-model chat)

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
GOOGLE_API_KEY=your_gemini_key_here  # Optional for Premium Voice/Images
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React | UI Framework |
| Vite | Modern Build Tool |
| Tailwind CSS | Progressive Styling |
| Framer Motion | High-Performance Animations |
| Lucide Icons | Unified Vector Icons |
| Recharts | Data Visualization |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | High-Performance API Framework |
| Pydantic | Data Validation & Settings |
| SQLAlchemy | Modern Database ORM |
| httpx | Asynchronous HTTP Clients |
| structlog | Enterprise Structured Logging |

---

## 📊 Code Integrity

| Metric | Status |
|------|-------------|
| **ESLint** | ✅ Passing |
| **Flake8** | ✅ Passing |
| **Pylint** | ⭐ High (9.23/10) |
| **Bandit** | ✅ Security Verified |
| **Tests** | ✅ 0 Critical Issues |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
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
