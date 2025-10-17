# AssistMe Virtual Assistant

**🌐 Live Demo:** [https://assist-me-virtual-assistant.vercel.app/](https://assist-me-virtual-assistant.vercel.app/)

> **🎨✨ Advanced AI Assistant** - Powered by xAI's Grok-2 and Google S2R Voice Processing

AssistMe is a cutting-edge AI assistant featuring multimodal interactions with xAI's Grok-2 (270B parameter model) for advanced text reasoning and Google's Speech-to-Retrieval (S2R) architecture for voice understanding. Built with modern full-stack architecture supporting real-time voice conversations and persistent chat history.

![AssistMe Interface](https://img.shields.io/badge/ChatGPT--Style-Interface-brightgreen)
[![Modern Design](https://img.shields.io/badge/Modern-PWA-blue)](https://assist-me-virtual-assistant.vercel.app/)

## 🚀 Key Highlights

- **🎨 ChatGPT-Style Design**: Professional interface with welcome screen, smooth animations, and modern UX
- **🤖 Multiple AI Models**: 4 high-performance models (Qwen VL, GPT-4o Mini, Qwen Thinking, Llama Scout)
- **🎙️ Voice Interface**: Seamless speech-to-text and voice input with visual feedback
- **🎭 Welcome Experience**: Interactive suggestion buttons for quick-start conversations
- **🔒 Privacy-First**: Secure Vercel-hosted API with protected keys
- **📱 Mobile-Ready**: Perfect responsive design for all devices

## ✨ Premium Features

### 🎨 **Modern Interface**
- **Welcome Screen**: "Hello! I'm AssistMe" with 4 suggestion buttons (Quantum Computing, Space Stories, AI News, Meal Planning)
- **Message Bubbles**: Clean conversation layout with distinct user/assistant avatars
- **Sleek Typography**: System fonts, perfect line heights, readable everywhere

### 🤖 **AI Intelligence**
- **Multi-Model Selection**: Beautiful dropdown with model descriptions and rankings
- **Smart Testing**: Live model performance benchmarking and rankings
- **Advanced Chat**: Context-aware conversations with typing indicators
- **Voice Recognition**: Professional speech input with recording animations

### ⚡ **Modern Experience**
- **Smooth Animations**: Message slide-ins, typing dots, hover effects
- **Dark/Light Mode**: Native system preference detection + manual toggle
- **Keyboard Shortcuts**: Ctrl+K to focus input, Escape to close dropdowns
- **Auto-Resize Input**: Dynamic textarea expansion with intelligent scrolling

### 🔧 **Technical Excellence**
- **ES6+ JavaScript**: Modern async/await, classes, arrow functions
- **CSS Variables**: Maintainable design system with light/dark themes
- **Performance Optimized**: Debounced events, efficient DOM updates
- **Accessibility**: Full ARIA labels, keyboard navigation, screen reader support

## 🎯 Quick Start

### 🔥 Docker Compose (Recommended for Full Features)
**Latest Approach**: Run the complete AI assistant with Grok-2 and database persistence

#### 📋 Prerequisites
- Docker & Docker Compose installed
- Git for repository cloning
- 4GB+ RAM available

#### 🚀 Full Setup (5 minutes)
```bash
# 1. Clone repository
git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant

# 2. Start all services (PostgreSQL, Redis, API, Frontend)
docker-compose up -d

# 3. Run database migrations
docker-compose exec api alembic upgrade head

# 4. Open browser
open http://localhost:3000

# Services will be available on:
# - Frontend: http://localhost:3000
# - API: http://localhost:8001
# - Database: localhost:5432
# - Redis: localhost:6379
```

#### 🔧 Advanced Configuration
```bash
# For Grok-2 integration, set API key:
export GROK2_API_KEY=your_xai_grok2_key

# For custom database settings:
export DATABASE_URL=postgresql://user:pass@host:5432/db
```

### ⚡ Frontend Only Development
```bash
cd apps/frontend
npm install
npm run dev
# → http://localhost:3000 (frontend only, no backend)
```

### 🐳 Backend Only Development
```bash
# Start just the backend services
docker-compose up db redis -d
docker-compose exec api alembic upgrade head

# Run API server
cd apps/api
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8001
# → http://localhost:8001 (API docs available)
```

### 🔥 Legacy Vercel Deployment (Node.js Only)
1. **Import to Vercel** from GitHub repository
2. **Add Environment Variable**: `OPENROUTER_API_KEY=your_api_key`
3. **Deploy** - Your app is live at `https://your-app.vercel.app/`
4. **Enjoy** premium ChatGPT-style AI conversations!

## 💬 Interface Tour

### 🏠 **Welcome Screen**
- **Centered Hero**: "Hello! I'm AssistMe" with personality
- **Suggestion Grid**: 4 colorful cards with icons and prompts
- **Quick Start**: Click any suggestion to begin chatting

### 👤 **User Messages**
- **Purple Avatar**: User icon with smooth gradients
- **Clean Bubbles**: Right-aligned with professional styling
- **Copy Actions**: Hover to reveal clipboard functionality

### 🤖 **AI Responses**
- **Green Avatar**: Robot icon matching ChatGPT branding
- **Typing Indicators**: Animated dots while AI thinks
- **Rich Formatting**: Support for markdown-like responses

### ⚙️ **Model Selector**
- **Dropdown UI**: Beautiful model selection in header
- **Live Descriptions**: "Best for explanations", "Creative responses"
- **Performance Rankings**: Built-in quality indicators

### 🎙️ **Voice Input**
- **Recording Animation**: Pulsing microphone when active
- **Speech Recognition**: Advanced browser speech-to-text
- **Visual Feedback**: Color changes and animations

### 🌓 **Theme Toggle**
- **Auto-Detection**: Respects system dark/light preference
- **Smooth Transitions**: Instant theme switching
- **Persistent Storage**: Remembers your choice

## 🔧 Technical Architecture

### 📁 Modern Mono-Repo Structure
```
assistme-virtual-assistant/
├── 🐳 docker-compose.yml          # Multi-service orchestration
├── apps/
│   ├── frontend/                   # Next.js React application
│   │   ├── src/app/               # App Router components
│   │   ├── globals.css            # Tailwind + custom styles
│   │   └── package.json
│   └── api/                       # FastAPI backend service
│       ├── app.py                 # FastAPI application
│       ├── models.py             # SQLAlchemy database models
│       ├── database.py           # Database configuration
│       ├── chat_client.py        # Grok-2 integration client
│       ├── alembic/              # Database migrations
│       ├── Dockerfile            # Container definition
│       └── requirements.txt      # Python dependencies
├── docs/
│   └── grok2-s2r-roadmap.md      # Development roadmap
└── [Legacy Files]               # Original Node.js files
    ├── index.HTML
    ├── script.js
    ├── style.css
    └── server.js
```

### 🚀 Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │────│   FastAPI       │────│ PostgreSQL     │
│   Frontend      │    │   Backend       │    │ Database       │
│   (React)       │    │   (Python)      │    │ (SQLAlchemy)   │
│                 │    │                 │    │                 │
│ - Chat UI       │    │ - REST API      │    │ - Conversations │
│ - Real-time     │    │ - WebSockets    │    │ - Messages      │
│ - State Mgmt    │    │ - CORS Enabled  │    │ - Users         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐    ┌─────────────────┐
                    │   Redis         │    │   Celery        │
                    │   Cache         │    │   Background    │
                    │   (Fast KV)     │    │   Tasks         │
                    └─────────────────┘    └─────────────────┘
```

### 🎨 **Design System**
- **Color Palette**: ChatGPT-inspired greens, modern grays
- **Typography**: System font stack for perfect readability
- **Spacing**: 8-point grid system (4px, 8px, 12px, 16px, 20px, 24px, 32px)
- **Shadows**: Multi-level depth from subtle to dramatic
- **Animations**: Cubic-bezier transitions (0.4, 0, 0.2, 1)

### 🚀 **Performance Features**
- **Progressive Enhancement**: Works without JavaScript
- **Lazy Loading**: Images and components load on demand
- **Debounced Events**: Optimized for smooth 60fps interactions
- **Memory Management**: Proper cleanup of DOM and event listeners
- **Accessibility First**: WCAG AA compliance with semantic HTML

## 🤖 Model Information

### 📊 **Available Models**
| Model | Rating | Specialty |
|-------|--------|-----------|
| **Qwen Instruct ★** | Top Rated | Complex tasks, detailed analysis |
| **GPT-4o Mini** | Excellent | Clear explanations, structured responses |
| **Qwen Thinking** | Creative | Innovative solutions, brainstorming |
| **Llama Scout** | Fast | Quick responses, efficient processing |

### 🧪 **Model Testing**
- **Live Benchmarking**: Real-time performance testing on 10+ criteria
- **Factual Accuracy**: Capital cities, historical facts, math problems
- **Creative Writing**: Poems, stories, conceptual explanations
- **Reasoning Tasks**: Logic puzzles, step-by-step analysis

### 🔄 **Model Switching**
- **Header Dropdown**: Professional model selector interface
- **Persistent Choice**: Your model preference remembered
- **Instant Switching**: No page reload required

## 🎯 Usage Examples

### 💬 **Conversation Examples**
- **Welcome Suggestions**: Click "Explain quantum computing" → Gets detailed technical explanation
- **Voice Input**: Click microphone → "What's the weather like?" → Weather info spoken aloud
- **Model Switching**: Select "Qwen Thinking" → "Write a haiku about AI" → Creative poem
- **Copy Responses**: Hover any message → Copy icon appears → Click to copy

### 🎙️ **Voice Commands**
- **"Hello"**: Warm AI greeting with personality
- **"What is 25 * 8?"**: Instant math calculation
- **"Tell me a joke"**: Random humor from free APIs
- **"Search for quantum physics"**: Opens Google in new tab
- **"Open YouTube"**: Launches YouTube automatically

### 🎨 **Theme Experience**
- **System Sync**: Automatically matches your OS theme
- **Manual Toggle**: Click sun/moon icon for instant switching
- **Smooth Transitions**: All elements animate between themes
- **Persistent Choice**: Remembers your preference forever

## 🔒 Security & Privacy

- **🔐 Server-Side Keys**: OpenRouter API keys never exposed to client
- **🏗️ Vercel Hosting**: Enterprise-grade serverless infrastructure
- **📋 No Data Storage**: Conversations not stored (can be added optionally)
- **🔒 Environment Variables**: Sensitive data protected in deployment
- **🚫 No Tracking**: Completely anonymous user experience

## 📱 Browser Support

✅ **Chrome** (Desktop & Mobile) - Full feature support
✅ **Safari** (Desktop & Mobile) - Complete compatibility
✅ **Firefox** (Desktop) - All features work perfectly
✅ **Edge** (Desktop) - Modern web standards supported
✅ **Opera** (Desktop) - Beautiful rendering everywhere

⚠️ **Requirements**: Modern browser with Web Speech API
⚠️ **Mobile**: Some speech features may vary by browser

## 🤝 Contributing

This project welcomes enhancements! Areas for contribution:

### 🎯 **Feature Ideas**
- **Conversation History**: Save/restore chat sessions
- **Export Options**: Download conversations as text/Markdown
- **Advanced Themes**: Custom color schemes and fonts
- **File Uploads**: Document/chat context from uploaded files
- **Real-time Collaboration**: Multiple users in shared conversations

### 🛠️ **Technical Improvements**
- **Progressive Web App**: Offline support, service workers
- **WebSocket Integration**: Real-time features and live updates
- **Advanced Voice**: Multiple languages, voice tones
- **Plugin Architecture**: Extensible command system
- **Database Integration**: Conversation storage and retrieval

### 📋 **How to Contribute**
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your improvements
4. **Test** thoroughly (voice, AI, responsive design)
5. **Submit** a pull request with detailed description

## 📄 License & Credits

**License**: MIT License - Open source for educational and commercial use

**Built With**:
- 🧠 **OpenRouter API** - Multiple AI model access
- 🎨 **Font Awesome 6.6.0** - Beautiful icons
- 🎯 **Modern CSS** - Grid, Flexbox, Variables, Animations
- ⚡ **Vanilla JavaScript** - ES6+ features and clean architecture

**🏆 Special Thanks**:
- ChatGPT for UI inspiration and design principles
- OpenRouter for making AI accessible
- Vercel for seamless deployment
- The open source community

## 🚀 Scaling & Deployment

### ☁️ **Vercel (Recommended)**
- Automatic HTTPS
- Global CDN
- Serverless functions
- Zero configuration

### 🌍 **Other Platforms**
- **Railway**: Simple deployment with databases
- **Netlify**: Static hosting with functions
- **Heroku**: Traditional app deployment
- **Docker**: Containerized deployment anywhere

---

**🎨 Experience premium AI conversations with ChatGPT-grade design and OpenRouter-powered intelligence!**

**[🚀 Launch App](https://assist-me-virtual-assistant.vercel.app/)** | **[📖 OpenRepo](https://github.com/mangeshraut712/AssistMe-VirtualAssistant)** | **[🤝 Contribute](#contributing)**

---

## 🛣️ Roadmap: Grok‑2 & Google S2R Expansion

AssistMe’s long-term roadmap now targets a Grok‑2 powered reasoning core and a voice pipeline inspired by Google’s Speech-to-Retrieval (S2R) research. The steps are organised for a **single developer**, ensuring every phase ends with a working milestone before moving on.

### 🔍 Highlights
- **Core LLM:** Host xAI’s Grok‑2 (270B) via SGLang/vLLM on multi-GPU nodes
- **S2R Voice Stack:** Audio encoders with vector retrieval to derive user intent directly from speech
- **Unified API:** FastAPI gateway orchestrating text and voice flows, backed by Redis, PostgreSQL, and Celery
- **Frontend Evolution:** Next.js + Tailwind SPA with streaming responses, Web Audio capture, and TTS playback
- **Deployment:** Dockerised services on Kubernetes (EKS/GKE) with Prometheus/Grafana monitoring

### 📅 Phases
1. **Phase 0–2:** Stabilise current AssistMe app, prepare tooling, scaffold FastAPI backend with persistence.
2. **Phase 3–5:** Migrate UI into Next.js, integrate Grok‑2 inference, add conversation history.
3. **Phase 6–8:** Build voice pipeline, implement S2R service, orchestrate Grok‑2 + TTS for end-to-end audio conversations.
4. **Phase 9–10:** Harden security, monitoring, deployment, then iterate on optimisation and new capabilities.

📄 **Full Plan:** [`docs/grok2-s2r-roadmap.md`](docs/grok2-s2r-roadmap.md)

This roadmap keeps AssistMe aligned with cutting-edge conversational AI research while offering a concrete engineering path from today’s web assistant to a production-grade, multimodal platform.
