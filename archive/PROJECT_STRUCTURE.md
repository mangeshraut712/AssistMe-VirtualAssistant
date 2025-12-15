# 📁 Project Structure

```
AssistMe-VirtualAssistant/
│
├── 📦 modules/                          # Standalone feature modules
│   │
│   ├── 🎤 voice-mode/                  # Gemini Native Audio Voice Mode
│   │   ├── frontend/
│   │   │   ├── components/
│   │   │   │   ├── VoiceMode.jsx       # Main voice interface
│   │   │   │   └── AudioVisualizer.jsx # Web Audio API visualizer
│   │   │   └── utils/
│   │   │       └── audio-helpers.js    # Haptics, audio utilities
│   │   ├── backend/
│   │   │   └── services/
│   │   │       └── gemini_tts_service.py # Gemini TTS (NO browser fallback)
│   │   ├── config/
│   │   │   ├── voices.config.py        # 30 voices, 24 languages
│   │   │   └── voice.config.js         # Frontend voice config
│   │   ├── docs/
│   │   │   └── INTEGRATION.md          # Integration guide
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── 💬 chat/                        # Text chat module
│   │   ├── frontend/components/
│   │   ├── backend/services/
│   │   └── README.md
│   │
│   ├── 📚 grokipedia/                  # Knowledge base RAG
│   │   ├── frontend/components/
│   │   ├── backend/services/
│   │   └── README.md
│   │
│   ├── 🎨 imagine/                     # AI image generation
│   │   ├── frontend/components/
│   │   ├── backend/services/
│   │   └── README.md
│   │
│   ├── ⚡ speedtest/                   # Network diagnostics
│   │   ├── frontend/components/
│   │   ├── backend/services/
│   │   └── README.md
│   │
│   └── 🛠️ ai-studio/                   # Model playground
│       ├── frontend/components/
│       ├── backend/services/
│       └── README.md
│
├── 🎨 src/                              # Main application frontend
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── InputArea.jsx
│   │   │   └── ChatArea.jsx
│   │   └── features/                    # Will import from modules/
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Chat.jsx
│   │   ├── Voice.jsx
│   │   ├── Grokipedia.jsx
│   │   ├── Imagine.jsx
│   │   └── Speedtest.jsx
│   ├── hooks/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
│
├── 🔧 backend/                          # FastAPI backend
│   ├── app/
│   │   ├── main.py                     # Main API
│   │   ├── providers/
│   │   │   └── openrouter.py           # Model provider
│   │   ├── services/
│   │   │   ├── voice_service.py
│   │   │   ├── embedding_service.py
│   │   │   └── rate_limit_service.py
│   │   ├── routes/
│   │   │   ├── speech.py
│   │   │   ├── knowledge.py
│   │   │   ├── image.py
│   │   │   └── multimodal.py
│   │   ├── models.py                   # Database models
│   │   └── database.py
│   ├── requirements.txt
│   └── vercel.json
│
├── 📚 archive/                          # Legacy/backup files
│   ├── legacy/                          # Old .md files
│   │   ├── CHANGELOG.md
│   │   ├── CONTRIBUTING.md
│   │   └── DEPLOYMENT_SUMMARY.md
│   └── backup/                          # Backup files
│
├── 🔐 Configuration files
│   ├── .env.example                    # Environment template
│   ├── .gitignore
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── vercel.json
│
└── 📖 Documentation
    └── README.md                        # Main project README
```

## Module Organization

Each module follows this structure:

```
module-name/
├── frontend/
│   ├── components/       # React components
│   ├── hooks/            # Custom hooks
│   └── utils/            # Utilities
├── backend/
│   ├── services/         # Business logic
│   └── routes/           # API endpoints
├── config/               # Configuration
├── docs/                 # Documentation
├── package.json          # Module metadata
└── README.md             # Module docs
```

## Integration Points

### Frontend Integration
```javascript
// src/App.jsx
import VoiceMode from './modules/voice-mode/frontend/components/VoiceMode';
import Chat from './modules/chat/frontend/components/Chat';
import Grokipedia from './modules/grokipedia/frontend/components/Grokipedia';
```

### Backend Integration
```python
# backend/app/main.py
from modules.voice_mode.backend.services.gemini_tts_service import gemini_tts_service
from modules.grokipedia.backend.services.embedding_service import embedding_service
```

## File Categories

### ✅ Keep
- All files in `modules/`
- All files in `src/`
- All files in `backend/`
- `README.md` (main)
- `.env.example`
- `package.json`
- Config files (vite, tailwind, etc.)

### 📦 Archived
- `*.md` files (except README.md) → `archive/legacy/`
- Old feature files → `archive/backup/`
- Deprecated components → `archive/legacy/`

### 🗑️ Can Remove
- `node_modules/` (gitignored)
- `.venv/` (gitignored)
- Build artifacts in `.vite/`
- Temporary files

## Best Practices

1. **Module Independence**: Each module should work standalone
2. **Clear APIs**: Document all APIs in module READMEs
3. **No Duplication**: Share common code via utils
4. **Version Control**: Use semantic versioning for modules
5. **Documentation**: Keep docs up-to-date
