# AssistMe - Next-Generation AI Virtual Assistant

![AssistMe Logo](frontend/public/assets/logo.png)

**Your Intelligent Companion** - A cutting-edge AI-powered virtual assistant featuring multimodal interactions, advanced RAG systems, real-time voice processing, and comprehensive multilingual support. Built with the latest technologies for unparalleled user experience.

## 🚀 Key Highlights

- **🤖 Multi-Provider AI Integration**: Seamlessly access OpenAI, Anthropic, xAI, Google, and Meta models
- **🎤 Real-Time Voice Interaction**: Full-duplex voice conversations with Gemini 2.0 Flash (1.05M context window)
- **🌍 Universal Language Support**: 22+ Indian languages + 17+ global languages with AI4Bharat
- **🧠 Advanced RAG System**: Context-aware responses with FAISS vector search and knowledge base
- **⚡ Modern Tech Stack**: React 19, FastAPI, PostgreSQL, Redis, WebSocket streaming
- **🔒 Enterprise-Grade Security**: Rate limiting, authentication, CORS, and security headers
- **📊 Performance Analytics**: Real-time benchmarking and system monitoring

## 🌟 Core Features

### 💬 Intelligent Chat System
- **Multi-Modal Conversations**: Text, voice, and image inputs
- **Streaming Responses**: Real-time message streaming with WebSocket
- **Conversation Persistence**: Database-backed chat history with auto-titling
- **Advanced Models**: Access to latest AI models (GPT-4o, Claude 3.5, Grok, Gemini 2.0)

### 🎤 Advanced Voice Mode (Powered by Gemini 2.0 Flash)
- **Real-Time Processing**: Instant speech-to-text with Whisper AI
- **Natural TTS**: High-quality text-to-speech synthesis
- **Streaming Audio**: Low-latency audio streaming for fluid conversations
- **17+ Languages**: Full voice support across global languages
- **Context Awareness**: Maintains conversation history for coherent dialogue

### 🌐 Multilingual Excellence
- **AI4Bharat Integration**: 22 Indian languages with cultural adaptation
- **Automatic Detection**: Smart language detection and response adaptation
- **Code-Mixing Support**: Handles mixed English-Indian language conversations
- **Cultural Context**: Regionally appropriate responses and examples

### 🖼️ AI Image Generation
- **Text-to-Image**: Create images from detailed descriptions
- **Multiple Providers**: Integration with various AI image generation services
- **High Resolution**: Support for various image sizes and quality levels

### 📚 Grokipedia - Advanced Knowledge Base
- **RAG Technology**: Retrieval-Augmented Generation for accurate responses
- **Vector Search**: FAISS-powered semantic search across knowledge base
- **Dynamic Updates**: Real-time knowledge base ingestion and updates
- **Context Injection**: Relevant information automatically included in responses

### ✍️ Smart Text Enhancement
- **Grammar Correction**: Advanced grammar and style checking
- **Paraphrasing**: Multiple rephrasing options with Quillbot-style features
- **Tone Adjustment**: Adapt text tone for different contexts
- **Language Enhancement**: Improve clarity and readability

### ⚡ Network Performance Testing
- **Speed Metrics**: Comprehensive network performance analysis
- **Latency Testing**: Real-time connection speed measurements
- **Bandwidth Analysis**: Upload/download speed testing
- **Geographic Routing**: Optimal server selection based on location

### 🎨 Modern UI/UX
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Theme System**: Light, Dark, and automatic system theme detection
- **Smooth Animations**: CSS animations and transitions with Tailwind
- **Accessibility**: WCAG-compliant design with keyboard navigation

### 📊 Mission Control Dashboard
- **Real-Time Analytics**: Live system performance monitoring
- **API Usage Tracking**: Request volume, latency, and error rate metrics
- **Model Benchmarks**: Comparative performance analysis across AI providers
- **Global AI Landscape**: Market share and company leadership insights
- **Cost Analysis**: Inference cost trends and optimization recommendations

### 🔧 Advanced Technical Features
- **Rate Limiting**: Intelligent request throttling with credit management
- **Caching System**: Redis-backed response caching for improved performance
- **File Processing**: Secure file upload and processing capabilities
- **Authentication**: JWT-based user authentication system
- **Database Integration**: PostgreSQL with SQLAlchemy ORM
- **Migration Support**: Alembic database migrations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- OpenRouter API Key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Install Backend Dependencies**
```bash
cd ../backend
pip install -r requirements.txt
```

4. **Set up Environment Variables**

Create a `.env` file in the root directory:
```env
OPENROUTER_API_KEY=your_api_key_here
DEV_MODE=false
```

5. **Run the Application**

**Frontend** (in one terminal):
```bash
cd frontend
npm run dev
```

**Backend** (in another terminal):
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8001
```

6. **Access the Application**

Open your browser and navigate to: `http://localhost:5173`

## 📦 Deployment

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel
```

3. **Set Environment Variables in Vercel Dashboard**
- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `DEV_MODE`: Set to `false`

### Manual Deployment

1. **Build Frontend**
```bash
cd frontend
npm run build
```

2. **Deploy Backend**
- Use any Python hosting service (Render, Railway, etc.)
- Set environment variables
- Point to `backend/app/main.py`

## 🛠️ Modern Tech Stack

### Frontend (React 19 Ecosystem)
- **React 19.2.0** - Latest React with concurrent features and improved performance
- **Vite 7.2.4** - Next-generation frontend tooling with lightning-fast HMR
- **React Router DOM 7.9.6** - Advanced client-side routing with data loading
- **TailwindCSS 3.4.17** - Utility-first CSS framework with JIT compilation
- **Lucide React 0.554.0** - Beautiful, customizable icon library
- **Recharts 3.5.0** - Composable charting library built on D3
- **Class Variance Authority** - Type-safe component variants
- **Tailwind Animate** - Animation utilities for smooth transitions

### Backend (FastAPI & Python 3.11+)
- **FastAPI 0.115.0** - High-performance async web framework
- **Uvicorn 0.32.0** - Lightning-fast ASGI server implementation
- **SQLAlchemy 2.0.36** - Modern ORM with async support
- **PostgreSQL** with **psycopg[binary]** - Robust relational database
- **Redis[hiredis] 5.2.0** - High-performance caching and session store
- **Pydantic 2.9.2** - Data validation and serialization
- **Alembic 1.14.0** - Database migration tool

### AI/ML & Processing
- **OpenRouter** - Unified API for 100+ AI models (OpenAI, Anthropic, xAI, Google, Meta)
- **Whisper (20231117)** - OpenAI's state-of-the-art speech recognition
- **Google Gemini 2.0 Flash** - Multimodal AI with 1.05M context window
- **AI4Bharat** - Comprehensive Indian language processing (22 languages)
- **Sentence Transformers** - Advanced text embeddings for RAG
- **FAISS** - Efficient similarity search and clustering
- **gTTS** - Google Text-to-Speech synthesis

### Performance & Security
- **ORJSON 3.10.11** - Ultra-fast JSON serialization
- **aiofiles 24.1.0** - Async file I/O operations
- **httpx 0.28.0** - Modern async HTTP client
- **python-jose[cryptography]** - JWT token handling
- **passlib[bcrypt]** - Secure password hashing
- **API Analytics** - Usage tracking and analytics

## 📁 Project Structure

```
AssistMe-VirtualAssistant/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── features/          # Feature-specific components
│   │   │   │   ├── AdvancedVoiceMode.jsx
│   │   │   │   ├── AI4BharatPanel.jsx
│   │   │   │   ├── FileUploadPanel.jsx
│   │   │   │   ├── GrammarlyQuillbotPanel.jsx
│   │   │   │   ├── GrokipediaPanel.jsx
│   │   │   │   ├── ImageGenerationPanel.jsx
│   │   │   │   ├── SettingsModal.jsx
│   │   │   │   └── SpeedtestPanel.jsx
│   │   │   ├── layout/            # Layout components
│   │   │   │   ├── ChatArea.jsx
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── InputArea.jsx
│   │   │   │   ├── MessageBubble.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   ├── pages/                 # Page components
│   │   │   ├── App.jsx            # Main application
│   │   │   └── BenchmarkPage.jsx  # Mission Control dashboard
│   │   ├── App.jsx
│   │   └── main.jsx               # Application entry point
│   ├── public/
│   │   ├── assets/
│   │   │   └── logo.png
│   │   ├── manifest.json
│   │   └── sw.js                 # Service worker for PWA
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── backend/
│   ├── app/
│   │   ├── routes/                # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py            # Authentication endpoints
│   │   │   ├── auth_standalone.py # Standalone auth
│   │   │   ├── files.py           # File upload/processing
│   │   │   ├── image.py           # Image generation
│   │   │   ├── knowledge.py       # RAG knowledge base
│   │   │   ├── multimodal.py      # Multimodal processing
│   │   │   ├── speech.py          # Speech processing
│   │   │   └── tts.py            # Text-to-speech
│   │   ├── services/              # Business logic services
│   │   │   ├── __init__.py
│   │   │   ├── cache_service.py   # Redis caching
│   │   │   ├── embedding_service.py # Vector embeddings
│   │   │   ├── file_service.py    # File operations
│   │   │   ├── image_service.py   # Image processing
│   │   │   ├── indic_llm.py       # Indian LLM integration
│   │   │   ├── rate_limit_service.py # Rate limiting
│   │   │   ├── tts_service.py     # TTS processing
│   │   │   ├── voice_service.py   # Voice interaction
│   │   │   └── whisper_service.py # Speech recognition
│   │   ├── providers/             # AI model providers
│   │   │   ├── __init__.py
│   │   │   ├── base.py            # Base provider interface
│   │   │   ├── factory.py         # Provider factory
│   │   │   └── openrouter.py      # OpenRouter integration
│   │   ├── data/
│   │   │   └── grokipedia.json    # Knowledge base data
│   │   ├── core/
│   │   │   └── security.py        # Security utilities
│   │   ├── __init__.py
│   │   ├── ai4bharat.py           # AI4Bharat integration
│   │   ├── compat.py              # Compatibility layer
│   │   ├── database.py            # Database configuration
│   │   ├── main.py                # FastAPI application
│   │   ├── models.py              # SQLAlchemy models
│   │   └── schemas.py             # Pydantic schemas
│   ├── requirements.txt           # Python dependencies
│   ├── Dockerfile                 # Docker configuration
│   ├── alembic.ini               # Database migrations config
│   └── start.sh                  # Startup script
├── scripts/
│   └── generate-legacy-entry.js   # Build script
├── .env.example                   # Environment template
├── vercel.json                    # Vercel deployment config
├── package.json                   # Root package config
└── README.md
```

## 🎨 Themes

AssistMe supports three theme modes:
- **Light Mode**: Clean white background
- **Dark Mode**: Pure black OLED-friendly theme
- **System**: Automatically matches your OS preference

## 🔧 Configuration

### Advanced Mode

Enable "Advanced Mode" in Settings to unlock:
- Premium AI models (GPT-4o, Claude, Grok)
- Experimental features
- Enhanced tools

### Language Settings

Select your preferred language in Settings. The AI will respond in your chosen language automatically.

## 📊 Supported AI Models

### Free Models (Always Available)
- **Google Gemini 2.0 Flash** ⭐ (Voice-optimized, 1.05M context window)
- **Google Gemini 1.5 Pro** (2M context window, multimodal)
- **Meta Llama 3.3 70B** (Advanced reasoning, 128K context)
- **Meta Llama 3.1 405B** (Highest performance, 128K context)
- **Google Gemma 2 27B** (Efficient performance, 8K context)
- **NVIDIA Nemotron Nano 9B/12B** (Optimized for efficiency)
- **Meituan LongCat Flash** (Fast inference, competitive performance)

### Premium Models (Advanced Mode Required)
- **OpenAI GPT-4o** (Latest GPT-4 optimized, 128K context)
- **Anthropic Claude 3.5 Sonnet** (Best coding & reasoning, 200K context)
- **xAI Grok 4.1 Fast** (Speed-optimized Grok, 256K context)
- **Google Gemini 2.5 Flash** (Balanced performance, high context)
- **OpenAI GPT-4o Mini** (Cost-effective GPT-4 level performance)
- **Anthropic Claude 3 Haiku** (Fast responses, 200K context)

### Model Capabilities Matrix
| Model | Text | Voice | Vision | Coding | Reasoning | Context |
|-------|------|-------|--------|--------|-----------|---------|
| Gemini 2.0 Flash | ✅ | ✅ | ✅ | ✅ | ✅ | 1.05M |
| GPT-4o | ✅ | ✅ | ✅ | ✅ | ✅ | 128K |
| Claude 3.5 Sonnet | ✅ | ❌ | ✅ | ✅ | ✅ | 200K |
| Grok 4.1 Fast | ✅ | ❌ | ✅ | ✅ | ✅ | 256K |
| Llama 3.3 70B | ✅ | ❌ | ❌ | ✅ | ✅ | 128K |

## 🎤 Advanced Voice Mode

Experience full voice-to-voice interaction powered by **Gemini 2.0 Flash**.

**Features:**
- **Real-time Interaction**: Speak naturally and get instant responses.
- **Multilingual**: Supports 17+ languages.
- **Streaming Audio**: Low-latency audio streaming for a fluid conversation.

**How to Use:**
1. Click the **Mic** icon in the sidebar or "Voice Mode" card.
2. Grant microphone permissions if prompted.
3. Start speaking! The AI will listen and respond with voice.

**Technical Details:**
- **WebSocket Endpoint**: `/api/chat/voice`
- **Audio Format**: PCM 16-bit, 24kHz (Input/Output)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenRouter for AI model access
- AI4Bharat for multilingual support
- Recharts for data visualization
- Lucide for beautiful icons

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ by the AssistMe Team**
