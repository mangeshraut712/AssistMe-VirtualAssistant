# 🤖 AssistMe Virtual Assistant

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&pause=1000&color=00D4AA&center=true&vCenter=true&multiline=true&width=435&lines=%F0%9F%A4%96+Chat+with+10%2B+AI+Models;Real-time+Streaming+Responses;Modern+UI+with+Voice+Support;%F0%9F%8F%8D+Production+Ready" alt="Typing SVG" />

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Railway](https://img.shields.io/badge/Railway-131415?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-0066CC?style=for-the-badge&logo=react&logoColor=white)](https://openrouter.ai/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

> Modern, full-stack AI chat interface powered by 10+ Large Language Models. Built with cutting-edge technologies and deployed seamlessly on cloud infrastructure.

<p align="center">
  <a href="#-quick-start">🚀 Quick Start</a> •
  <a href="#-api-documentation">📚 API Docs</a> •
  <a href="#-features">✨ Features</a> •
  <a href="#-tech-stack">🛠 Tech Stack</a> •
  <a href="#-contributing">🤝 Contributing</a> •
  <a href="#-license">📄 License</a>
</p>

<div align="center">

## 🎯 Try It Live
[<img src="https://img.shields.io/badge/🌐_Live_Demo-Deployed_on_Railway-00D4AA?style=for-the-badge&logo=railway&logoColor=white" alt="Live Demo">](https://assistme-virtualassistant-production.up.railway.app)

## 🏆 Project Stats
[![GitHub Stars](https://img.shields.io/github/stars/mangeshraut712/AssistMe-VirtualAssistant?style=for-the-badge)](https://github.com/mangeshraut712/AssistMe-VirtualAssistant/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/mangeshraut712/AssistMe-VirtualAssistant?style=for-the-badge)](https://github.com/mangeshraut712/AssistMe-VirtualAssistant/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/mangeshraut712/AssistMe-VirtualAssistant?style=for-the-badge)](https://github.com/mangeshraut712/AssistMe-VirtualAssistant/pulls)
[![Repo Size](https://img.shields.io/github/repo-size/mangeshraut712/AssistMe-VirtualAssistant?style=for-the-badge)](https://github.com/mangeshraut712/AssistMe-VirtualAssistant)

</div>

## ✨ Features

- **Multi-Model Support**: Access 9+ free AI models including Google Gemini, Meta Llama, and more
- **Real-time Streaming**: Live response streaming for instant feedback
- **Conversation Management**: Save, load, and manage chat history
- **Modern UI**: Responsive, dark/light theme capable interface
- **Voice Integration**: Speech-to-text and text-to-speech support
- **Offline Mode**: Graceful fallback when backend is unavailable
- **Cross-Platform**: Works on desktop and mobile devices

## 🎯 Available Models

| Model | Provider | Context Size | Status |
|-------|----------|--------------|---------|
| Google Gemini 2.0 Flash Experimental | Google | 1M tokens | ✅ Preferred |
| Qwen3 Coder 480B A35B | Alibaba | 262k tokens | ✅ Active |
| DeepSeek R1T2 Chimera | TNGTech | 163k tokens | ✅ Active |
| Microsoft MAI DS R1 | Microsoft | 163k tokens | ✅ Active |
| OpenAI GPT OSS 20B | OpenAI | 128k tokens | ✅ Active |
| Zhipu GLM 4.5 Air | Zhipu AI | 128k tokens | ✅ Active |
| Meta Llama 3.3 70B | Meta | 131k tokens | ✅ Active |
| NVIDIA Nemotron Nano | NVIDIA | 131k tokens | ✅ Active |
| Mistral Nemo | Microsoft + NVIDIA | 128k tokens | ✅ Active |
| MoonshotAI Kimi Dev | MoonshotAI | 128k tokens | ✅ Active |

## 🛠 Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: Database ORM with PostgreSQL
- **OpenRouter**: AI model API gateway
- **Uvicorn**: ASGI server with WebSocket support
- **Python 3.11+**: Latest Python features and optimizations

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **HTML5/CSS3**: Modern responsive design
- **FontAwesome**: Icon library
- **Marked.js**: Markdown rendering
- **Highlight.js**: Code syntax highlighting
- **KaTeX**: Math formula rendering

### Infrastructure
- **Railway**: Cloud deployment and hosting
- **SQLite/PostgreSQL**: Database options
- **Docker**: Containerized deployment
- **Git**: Version control

## 🚀 Quick Start

### Prerequisites
- Python 3.11 or higher
- Node.js 18+ and npm
- Git
- OpenRouter API key ([get one here](https://openrouter.ai/keys))

### 1. Clone Repository
```bash
git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant
```

### 2. Set Up Environment
```bash
# Copy environment template
cp backend/.env.example backend/.env
cp .env.example .env

# Edit environment files with your API keys
# Required: OPENROUTER_API_KEY
# Optional: DATABASE_URL (defaults to SQLite)
```

### 3. Local Development

#### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

#### Frontend Setup
```bash
cd frontend
# Simple HTTP server (Python)
python -m http.server 3000

# Or using Node.js
npx serve . -l 3000
```

Access the application at: `http://localhost:3000`

### 4. Production Deployment

#### Railway (Recommended)
```bash
# Setup environment variables in Railway dashboard:
# - OPENROUTER_API_KEY: Your OpenRouter API key
# - DATABASE_URL: PostgreSQL connection string (auto-provided)
# - APP_URL: Auto-generated by Railway
```

#### Docker (Alternative)
```bash
# Build and run
docker build -t assistme .
docker run -p 8001:8001 assistme
```

## 📖 API Documentation

### Endpoints

#### Core Functionality
- `GET /health` - Health check
- `GET /api/models` - List available AI models
- `POST /api/chat/text` - Send text message
- `POST /api/chat/stream` - Real-time streaming chat
- `GET /api/conversations` - List conversations
- `GET /api/conversations/{id}` - Get conversation details

#### Utility Endpoints
- `GET /env` - Environment variables status
- `GET /debug` - Simple debug endpoint

### Usage Examples

#### Health Check
```bash
curl https://your-railway-url/health
{"status":"ok","service":"assistme-api","version":"1.0.0"}
```

#### Chat Request
```bash
curl -X POST https://your-railway-url/api/chat/text \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}],"model":"google/gemini-2.0-flash-exp:free"}'
```

#### Models List
```bash
curl https://your-railway-url/api/models
{
  "models": [
    {"id":"google/gemini-2.0-flash-exp:free","name":"Google Gemini 2.0 Flash Experimental"},
    // ... additional models
  ],
  "default": "google/gemini-2.0-flash-exp:free"
}
```

## 🔧 Configuration

### Environment Variables

#### Required
- `OPENROUTER_API_KEY` - OpenRouter API key for AI functionality

#### Optional
- `DATABASE_URL` - PostgreSQL connection string (SQLite fallback)
- `PORT` - Server port (Railway auto-provides, defaults to 8001)
- `DEV_MODE` - Development mode flag
- `APP_URL` - Application URL for API calls

### Railway Deployment

1. Connect GitHub repository to Railway
2. Enable auto-deployment
3. Set environment variables in Railway dashboard
4. Application will deploy automatically on commits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a Pull Request

### Development Guidelines
- Use descriptive commit messages
- Test locally before committing
- Maintain code style consistency
- Update documentation for new features

## 📝 Project Structure

```
AssistMe-VirtualAssistant/
├── backend/                 # FastAPI backend
│   ├── app/               # Main application code
│   │   ├── main.py       # FastAPI app & routes
│   │   ├── chat_client.py # OpenRouter integration
│   │   └── database.py   # Database models & setup
│   ├── alembic/          # Database migrations
│   └── requirements.txt  # Python dependencies
├── frontend/              # React/JavaScript frontend
│   ├── index.html       # Main HTML file
│   ├── script.js       # Application logic
│   └── style.css       # Styling
├── Dockerfile           # Container configuration
├── railway.toml        # Railway deployment config
└── README.md          # This file
```

## 🐛 Troubleshooting

### Common Issues

#### 502 Bad Gateway
- Railway deployment hasn't updated
- Click "Deploy" button in Railway dashboard
- Wait 5-10 minutes for redeployment

#### CORS Errors
- Frontend can't connect to backend
- Check Railway environment variables
- Verify APP_URL is set correctly

#### API Key Issues
- Chat not working
- Verify OPENROUTER_API_KEY is set
- Check OpenRouter account balance

#### Database Connection
- SQLite fallback automatically used
- For production: set DATABASE_URL to PostgreSQL

### Railway Deployment Issues

#### 502 Bad Gateway Error
If you encounter "502 Bad Gateway" with "connection refused":
1. Ensure Railway configuration uses script-based startup
2. Check that `railway.toml` has `startCommand = "./start.sh"`
3. Verify `backend/start.sh` uses proper PORT environment variable:
   ```bash
   SERVER_PORT=${PORT:-8001}
   exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${SERVER_PORT}"
   ```
4. Make sure `start.sh` is executable: `chmod +x backend/start.sh`
5. Redeploy by pushing changes to trigger Railway rebuild

#### Common Railway Startup Fixes
- Avoid direct `uvicorn` commands in `startCommand` - use shell scripts
- Never use `cd` commands in Railway startup (not executable in their environment)
- Use shell scripts with proper environment variable expansion
- Enable Railway V2 runtime: `NIXPACKS_V2 = "true"` in `railway.toml`

### Debugging Tools
- `/health` - Check backend health
- `/env` - View environment variables
- `/debug` - Simple connectivity test
- Railway dashboard logs

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenRouter**: For unified AI model access
- **Railway**: For cloud hosting and deployment
- **FastAPI**: For the amazing web framework
- **Contributors**: For code improvements and bug fixes

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/mangeshraut712/AssistMe-VirtualAssistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mangeshraut712/AssistMe-VirtualAssistant/discussions)
- **Documentation**: [Wiki](https://github.com/mangeshraut712/AssistMe-VirtualAssistant/wiki)

---

**Made with ❤️ for the AI community**
