# 📋 Phase-by-Phase Implementation Checklist

This document breaks down each phase into actionable tasks with specific files, commands, and acceptance criteria.

---

## 🔴 PHASE 1: Critical Fixes & Stabilization (Week 1-2)

### Task 1.1: Deploy Vercel Fixes ✅
**Status**: Code ready, needs deployment  
**Time**: 10 minutes  
**Priority**: CRITICAL

**Steps**:
```bash
# 1. Verify build works
cd /Users/mangeshraut/Downloads/AssistMe-VirtualAssistant
npm run build

# 2. Commit and push
git add .
git commit -m "fix: Deploy health endpoint and theme improvements"
git push origin main

# 3. Monitor deployment
# Go to: https://vercel.com/your-project/deployments
# Wait for green checkmark
```

**Verification**:
- [ ] Build completes without errors
- [ ] Deployment shows green status
- [ ] https://assist-me-virtual-assistant.vercel.app/ loads
- [ ] https://assist-me-virtual-assistant.vercel.app/health returns JSON

---

### Task 1.2: Fix Railway Deployment
**Time**: 20 minutes  
**Priority**: CRITICAL

**Steps**:

#### Step 1: Update Environment Variables
Go to: https://railway.app/project/your-project/variables

**Change**:
```bash
AI_PROVIDER=minimax  # ❌ Wrong
```

**To**:
```bash
AI_PROVIDER=openrouter  # ✅ Correct
```

**Verify these are set**:
```bash
OPENROUTER_API_KEY=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
APP_URL=https://assist-me-virtual-assistant.vercel.app
DEV_MODE=false
FASTAPI_BIND_HOST=0.0.0.0
PYTHONUNBUFFERED=1
```

#### Step 2: Restart Service
In Railway dashboard:
1. Click on backend service
2. Click "Restart"
3. Watch logs for errors

#### Step 3: Verify Health
```bash
curl https://assistme-virtualassistant-production.up.railway.app/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "components": {
    "database": {"status": "connected"},
    "chat_client": {"status": "available"}
  }
}
```

**Verification**:
- [ ] Railway deployment is green
- [ ] Health endpoint returns JSON (not HTML)
- [ ] Status is "healthy"
- [ ] No errors in logs

---

### Task 1.3: Create Environment Templates
**Time**: 30 minutes  
**Priority**: HIGH

**Files Already Created**:
- ✅ `.env.local.template`
- ✅ `.env.vercel.template`
- ✅ `.env.railway.template`

**Next Steps**:

#### Step 1: Create Local Environment
```bash
cd /Users/mangeshraut/Downloads/AssistMe-VirtualAssistant
cp .env.local.template .env.local
```

#### Step 2: Edit .env.local
```bash
# Open in editor
code .env.local
# or
nano .env.local
```

**Add your actual keys**:
```bash
OPENROUTER_API_KEY=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
AI_PROVIDER=openrouter
APP_URL=http://localhost:3000
DEV_MODE=true
DATABASE_URL=  # Leave empty for SQLite
```

#### Step 3: Test Local Setup
```bash
# Terminal 1 - Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

# Terminal 2 - Frontend
npm install
npm run dev
```

**Verification**:
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] http://127.0.0.1:8001/health returns JSON
- [ ] http://localhost:5173 loads
- [ ] Can send chat messages
- [ ] Receive AI responses

---

### Task 1.4: Fix AI Provider Configuration
**Time**: 2-3 hours  
**Priority**: HIGH

**Goal**: Create unified provider abstraction to support OpenRouter, Minimax, and XAI

**Files to Create**:

#### 1. `backend/app/providers/__init__.py`
```python
"""AI Provider abstraction layer."""
from .base import BaseProvider
from .openrouter import OpenRouterProvider
from .minimax import MinimaxProvider
from .xai import XAIProvider
from .factory import get_provider

__all__ = [
    "BaseProvider",
    "OpenRouterProvider",
    "MinimaxProvider",
    "XAIProvider",
    "get_provider",
]
```

#### 2. `backend/app/providers/base.py`
```python
"""Base provider interface."""
from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, List, Optional

class BaseProvider(ABC):
    """Base class for AI providers."""
    
    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        stream: bool = False,
    ) -> Dict | AsyncIterator:
        """Generate chat completion."""
        pass
    
    @abstractmethod
    async def list_models(self) -> List[Dict]:
        """List available models."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available."""
        pass
```

#### 3. `backend/app/providers/openrouter.py`
```python
"""OpenRouter provider implementation."""
import os
import httpx
from typing import AsyncIterator, Dict, List
from .base import BaseProvider

class OpenRouterProvider(BaseProvider):
    """OpenRouter AI provider."""
    
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self.default_model = os.getenv("OPENROUTER_DEFAULT_MODEL", "google/gemini-2.0-flash-001")
    
    async def chat_completion(self, messages, model=None, temperature=0.7, max_tokens=1024, stream=False):
        """Generate chat completion using OpenRouter."""
        # Implementation here (use existing chat_client.py logic)
        pass
    
    async def list_models(self):
        """List OpenRouter models."""
        # Implementation here
        pass
    
    def is_available(self) -> bool:
        """Check if OpenRouter is configured."""
        return bool(self.api_key)
```

#### 4. `backend/app/providers/minimax.py`
```python
"""Minimax provider implementation."""
import os
from typing import AsyncIterator, Dict, List
from .base import BaseProvider

class MinimaxProvider(BaseProvider):
    """Minimax AI provider."""
    
    def __init__(self):
        self.api_key = os.getenv("MINIMAX_API_KEY")
        self.base_url = os.getenv("MINIMAX_BASE_URL", "https://api.minimax.chat/v1")
        self.agent_model = os.getenv("MINIMAX_AGENT_MODEL", "minimax/minimax-m2")
    
    async def chat_completion(self, messages, model=None, temperature=0.7, max_tokens=1024, stream=False):
        """Generate chat completion using Minimax."""
        # Implementation here
        pass
    
    async def list_models(self):
        """List Minimax models."""
        return [
            {"id": self.agent_model, "name": "Minimax M2"},
            {"id": "hailuo-02", "name": "Hailuo Video"},
            {"id": "image-01", "name": "Minimax Image"},
        ]
    
    def is_available(self) -> bool:
        """Check if Minimax is configured."""
        return bool(self.api_key)
```

#### 5. `backend/app/providers/xai.py`
```python
"""XAI/Grok provider implementation."""
import os
from typing import AsyncIterator, Dict, List
from .base import BaseProvider

class XAIProvider(BaseProvider):
    """XAI/Grok AI provider."""
    
    def __init__(self):
        self.api_key = os.getenv("XAI_API_KEY")
        self.base_url = "https://api.x.ai/v1"
    
    async def chat_completion(self, messages, model=None, temperature=0.7, max_tokens=1024, stream=False):
        """Generate chat completion using XAI."""
        # Implementation here
        pass
    
    async def list_models(self):
        """List XAI models."""
        return [
            {"id": "grok-2", "name": "Grok 2"},
        ]
    
    def is_available(self) -> bool:
        """Check if XAI is configured."""
        return bool(self.api_key)
```

#### 6. `backend/app/providers/factory.py`
```python
"""Provider factory."""
import os
from .openrouter import OpenRouterProvider
from .minimax import MinimaxProvider
from .xai import XAIProvider

def get_provider():
    """Get the configured AI provider."""
    provider_name = os.getenv("AI_PROVIDER", "openrouter").lower()
    
    providers = {
        "openrouter": OpenRouterProvider,
        "minimax": MinimaxProvider,
        "xai": XAIProvider,
    }
    
    provider_class = providers.get(provider_name)
    if not provider_class:
        raise ValueError(f"Unknown provider: {provider_name}")
    
    provider = provider_class()
    if not provider.is_available():
        # Fallback to OpenRouter
        return OpenRouterProvider()
    
    return provider
```

**Update `backend/app/main.py`**:
```python
# Replace chat_client import with:
from .providers import get_provider

# In endpoints, use:
provider = get_provider()
response = await provider.chat_completion(messages, model, temperature, max_tokens, stream=True)
```

**Verification**:
- [ ] Can switch providers via AI_PROVIDER env var
- [ ] OpenRouter works
- [ ] Minimax works (if API key provided)
- [ ] XAI works (if API key provided)
- [ ] Fallback to OpenRouter if provider unavailable
- [ ] All tests pass

---

### Task 1.5: Update Dependencies
**Time**: 1 hour  
**Priority**: MEDIUM

**Frontend Dependencies**:
```bash
# Check outdated packages
npm outdated

# Update package.json
npm update

# Or update specific packages
npm install vite@latest @vitejs/plugin-legacy@latest

# Audit security
npm audit fix
```

**Backend Dependencies**:
```bash
cd backend

# Check outdated packages
pip list --outdated

# Update requirements.txt
# Manually update version numbers, then:
pip install -r requirements.txt --upgrade

# Or use pip-review
pip install pip-review
pip-review --auto
```

**Suggested Updates**:
```txt
# requirements.txt
fastapi==0.115.0  # was 0.112.0
uvicorn[standard]==0.32.0  # was 0.30.6
sqlalchemy==2.0.36  # was 2.0.34
httpx==0.28.0  # was 0.27.0
```

**Verification**:
- [ ] All packages updated
- [ ] No security vulnerabilities
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Application works locally

---

### Task 1.6: Document Environment Variables
**Time**: 1 hour  
**Priority**: MEDIUM

**Create `ENVIRONMENT_VARIABLES.md`**:

```markdown
# Environment Variables Reference

## AI Providers

### OPENROUTER_API_KEY
- **Required**: Yes (if AI_PROVIDER=openrouter)
- **Type**: String
- **Example**: `sk-or-v1-...`
- **Get from**: https://openrouter.ai/keys
- **Description**: API key for OpenRouter service

### AI_PROVIDER
- **Required**: Yes
- **Type**: String (enum)
- **Options**: openrouter, minimax, xai
- **Default**: openrouter
- **Description**: Which AI provider to use

... (document all 33+ variables)
```

**Verification**:
- [ ] All variables documented
- [ ] Examples provided
- [ ] Required vs optional marked
- [ ] Links to get API keys
- [ ] Default values listed

---

## Phase 1 Completion Checklist

- [ ] Vercel deployment is GREEN
- [ ] Railway deployment is GREEN
- [ ] GitHub Actions: 4/4 checks passing
- [ ] Health endpoint returns proper JSON
- [ ] Local development works
- [ ] Environment templates created
- [ ] AI provider abstraction implemented
- [ ] All dependencies updated
- [ ] Environment variables documented
- [ ] No security vulnerabilities
- [ ] All tests pass
- [ ] Documentation updated

**When all checked, proceed to Phase 2**

---

## 🟡 PHASE 2: Voice & Speech Integration (Week 3-4)

### Task 2.1: Install Whisper Dependencies
**Time**: 30 minutes  
**Priority**: HIGH

**Steps**:
```bash
cd backend

# Install ffmpeg (required by Whisper)
# Mac:
brew install ffmpeg

# Linux:
sudo apt update && sudo apt install ffmpeg

# Add to requirements.txt
echo "openai-whisper==20231117" >> requirements-speech.txt
echo "ffmpeg-python==0.2.0" >> requirements-speech.txt

# Install
pip install -r requirements-speech.txt
```

**Verification**:
- [ ] ffmpeg installed
- [ ] Whisper installed
- [ ] Can import whisper in Python
- [ ] No installation errors

---

### Task 2.2: Create Whisper Service
**Time**: 2-3 hours  
**Priority**: HIGH

**Create `backend/app/services/whisper_service.py`**:

```python
"""Whisper speech-to-text service."""
import whisper
import tempfile
import os
from typing import Optional

class WhisperService:
    """Service for speech-to-text using Whisper."""
    
    def __init__(self, model_size: str = "base"):
        """Initialize Whisper with specified model size.
        
        Args:
            model_size: tiny, base, small, medium, large
        """
        self.model = whisper.load_model(model_size)
    
    async def transcribe(
        self,
        audio_file: bytes,
        language: Optional[str] = None,
    ) -> dict:
        """Transcribe audio to text.
        
        Args:
            audio_file: Audio file bytes
            language: Optional language code (e.g., 'en', 'hi')
        
        Returns:
            dict with 'text', 'language', 'segments'
        """
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_file)
            tmp_path = tmp.name
        
        try:
            # Transcribe
            result = self.model.transcribe(
                tmp_path,
                language=language,
                task="transcribe",
            )
            
            return {
                "text": result["text"],
                "language": result["language"],
                "segments": result["segments"],
            }
        finally:
            # Cleanup
            os.unlink(tmp_path)
    
    async def detect_language(self, audio_file: bytes) -> str:
        """Detect language from audio.
        
        Args:
            audio_file: Audio file bytes
        
        Returns:
            Language code (e.g., 'en', 'hi')
        """
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_file)
            tmp_path = tmp.name
        
        try:
            # Load audio and detect language
            audio = whisper.load_audio(tmp_path)
            audio = whisper.pad_or_trim(audio)
            mel = whisper.log_mel_spectrogram(audio).to(self.model.device)
            _, probs = self.model.detect_language(mel)
            
            return max(probs, key=probs.get)
        finally:
            os.unlink(tmp_path)

# Global instance
whisper_service = WhisperService(model_size="base")
```

**Verification**:
- [ ] Service can be imported
- [ ] Can transcribe audio
- [ ] Can detect language
- [ ] Handles errors gracefully
- [ ] Cleans up temp files

---

### Task 2.3: Create Speech API Endpoints
**Time**: 2 hours  
**Priority**: HIGH

**Create `backend/app/routes/speech.py`**:

```python
"""Speech-to-text API endpoints."""
from fastapi import APIRouter, File, UploadFile, HTTPException
from ..services.whisper_service import whisper_service

router = APIRouter(prefix="/api/speech", tags=["speech"])

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = None,
):
    """Transcribe audio file to text.
    
    Args:
        file: Audio file (wav, mp3, m4a, etc.)
        language: Optional language code
    
    Returns:
        Transcription result
    """
    try:
        # Read file
        audio_bytes = await file.read()
        
        # Transcribe
        result = await whisper_service.transcribe(audio_bytes, language)
        
        return {
            "success": True,
            "text": result["text"],
            "language": result["language"],
            "segments": result["segments"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect-language")
async def detect_language(file: UploadFile = File(...)):
    """Detect language from audio file.
    
    Args:
        file: Audio file
    
    Returns:
        Detected language code
    """
    try:
        audio_bytes = await file.read()
        language = await whisper_service.detect_language(audio_bytes)
        
        return {
            "success": True,
            "language": language,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages."""
    return {
        "success": True,
        "languages": [
            {"code": "en", "name": "English"},
            {"code": "hi", "name": "Hindi"},
            {"code": "ta", "name": "Tamil"},
            {"code": "te", "name": "Telugu"},
            # ... add all supported languages
        ],
    }
```

**Add to `backend/app/main.py`**:
```python
from .routes import speech

app.include_router(speech.router)
```

**Verification**:
- [ ] Can upload audio file
- [ ] Transcription works
- [ ] Language detection works
- [ ] Returns proper JSON
- [ ] Handles errors

---

### Task 2.4: Create Voice Recorder Component
**Time**: 3-4 hours  
**Priority**: HIGH

**Create `frontend/components/VoiceRecorder.js`**:

```javascript
/**
 * Voice Recorder Component
 * Handles audio recording and transcription
 */
class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            return false;
        }
    }
    
    async stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder) {
                resolve(null);
                return;
            }
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.isRecording = false;
                resolve(audioBlob);
            };
            
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        });
    }
    
    async transcribe(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');
        
        const response = await fetch('/api/speech/transcribe', {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();
        return result.text;
    }
}

export default VoiceRecorder;
```

**Add to chat interface**:
```javascript
// Add voice button
const voiceButton = document.createElement('button');
voiceButton.innerHTML = '🎤';
voiceButton.className = 'voice-button';
voiceButton.onclick = handleVoiceInput;

// Handle voice input
async function handleVoiceInput() {
    const recorder = new VoiceRecorder();
    
    // Start recording
    const started = await recorder.startRecording();
    if (!started) {
        alert('Could not access microphone');
        return;
    }
    
    // Change button to stop
    voiceButton.innerHTML = '⏹️';
    voiceButton.classList.add('recording');
    
    // Wait for user to stop
    voiceButton.onclick = async () => {
        const audioBlob = await recorder.stopRecording();
        const text = await recorder.transcribe(audioBlob);
        
        // Insert transcribed text into input
        messageInput.value = text;
        
        // Reset button
        voiceButton.innerHTML = '🎤';
        voiceButton.classList.remove('recording');
        voiceButton.onclick = handleVoiceInput;
    };
}
```

**Verification**:
- [ ] Can record audio
- [ ] Recording indicator shows
- [ ] Can stop recording
- [ ] Transcription appears in input
- [ ] Works on desktop and mobile
- [ ] Handles permission errors

---

## Phase 2 Completion Checklist

- [ ] Whisper installed and working
- [ ] Speech-to-text API endpoints created
- [ ] Voice recorder component works
- [ ] Can record and transcribe audio
- [ ] Supports multiple languages
- [ ] TTS implemented (Minimax or AI4Bharat)
- [ ] Voice-enabled chat interface
- [ ] Mobile voice input works
- [ ] Error handling implemented
- [ ] Documentation updated

**When all checked, proceed to Phase 3**

---

## 🟢 PHASE 3: Grokipedia Integration (Week 5-6)

### Task 3.1: Research Grokipedia
**Time**: 2-3 hours  
**Priority**: MEDIUM

**Steps**:
1. Visit https://grokipedia.com/
2. Research API documentation
3. Understand data format
4. Plan integration approach

**Notes**:
- Grokipedia may be a knowledge base concept
- May need to create custom implementation
- Use XAI/Grok API for knowledge retrieval
- Or implement local vector database

---

### Task 3.2: Implement Vector Embeddings
**Time**: 3-4 hours  
**Priority**: MEDIUM

**Install dependencies**:
```bash
cd backend
echo "sentence-transformers==2.2.2" >> requirements-ml.txt
echo "faiss-cpu==1.7.4" >> requirements-ml.txt
pip install -r requirements-ml.txt
```

**Create `backend/app/services/embedding_service.py`**:

```python
"""Vector embedding service for knowledge retrieval."""
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from typing import List, Tuple

class EmbeddingService:
    """Service for generating and searching embeddings."""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.documents = []
    
    def embed_text(self, text: str) -> np.ndarray:
        """Generate embedding for text."""
        return self.model.encode([text])[0]
    
    def embed_batch(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for multiple texts."""
        return self.model.encode(texts)
    
    def build_index(self, documents: List[str]):
        """Build FAISS index from documents."""
        self.documents = documents
        embeddings = self.embed_batch(documents)
        
        # Create FAISS index
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings.astype('float32'))
    
    def search(self, query: str, top_k: int = 3) -> List[Tuple[str, float]]:
        """Search for similar documents."""
        if not self.index:
            return []
        
        query_embedding = self.embed_text(query).astype('float32').reshape(1, -1)
        distances, indices = self.index.search(query_embedding, top_k)
        
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx < len(self.documents):
                results.append((self.documents[idx], float(distance)))
        
        return results

# Global instance
embedding_service = EmbeddingService()
```

**Verification**:
- [ ] Can generate embeddings
- [ ] Can build index
- [ ] Can search for similar documents
- [ ] Returns relevant results
- [ ] Performance is acceptable

---

## Continue with remaining phases...

Each phase should follow this pattern:
1. **Task breakdown** with time estimates
2. **Specific files** to create/modify
3. **Code examples** for implementation
4. **Verification steps** for each task
5. **Completion checklist** for phase

---

## 📊 Overall Progress Tracking

### Phase Completion Status
- [ ] Phase 1: Critical Fixes (Week 1-2)
- [ ] Phase 2: Voice & Speech (Week 3-4)
- [ ] Phase 3: Grokipedia (Week 5-6)
- [ ] Phase 4: UI Modernization (Week 7-8)
- [ ] Phase 5: AI4Bharat Advanced (Week 9-10)
- [ ] Phase 6: Performance (Week 11-12)
- [ ] Phase 7: Security (Week 13-14)
- [ ] Phase 8: Testing (Week 15-16)
- [ ] Phase 9: Mobile & PWA (Week 17-18)
- [ ] Phase 10: Advanced Features (Week 19-20)

### Current Sprint
**Week**: 1  
**Phase**: 1  
**Tasks Completed**: 0/6  
**Blockers**: None  
**Next Steps**: Deploy Vercel fixes

---

**Use this checklist to track progress and ensure nothing is missed!**
