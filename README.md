# AssistMe Virtual Assistant

A comprehensive AI-powered virtual assistant with support for multiple free-tier language models, real-time chat, conversation persistence, and voice input capabilities.

## 🚀 Production Status

### **✅ Active Deployments:**
- **Frontend:** [assist-me-virtual-assistant.vercel.app](https://assist-me-virtual-assistant.vercel.app)
- **Backend:** [assistme-virtualassistant-production.up.railway.app](https://assistme-virtualassistant-production.up.railway.app)
- **Repository:** [GitHub - mangeshraut712/AssistMe-VirtualAssistant](https://github.com/mangeshraut712/AssistMe-VirtualAssistant)

### **🤖 Supported AI Models:**
- Meta Llama 4 Scout (`meta-llama/llama-4-scout:free`)
- Qwen 3 14B (`qwen/qwen3-14b:free`)
- DeepSeek Chat V3.1 (`deepseek/deepseek-chat-v3.1:free`)
- Mistral Small 3.1 24B (`mistralai/mistral-small-3.1-24b-instruct:free`)
- DeepSeek R1T Chimera (`tngtech/deepseek-r1t-chimera:free`)
- Moonshot Kimi Dev 72B (`moonshotai/kimi-dev-72b:free`)
- NVIDIA Nemotron Nano 9B (`nvidia/nemotron-nano-9b-v2:free`)

## 🎯 Key Features

- **Multi-Model Support:** Choose from 7+ free-tier AI models via OpenRouter API
- **Real-time Chat:** Instant responses with typing indicators
- **Conversation Persistence:** Save and retrieve chat history
- **Voice Input:** Speech-to-text capabilities (Web Speech API)
- **File Uploads:** Support for text file analysis
- **Model Benchmarking:** Compare model performance across all supported models
- **Dark Mode:** Theme switching support
- **Responsive UI:** ChatGPT-inspired interface

## 🛠️ Technical Stack

### **Backend (Railway):**
- **Framework:** FastAPI with AsyncAPI support
- **Database:** PostgreSQL (via SQLAlchemy + Alembic migrations)
- **ORM:** SQLAlchemy ORM with pg8000 driver
- **AI API:** OpenRouter API integration
- **Validation:** Pydantic data models

### **Frontend (Vercel):**
- **Framework:** Vanilla JavaScript with modern ES6+ features
- **Styling:** Custom CSS with dark/light theme support
- **Charts:** Chart.js for model benchmarking visualization
- **Storage:** Local storage for conversation persistence

## 📋 API Endpoints

```bash
# Health Check
GET /health
# Returns: {"status": "ok", "service": "assistme-api"}

# Chat with AI
POST /api/chat/text
# Body: {"messages": [{"role": "user", "content": "Hello"}], "model": "meta-llama/llama-4-scout:free"}

# Get Conversation History
GET /api/conversations/{conversation_id}

# List All Conversations
GET /api/conversations
```

## 🚀 Local Development

### **Prerequisites:**
- Docker & Docker Compose
- Git

### **Setup:**
```bash
# Clone repository
git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant

# Start all services
docker-compose up --build -d

# Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8001
# Health check: curl http://localhost:8001/health
```

### **Environment Variables (Local - secrets.env):**
```env
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://assistme_user:assistme_password@db:5432/assistme_db
```

## 🔧 Configuration

### **Railway Backend Settings:**
- **Source:** GitHub (main branch)
- **Root Directory:** backend/
- **Build Command:** `cd backend && pip install -r requirements.txt && python -m alembic upgrade head`
- **Start Command:** Use Dockerfile CMD (leave field empty)
- **Port:** 8001 (automatically handled)
- **Environment Variables:**
  ```env
  OPENROUTER_API_KEY=[your-rotated-key]
  OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
  APP_URL=https://assist-me-virtual-assistant.vercel.app
  DATABASE_URL=[railway-postgres-url]
  ```

### **Vercel Frontend Settings:**
- **Source:** GitHub (main branch)
- **Root Directory:** frontend/
- **Environment Variables:**
  ```env
  NEXT_PUBLIC_API_BASE_URL=https://assistme-virtualassistant-production.up.railway.app
  ```

## 🧪 Testing & Verification

### **API Testing:**
```bash
# Test health endpoint
curl https://assistme-virtualassistant-production.up.railway.app/health

# Test chat API
curl -X POST https://assistme-virtualassistant-production.up.railway.app/api/chat/text \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello, how are you?"}], "model": "meta-llama/llama-4-scout:free"}'
```

### **Frontend Testing:**
1. Visit: [https://assist-me-virtual-assistant.vercel.app](https://assist-me-virtual-assistant.vercel.app)
2. Send a message and verify AI response
3. Test different models via the model selector
4. Click "Test Models" to run the benchmarking suite
5. Try voice input (Web Speech API supported browsers)

### **Verification Checklist:**
- [x] Frontend loads without errors
- [x] API calls succeed (no connection errors)
- [x] AI responses are generated
- [x] Conversations can be saved/retrieved
- [x] Multiple models work correctly
- [x] Voice input processes speech
- [x] File uploads are supported
- [x] Dark mode toggles properly

## 🔒 Security Notes

- **API Keys:** OpenRouter API key is rotated and externalized
- **Environment Variables:** Never commit secrets to version control
- **HTTPS:** All production endpoints use secure connections
- **CORS:** Configured for approved origins only

## 📊 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Railway        │    │   OpenRouter     │
│   (Vercel)      │◄──►│   Backend        │◄──►│   API            │
│                 │    │   (FastAPI)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                    ▲
                    │
           ┌────────▼────────┐
           │   Railway       │
           │   PostgreSQL    │
           │   Database      │
           └─────────────────┘
```

## 🐛 Troubleshooting

### **502 Errors from Backend:**
- Check Railway logs in dashboard
- Verify environment variables are set
- Ensure database connection is working
- Check if Start Command field is empty (use Dockerfile CMD)

### **Connection Refused from Frontend:**
- Verify NEXT_PUBLIC_API_BASE_URL in Vercel
- Check browser console for CORS errors
- Confirm backend is running and healthy

### **API Key Issues:**
- Rotate OpenRouter key if compromised
- Update environment variables in production
- Check API key permissions and quota

## 📄 License

[Add your preferred license here]

---

## 🚀 Quick Start

1. **Visit the live app:** [https://assist-me-virtual-assistant.vercel.app](https://assist-me-virtual-assistant.vercel.app)
2. **Send a message** to test the AI assistant
3. **Try different models** using the dropdown selector
4. **Run benchmarks** to compare model performance

**Backend API Documentation:** Available via FastAPI's automatic docs at `/docs` endpoint when running locally.
