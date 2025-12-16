# 🤖 AssistMe - Next-Gen Modular AI Platform

**A production-ready, futuristic AI assistant featuring Voice Mode 4.0, Deep Research, and Native Multilingual Support.**

[![React](https://img.shields.io/badge/React-19.0-blue?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.0-purple?logo=vite&logoColor=white)](https://vitejs.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.0%20Flash-orange?logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## 🚀 Overview

AssistMe is a state-of-the-art virtual assistant platform built with the latest web technologies (**React 19**, **Tailwind CSS 4**-ready, **FastAPI**). It features a modular architecture allowing independent use of its core components.

### key Functionalities:
- **Voice Mode 4.0**: Bi-directional, interruptible voice chat with emotional intelligence (like Gemini Live).
- **Grokipedia 2.0**: RAG-powered knowledge engine with "Deep Research" capabilities and table of contents.
- **AI4Bharat**: Specialized toolset for **22+ Indian languages** (Translation, Transliteration, Script Conversion).
- **Imagine Engine**: Unlimited free image generation using Pollinations, Flux Pro, and DALL-E 3.
- **Writing Studio**: Advanced grammar and paraphrasing tools (Grammarly/Quillbot alternatives).
- **Network Suite**: Professional-grade speedtest and network diagnostics.

---

## 🏗️ Project Structure

```bash
AssistMe-VirtualAssistant/
├── modules/                    # 📦 Standalone Packages
│   ├── voice-mode/             # Native Audio (Gemini 2.5 Flash / Browser Hybrid)
│   ├── grokipedia/             # Knowledge Base & Deep Research
│   ├── ai4bharat/              # Indic Language Stack
│   ├── writing-tools/          # Grammar & Paraphrasing
│   ├── imagine/                # Multi-provider Image Gen
│   └── speedtest/              # Network Analysis
├── src/                        # ⚛️ React 19 Application
│   ├── components/             # UI Components (Shadcn extended)
│   ├── hooks/                  # Custom Hooks (useLocalStorage, useVoice)
│   └── lib/                    # Utilities & API Clients
├── backend/                    # 🐍 Python/FastAPI Backend
│   ├── app/                    # Application Logic
│   └── services/               # Microservices (TTS, STT, Omni)
└── api/                        # ⚡ Vercel Edge Functions
```

---

## ✨ Cutting-Edge Features

### 🎤 Voice Mode 4.0 (Gemini Live)
- **Hybrid Architecture**: Seamlessly switches between Server-side Gemini 2.5 Flash Audio and Browser-side WebSpeech API.
- **Smart Interruptions**: Speak over the AI to instantly change context.
- **Visual Intelligence**: Real-time audio spectrum visualization.
- **Multi-Persona**: 5 distinct personalities (Aoede, Puck, Charon, etc.).

### 📚 Grokipedia 2.0
- **Deep Research**: Aggregates data from multiple sources to write comprehensive articles.
- **Model Selector**: Switch between **Gemini 2.0 Flash**, **Qwen 2.5**, **DeepSeek V3**, and **Perplexity**.
- **Live Markdown**: Auto-generating Table of Contents and "Quick Facts" sidebars.
- **Persisted Context**: Remembers your selected model and research history.

### 🇮🇳 AI4Bharat Suite
- **Linguistic Powerhouse**: Native support for Hindi, Marathi, Tamil, Telugu, and 18+ others.
- **Script Converter**: Instant transliteration between scripts (e.g., Latin to Devanagari).
- **Reference**: Built-in dictionary and translation memory.

### 🎨 Imagine Studio
- **Pollinations Integration**: **Free, unlimited** high-quality generation.
- **Pro Models**: Access to Flux Pro and DALL-E 3 for premium results.
- **Gallery Mode**: Auto-saving history with prompt metadata.

---

## 🛠️ Technology Stack

### Frontend (Modern Web)
- **Framework**: React 19 + React Router 7
- **Build Tool**: Vite 7 (Beta/Nightly)
- **Styling**: Tailwind CSS + Shadcn UI + Lucide Icons
- **Animation**: Framer Motion 12 (Layout animations, shared element transitions)
- **State Management**: React Hooks + Context API + LocalStorage

### Backend (Performance)
- **Core**: FastAPI 0.115+ (Async first)
- **Validation**: Pydantic v2 (Rust-powered speed)
- **Database**: PostgreSQL + SQLAlchemy 2.0 (Async)
- **Caching**: Redis (for session continuity)
- **ML/AI**:
    - `sentence-transformers` (Local Embeddings)
    - `faiss-cpu` (Vector Search)
    - `openai-whisper` (Speech-to-Text Fallback)

---

## ⚡ Quick Start

### Prerequisites
- Node.js 20+
- Python 3.10+
- Google Gemini API Key

### 1. Installation
```bash
git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant

# Install Frontend Dependencies
npm install

# Setup Backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in the root:
```env
VITE_BACKEND_URL=http://localhost:8001
GOOGLE_API_KEY=your_gemini_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
```

### 3. Launch
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
source venv/bin/activate
python -m app.main
```
Visit **http://localhost:5173** to experience the future.

---

## 🤝 Contributing
We welcome contributions! Please follow these steps:
1. Fork the repo.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  <strong>Built with ❤️ for the AI Community</strong><br>
  <a href="https://github.com/mangeshraut712/AssistMe-VirtualAssistant">GitHub</a> • 
  <a href="#">Live Demo</a> • 
  <a href="#">Documentation</a>
</p>
