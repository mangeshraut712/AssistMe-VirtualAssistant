# AssistMe - Next-Generation AI Virtual Assistant

![AssistMe Logo](public/assets/logo.png)

**Your Intelligent Companion** - A cutting-edge AI-powered virtual assistant featuring multimodal interactions, advanced RAG systems, real-time voice processing with NVIDIA Nemotron, and comprehensive multilingual support. Built with the latest technologies for unparalleled stability and user experience.

## 🚀 Key Highlights

- **🤖 Multi-Provider AI Integration**: Seamlessly access OpenAI, Anthropic, xAI, Google, and Meta models
- **🎤 Real-Time Voice Interaction**: Full-duplex voice conversations with NVIDIA Nemotron Nano 9B V2 (optimized for stability)
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

### 🎤 Advanced Voice Mode (Powered by NVIDIA Nemotron Nano 9B V2)
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

### ⚡ Speedtest 2025
- **AI Network Analysis**: Intelligent connection grading for Streaming & Gaming
- **Visual Immersion**: Glassmorphic UI, animated gradient mesh, and 3D-style globe
- **Detailed Metrics**: Jitter, loss, and latency breakdowns with box-plot visualization
- **History Tracking**: Local storage of test results for performance tracking
- **Geographic Routing**: Server location visualization functionality

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
- (Optional) OpenRouter API Key (only needed for real model calls; local dev can run with `DEV_MODE=true`)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant
```

2. **Install Dependencies**
```bash
npm install
cd backend
pip install -r requirements.txt
cd ..
```

3. **Set up Environment Variables**

This project reads API keys from the **environment** (recommended for local dev, CI, and Vercel).

- If you *don't* want to use an API key locally, run the backend with `DEV_MODE=true` (mock responses).
- If you want real model responses locally, set `OPENROUTER_API_KEY` in your shell.

Example (no API key):
```bash
export DEV_MODE=true
```

Example (real model calls):
```bash
export OPENROUTER_API_KEY=your_api_key_here
export DEV_MODE=false
export APP_URL=http://localhost:5173
```

4. **Run the Application**

**Option A: Using the quick start script**
```bash
./quick-start.sh
```

**Option B: Manual start**

Frontend (in one terminal):
```bash
npm run dev
```

Backend (in another terminal):
```bash
cd backend
DEV_MODE=true python -m uvicorn app.main:app --reload --port 8001
```

5. **Access the Application**

Open your browser and navigate to: `http://localhost:5173`

## 📦 Deployment

### Vercel Deployment (Recommended)

Deploy both frontend and backend to Vercel with full AI model support:

**1. Environment Variables Setup**

In Vercel Dashboard → Settings → Environment Variables, add:
- **OPENROUTER_API_KEY**: Your OpenRouter API key (get from https://openrouter.ai/keys)
- **DEV_MODE**: `false` (for production)

**2. Deploy**

```bash
# Option A: Via Vercel Dashboard
# 1. Import your GitHub repository
# 2. Add environment variables
# 3. Click "Deploy"

# Option B: Via CLI
npm install -g vercel
vercel --prod
```

**3. Verify Deployment**

Visit `https://your-project.vercel.app/health` - should show:
```json
{
  "status": "healthy",
  "api_key_configured": true
}
```

### Alternative Deployment Options

**Railway / Render**
1. Build Frontend: `npm run build`
2. Deploy Backend to Railway/Render
3. Set environment variables
4. Point to `backend/app/main.py`

**Docker**
```bash
docker build -t assistme .
docker run -p 8001:8001 -e OPENROUTER_API_KEY=your_key assistme
```

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
├── src/                        # Frontend source code
│   ├── components/
│   │   ├── features/          # Feature-specific components
│   │   │   ├── AdvancedVoiceMode.jsx
│   │   │   ├── AI4BharatPanel.jsx
│   │   │   ├── FileUploadPanel.jsx
│   │   │   ├── GrammarlyQuillbotPanel.jsx
│   │   │   ├── GrokipediaPanel.jsx
│   │   │   ├── ImageGenerationPanel.jsx
│   │   │   ├── SettingsModal.jsx
│   │   │   └── SpeedtestPanel.jsx
│   │   ├── layout/            # Layout components
│   │   │   ├── ChatArea.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── InputArea.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── ui/                # Reusable UI components
│   │   │   └── index.jsx      # Button, Card, Badge, Spinner, etc.
│   │   └── ErrorBoundary.jsx
│   ├── lib/                   # Utility libraries
│   │   ├── apiClient.js       # API client for backend
│   │   ├── hooks.js           # Custom React hooks
│   │   └── utils.js           # Helper functions
│   ├── pages/                 # Page components
│   │   └── BenchmarkPage.jsx  # Mission Control dashboard
│   ├── App.jsx                # Main application
│   ├── main.jsx               # Application entry point
│   └── index.css              # Global styles & design system
├── public/
│   ├── assets/
│   │   └── logo.png
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker
├── backend/
│   ├── app/
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── files.py
│   │   │   ├── image.py
│   │   │   ├── knowledge.py
│   │   │   ├── multimodal.py
│   │   │   ├── speech.py
│   │   │   └── tts.py
│   │   ├── services/          # Business logic services
│   │   │   ├── cache_service.py
│   │   │   ├── embedding_service.py
│   │   │   ├── file_service.py
│   │   │   ├── image_service.py
│   │   │   ├── rate_limit_service.py
│   │   │   ├── tts_service.py
│   │   │   ├── voice_service.py
│   │   │   └── whisper_service.py
│   │   ├── providers/         # AI model providers
│   │   │   ├── base.py
│   │   │   ├── factory.py
│   │   │   └── openrouter.py
│   │   ├── data/
│   │   │   └── grokipedia.json
│   │   ├── core/
│   │   │   └── security.py
│   │   ├── ai4bharat.py
│   │   ├── database.py
│   │   ├── main.py            # FastAPI application
│   │   ├── models.py
│   │   └── schemas.py
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile
│   └── alembic.ini
├── api/                       # Vercel serverless functions
│   ├── index.py               # API entry point
│   └── requirements.txt       # Serverless dependencies
├── .github/
│   └── workflows/
│       └── nodejs-ci.yml      # CI/CD pipeline
├── .eslintrc.json             # ESLint configuration
├── .prettierrc                # Prettier configuration
├── .env.example               # Environment template
├── CHANGELOG.md               # Version history
├── CONTRIBUTING.md            # Contribution guidelines
├── SECURITY.md                # Security policy
├── vercel.json                # Vercel deployment config
├── package.json               # Root package config
├── vite.config.js             # Vite configuration
├── tailwind.config.cjs        # Tailwind CSS config
├── postcss.config.cjs         # PostCSS configuration
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
- **NVIDIA Nemotron Nano 9B V2** ⭐ (Voice-optimized, stable performance)
- **Google Gemini 1.5 Pro** (2M context window, multimodal)
- **Meta Llama 3.3 70B** (Advanced reasoning, 128K context)
- **Meta Llama 3.1 405B** (Highest performance, 128K context)
- **Google Gemma 2 27B** (Efficient performance, 8K context)
- **NVIDIA Nemotron Nano 9B/12B** (Optimized for efficiency)
- **Meituan LongCat Flash** (Fast inference, competitive performance)
- **Nex AGI DeepSeek V3.1 Nex N1** (Advanced reasoning, free tier)
- **Amazon Nova 2 Lite** (Fast & Efficient, free tier)

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

Experience full voice-to-voice interaction powered by **NVIDIA Nemotron Nano 9B V2** for stable and reliable performance.

**Features:**
- **Real-time Interaction**: Speak naturally and get instant responses.
- **Multilingual**: Supports 17+ languages.
- **Streaming Audio**: Low-latency audio streaming for a fluid conversation.

**How to Use:**
1. Click the **Mic** icon in the sidebar or "Voice Mode" card.
2. Grant microphone permissions if prompted.
3. Start speaking! The AI will listen and respond with voice.

**Technical Details:**
- **Model**: NVIDIA Nemotron Nano 9B V2 (optimized for voice interactions)
- **WebSocket Endpoint**: `/api/chat/voice`
- **Audio Format**: PCM 16-bit, 24kHz (Input/Output)
- **Stability**: Enhanced error handling and retry mechanisms for reliable performance

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct, development setup, and the process for submitting pull requests.

### Developer Tools

```bash
# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check

# Clean build artifacts
npm run clean
```

### Utility Libraries

The project includes reusable utilities:

```javascript
// Class name merging (Tailwind-aware)
import { cn } from './lib/utils';
<div className={cn('base-class', isActive && 'active-class')} />

// Custom hooks
import { useLocalStorage, useDebounce, useMediaQuery } from './lib/hooks';
const [value, setValue] = useLocalStorage('key', 'default');

// Reusable UI components
import { Button, Card, Spinner, Badge } from './components/ui';
```

## � Security

For security concerns, please review our [Security Policy](SECURITY.md).

## �📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai/) for unified AI model access
- [AI4Bharat](https://ai4bharat.org/) for Indian language processing
- [Recharts](https://recharts.org/) for data visualization
- [Lucide](https://lucide.dev/) for beautiful icons
- [TailwindCSS](https://tailwindcss.com/) for styling

## 📧 Contact

For questions or support, please open an issue on GitHub.

## 📜 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes in each version.

---

**Made with ❤️ by the AssistMe Team**

