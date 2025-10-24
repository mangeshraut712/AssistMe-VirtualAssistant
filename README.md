# AssistMe Virtual Assistant

A comprehensive AI-powered virtual assistant with support for multiple free-tier language models, real-time chat, conversation persistence, and voice input capabilities.

## 🚀 Production Status

### **✅ Active Deployments:**
- **Frontend:** [assist-me-virtual-assistant.vercel.app](https://assist-me-virtual-assistant.vercel.app)
- **Backend:** [assistme-virtualassistant-production.up.railway.app](https://assistme-virtualassistant-production.up.railway.app)
- **Repository:** [GitHub - mangeshraut712/AssistMe-VirtualAssistant](https://github.com/mangeshraut712/AssistMe-VirtualAssistant)

### **🤖 Supported AI Models (Updated October 2025):**

#### **✅ CONFIRMED WORKING MODELS (No Rate Limits - Test Ready):**
- **DeepSeek R1** (`deepseek/deepseek-r1:free`) ⭐ **Primary Model - Mathematically Accurate**
- **Qwen3 235B A22B** (`qwen/qwen3-235b-a22b:free`) 🧮 **Math Excellence - 100+ Languages**
- **Andromeda Alpha** (`openrouter/andromeda-alpha:free`) 📸 **Multimodal - Images & Files**

#### **⚠️ FUNCTIONAL MODELS (OpenRouter API Works - Rate Limited ~50/day):**
- **Mistral 7B** (`mistralai/mistral-7b-instruct:free`) 🤖 **Reliable General AI**
- **Llama 3.2 3B** (`meta-llama/llama-3.2-3b-instruct:free`) 🧠 **Latest Meta Architecture**
- **Zephyr 7B** (`huggingface/zephyr-7b-beta:free`) 🧱 **HuggingFace - Instruction Tuned**
- **Hermes 3 Llama** (`nousresearch/hermes-3-llama-3.1-405b:free`) 🔬 **Research-Grade Reasoning**
- **OpenChat 7B** (`openchat/openchat-7b:free`) 💬 **Creative Conversations**

### **📊 Model Selection Guide:**

| Model | Status | Best For | Model ID |
|-------|--------|----------|----------|
| **DeepSeek R1** | ✅ Ready | Universal reasoning, math, logic | `deepseek/deepseek-r1:free` |
| **Qwen3 235B** | ✅ Ready | Mathematics, programming, multi-language | `qwen/qwen3-235b-a22b:free` |
| **Andromeda Alpha** | ✅ Ready | Images, files, multimodal | `openrouter/andromeda-alpha:free` |
| **Mistral 7B** | ⚠️ Limited | General conversations | `mistralai/mistral-7b-instruct:free` |
| **Llama 3.2 3B** | ⚠️ Limited | Balanced performance | `meta-llama/llama-3.2-3b-instruct:free` |
| **Zephyr 7B** | ⚠️ Limited | Diverse capabilities | `huggingface/zephyr-7b-beta:free` |
| **Hermes 3** | ⚠️ Limited | Advanced reasoning | `nousresearch/hermes-3-llama-3.1-405b:free` |
| **OpenChat 7B** | ⚠️ Limited | Creative responses | `openchat/openchat-7b:free` |

### **🔑 Usage Notes:**
- **Rate Limit:** OpenRouter Free Tier = 50 requests/day total
- **Add Credits:** $10 → 1000 requests/day unlocked
- **Multi-Provider:** Mix different models to avoid hitting provider limits

## 🎯 Key Features

- **Multi-Model Support:** Choose from 8 validated AI models via OpenRouter API ⭐ **Updated October 2025**
- **Real-time Chat:** Instant responses with typing indicators
- **Conversation Persistence:** Save and retrieve chat history
- **Voice Input:** Speech-to-text capabilities (Web Speech API)
- **File Uploads:** Support for text file analysis
- **Model Benchmarking:** Compare model performance across all supported models
- **CEO Accuracy Testing:** Automated testing to verify factual accuracy 🧪 **New Feature**
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

### **CEO Accuracy Benchmark Testing** 🏆 **NEW FEATURE**

Test all 8 models with factual accuracy using the CEO of Alibaba question:

```bash
# Run comprehensive accuracy benchmark
export OPENROUTER_API_KEY="your-api-key"
python3 test_models.py

# Expected output shows accuracy rankings:
# ✅ DeepSeek R1 may show highest accuracy on CEO facts
# 📊 Response times and token usage metrics
# 🏅 Overall accuracy rate across all models
```

**Correct Answer (Google verified):** Eddie Wu (Eddie Yongming Wu)

### **API Testing:**
```bash
# Test health endpoint
curl https://assistme-virtualassistant-production.up.railway.app/health

# Test CEO question with confirmed working model
curl -X POST https://assistme-virtualassistant-production.up.railway.app/api/chat/text \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Who is the CEO of Alibaba? Give just the name."}], "model": "deepseek/deepseek-r1:free"}'

# Expected: "Eddie Wu" (most accurate model response)
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
