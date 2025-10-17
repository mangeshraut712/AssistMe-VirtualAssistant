# AssistMe Virtual Assistant

AssistMe is a sophisticated AI chat experience featuring an exact ChatGPT.com-inspired UI with advanced metadata display, conversation management, and a robust FastAPI backend that proxies requests to OpenRouter. It includes modern features like response metadata, voice input, file uploads, and comprehensive benchmarking tools.

## Demo

Try the live demo: [https://assist-me-virtual-assistant.vercel.app/](https://assist-me-virtual-assistant.vercel.app/)

Note: The demo frontend points to a local backend by default. For a fully functional online experience, set up the backend API with your own OpenRouter API key.

## Project Structure

```
assistme-virtual-assistant/
├── backend/                 # FastAPI service
│   ├── app/
│   │   ├── __init__.py
│   │   ├── chat_client.py   # OpenRouter client
│   │   ├── database.py      # SQLAlchemy session + Base
│   │   ├── main.py          # FastAPI application
│   │   └── models.py        # SQLAlchemy models
│   ├── alembic/             # Database migrations
│   ├── alembic.ini
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # Static single page chat UI
│   ├── assets/logo.png
│   ├── index.html
│   ├── mathjs.js
│   ├── script.js
│   └── style.css
├── docker-compose.yml       # Postgres + FastAPI stack
├── docs/                    # Roadmap and planning docs
├── SECURITY.md
└── README.md
```

## Prerequisites

- Docker and Docker Compose (recommended for the full stack)
- Python 3.11+ (if running the backend without Docker)
- An OpenRouter API key (`https://openrouter.ai/`)

## API Key Setup

### For Local Development

Before trying to run the project locally, you must add your OpenRouter API key:

1. Get an API key from https://openrouter.ai/

2. Create a `secrets.env` file in the root directory:

   ```bash
   echo "OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key" > secrets.env
   ```

   Or use the provided `.env.example` as a template.

### For Online/Deployment Users

- **Vercel (Frontend only)**: The frontend is automatically deployed. To connect to a backend, update the `ASSISTME_API_BASE` variable in `frontend/script.js` to your deployed backend API URL (e.g., your FastAPI server URL).

- **Docker FastAPI Backend**: When deploying the backend, set the `OPENROUTER_API_KEY` environment variable or mount a secrets file. For example:

  ```bash
  docker run -e OPENROUTER_API_KEY=your-key your-backend-image
  ```

  Ensure the database is accessible and migrations are run.

## Running with Docker Compose

1. Clone the repo and create a `secrets.env` file next to `docker-compose.yml`:
   ```bash
   git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
   cd AssistMe-VirtualAssistant

   cat > secrets.env <<'ENV'
   OPENROUTER_API_KEY=sk-or-v1-your-key
   OPENROUTER_DEFAULT_MODEL=meta-llama/llama-4-scout
   ENV
   ```

2. Start the stack:
   ```bash
   docker-compose up --build
   ```

   Services exposed:
   - FastAPI backend: http://localhost:8001
   - PostgreSQL: localhost:5432

3. Apply the migrations (only the first time):
   ```bash
   docker-compose exec api alembic upgrade head
   ```

4. Serve the frontend (for example with any static file server):
   ```bash
   python -m http.server 3001 --directory frontend
   # Or use any static file server on port 3001
   ```

5. Open http://localhost:3001 in your browser and start chatting.

## Running the Backend without Docker

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export OPENROUTER_API_KEY=sk-or-v1-your-key
export DATABASE_URL=postgresql://localhost:5432/assistme_db

alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Run a local PostgreSQL instance (Docker or native) before starting the API.

## Frontend Development

The UI is plain HTML/CSS/JS. Open `frontend/index.html` directly or serve the directory through your favourite static server. The script automatically points to `http://localhost:8001` when running on `localhost`.

For production deployment, update the `ASSISTME_API_BASE` variable in `frontend/script.js` to match your deployed backend API URL (e.g., `https://your-backend-api.com`).

## Backend Deployment

The purpose of the Docker FastAPI backend is to handle AI requests securely server-side, keeping the OpenRouter API key protected (not exposed in client code). The frontend makes HTTP requests to the backend API, which then proxies to OpenRouter.

This provides several benefits:
- **Security**: API keys are not hardcoded in client-side JavaScript.
- **Features**: Enables voice input, file uploads, conversation persistence, and all interactive AI features.
- **Scalability**: Backend can handle rate limits, caching, and database persistence.

Vercel environment variables cannot be used for the API key in a secure way for this architecture, as the backend runs separately. The API key must be set in the backend deployment environment.

## Backend Deployment

### 1. Build and Run Backend Container Locally (for testing)

If you want to test locally before deploying:

```bash
cd backend
docker build -t assistme-backend .
docker run -p 8001:8001 --env OPENROUTER_API_KEY=your-actual-api-key assistme-backend
```

This starts the FastAPI server on port 8001. Update `ASSISTME_API_BASE` in frontend script to `ASK_APPLI_API_BASE="http://localhost:8001";` and test locally.

### 2. Deploy Backend to Production

For production deployment, deploy the container to a platform like Heroku, Fly.io, Railway, or AWS ECS.

#### Example with Fly.io (Simple and Free Tier Available):

1. Install Fly.io CLI: `curl -L https://fly.io/install.sh | sh`

2. Authenticate: `fly auth login`

3. In the backend directory, create a `fly.toml` file:

   ```toml
   app = "assistme-backend"
   primary_region = "iad"

   [build]
   builder = "paketobuildpacks/builder:noble-full"
   buildpacks = ["paketobuildpacks/ca-certificates-helper", "paketobuildpacks/python"]

   [env]
     OPENROUTER_API_KEY = "your-actual-openrouter-key"
     OPENROUTER_DEFAULT_MODEL = "meta-llama/llama-4-scout"
     DATABASE_URL = "postgresql://your-db-url"  # Use a hosted DB like Supabase or Fly's PostgreSQL

   [processes]
   web = "uvicorn app.main:app --host=0.0.0.0 --port=$PORT"
   ```

4. Deploy: `fly deploy`

5. Get the app URL: `fly info -a assistme-backend`

6. Update frontend script: Change `ASSISTME_API_BASE` to your Fly.io URL, e.g., `window.ASSISTME_API_BASE="https://your-app.fly.dev";`

### Other Platforms:

- **Railway**: Connect GitHub repo, set environment vars in dashboard, deploy.

- **Heroku**: Build Docker image or use Python buildpack.

- **AWS ECS**: Use ECR for Docker image, Fargate for running.

Ensure your deployed backend has access to a PostgreSQL database (e.g., Supabase, PlanetScale, or platform-provided).

## Publishing the Website

### Frontend Deployment Options

You do **not need Vercel** to publish the site. Vercel is just one free option; you can publish the frontend anywhere static sites are supported.

#### Vercel (Current Setup):
- Automatically deploys from GitHub repo.
- Ensure `ASSISTME_API_BASE` in `script.js` points to your live backend URL.
- Uses `vercel.json` config for output directory.

#### Alternative Platforms (Vercel not required):
- **GitHub Pages**: Free, no custom domain cost. Serve with any static server.
- **Netlify**: Free tier available, drag-and-drop deploy.
- **Render**: Free static site hosting.
- **AWS S3 + CloudFront**: Low cost, global CDN.
- **Firebase Hosting**: Free tier for small sites.

For any static host:
1. Upload the `frontend/` folder contents.
2. Update `ASSISTME_API_BASE` in `script.js` to your deployed backend URL.

**Note**: No API key is needed in the frontend; it remains secure in the backend.

### Backend

Follow the deployment steps above to publish the backend API to platforms like Fly.io, Railway, Heroku, or AWS ECS.

## ✨ **New Features in Latest Release**

### **📊 Response Metadata Display**
Each AI response now shows comprehensive metadata below the message:
- **Source**: API provider (OpenRouter/Together AI)
- **Model**: Formatted model display name (e.g., "Llama 4 Scout", "DeepSeek V3.1")
- **Category**: Auto-classified response type (Code, Explanation, Creative, Problem Solving, etc.)
- **Runtime**: Actual response time in seconds

### **🎤 Voice Input Support**
- Web Speech API integration for voice-to-text input
- Visual recording indicator with animation
- Automatic speech recognition with fallback handling
- Works in Chrome, Edge, and Safari browsers

### **📁 File Upload & Processing**
- Drag-and-drop or click-to-upload file support
- Text file preview and processing
- File size and type validation
- Integration with chat context

### **📈 Advanced Model Benchmarking**
- Compare 7+ AI models side-by-side
- Interactive charts and statistics
- Response time, accuracy, and GPU usage metrics
- Chart.js-powered visualizations

### **🎨 Enhanced ChatGPT.com-Inspired UI**
- Exact color scheme matching ChatGPT.com
- Sidebar with conversation history management
- Model selector dropdown with display names
- Message actions (copy functionality)
- Typing indicators and smooth animations
- Dark/Light theme toggle with smooth transitions

### **💬 Conversation Management**
- Persistent conversation history with localStorage
- Automatic conversation titling
- Conversation search and navigation
- Send/cancel buttons with input validation

### **🔧 Technical Improvements**
- Response time tracking and performance monitoring
- Better error handling and user feedback
- Cross-browser compatibility
- Mobile-responsive design
- Accessibility features (keyboard navigation, screen reader support)

## Configuration

### **Backend Environment Variables**
| Variable                 | Description                                                  | Default                              |
|--------------------------|--------------------------------------------------------------|--------------------------------------|
| `OPENROUTER_API_KEY`     | Required: OpenRouter API key                                 | `""`                                 |
| `OPENROUTER_DEFAULT_MODEL` | Model id used when the client does not pass one            | `meta-llama/llama-4-scout`           |
| `OPENROUTER_BASE_URL`    | Override the OpenRouter API base URL                         | `https://openrouter.ai/api/v1`       |
| `OPENROUTER_TIMEOUT`     | API request timeout in seconds                               | `60.0`                               |
| `APP_URL`                | Used for OpenRouter referer header                           | `http://localhost:3001`              |
| `APP_NAME`               | Application name for API headers                             | `AssistMe Virtual Assistant`         |
| `DATABASE_URL`           | SQLAlchemy connection string                                 | `postgresql://assistme_user:assistme_password@localhost:5432/assistme_db` |

### **Frontend Configuration**
| Setting                  | Description                                                  | Default                              |
|--------------------------|--------------------------------------------------------------|--------------------------------------|
| `ASSISTME_API_BASE`      | Backend API base URL (window variable)                       | `http://localhost:8001`              |

## API Endpoints & Tests

### **Health & Health Checks**
- `GET /health` – simple status endpoint

### **Chat & Conversations**
- `POST /api/chat/text` – main chat endpoint for text conversations
- `GET /api/conversations` – retrieve persisted conversation sessions
- `POST /api/conversations` – create new conversation (implicit)
- `PUT /api/conversations/{id}` – update existing conversation
- `DELETE /api/conversations/{id}` – delete conversation

### **Model Management**
- `GET /api/models` – list available AI models
- `GET /api/models/{id}` – get specific model details
- `POST /api/benchmark` – run model benchmarking tests

### **Testing Commands**
```bash
# Basic health check
curl http://localhost:8001/health

# Simple chat test
curl -X POST http://localhost:8001/api/chat/text \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "meta-llama/llama-4-scout:free"
  }'

# Check available models
curl http://localhost:8001/api/models

# Test conversation persistence
curl http://localhost:8001/api/conversations
```

## Cleaning Up

Remove containers and volumes created by Docker Compose:
```bash
docker-compose down -v
```

## Security Notes

- `secrets.env` is listed in `.gitignore`. Never commit it.
- Rotate your OpenRouter key regularly and use read-only scopes when possible.

## Roadmap

The high-level plan for adding Grok-2 inference and Google S2R inspired voice features lives in [`docs/grok2-s2r-roadmap.md`](docs/grok2-s2r-roadmap.md).

---

Enjoy building with AssistMe! If you run into issues, feel free to open a GitHub issue or adapt the stack to your needs.
