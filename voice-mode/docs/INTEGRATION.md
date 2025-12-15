# Integration Guide - Gemini Voice Mode

## 📦 Package Contents

This standalone voice mode module includes:
- Frontend React components (NO browser TTS)
- Backend Gemini Native Audio service
- Configuration files
- Audio utilities

## 🚀 Quick Start

### Step 1: Copy Voice Mode Directory

```bash
# Copy the entire voice-mode/ folder to your project
cp -r voice-mode/ /path/to/your/project/
```

### Step 2: Install Dependencies

**Frontend:**
```bash
npm install react framer-motion lucide-react
```

**Backend (Python/FastAPI):**
```bash
pip install httpx fastapi
```

### Step 3: Set Environment Variable

```env
# .env file
GOOGLE_API_KEY=your_gemini_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

### Step 4: Integrate Backend Route

**For FastAPI (Python):**

```python
# backend/app/main.py
from fastapi import FastAPI
from voice_mode.backend.routes.voice_routes import router as voice_router

app = FastAPI()
app.include_router(voice_router, prefix="/api/voice", tags=["voice"])
```

Create `voice_mode/backend/routes/voice_routes.py`:

```python
from fastapi import APIRouter
from pydantic import BaseModel
from ..services.gemini_tts_service import gemini_tts_service

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    language: str = "en-US"
    voice: str = None
    speed: float = 1.05
    enable_emotions: bool = True

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    try:
        result = await gemini_tts_service.synthesize(
            text=request.text,
            language=request.language,
            voice=request.voice,
            speed=request.speed,
            enable_emotions=request.enable_emotions
        )
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### Step 5: Integrate Frontend Component

```javascript
// src/App.jsx
import React, { useState } from 'react';
import VoiceMode from './voice-mode/frontend/components/VoiceMode';

function App() {
  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setVoiceOpen(true)}>
        🎤 Open Voice Mode
      </button>
      
      <VoiceMode 
        isOpen={voiceOpen} 
        onClose={() => setVoiceOpen(false)}
        apiEndpoint="/api/voice/tts"
      />
    </div>
  );
}

export default App;
```

## ⚙️ Configuration

### Customize Voices

Edit `voice-mode/config/voices.config.py`:

```python
GEMINI_VOICES = {
    "en": {
        "voices": ["Aoede", "Charon", "Fenrir"],  # Your preferred voices
        "default": "Aoede"
    },
    # ... other languages
}
```

### Customize Models

Edit `voice-mode/config/voice.config.js`:

```javascript
export const VOICE_MODELS = [
    { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Primary' },
    // Add your fallback models
];
```

## 🎨 UI Customization

The component uses Tailwind CSS and Framer Motion. Customize via:

1. **Theme Support**: Automatically adapts to light/dark mode
2. **Colors**: Uses `bg-black/bg-white` - modify in component
3. **Animations**: Edit `framer-motion` variants in VoiceMode.jsx

## 🔒 Security Checklist

- ✅ HTTPS required for microphone access (localhost exempt)
- ✅ Store `GOOGLE_API_KEY` in environment variables
- ✅ Never expose API keys in frontend code
- ✅ Validate user input on backend
- ✅ Implement rate limiting if needed

## 🐛 Troubleshooting

### "Speech recognition not supported"
- Use Chrome, Edge, or Safari
- Ensure HTTPS (or localhost)

### "TTS API failed"
- Check `GOOGLE_API_KEY` is set correctly
- Verify Gemini API quota
- Check backend logs for detailed errors

### "No audio in response"
- Ensure backend route is correct (`/api/voice/tts`)
- Check network tab for API response
- Verify audio playback permissions

### Robotic Voice (Should Never Happen)
- This package does NOT fallback to browser TTS
- If you hear robotic voice, there's an integration error
- Check that you're using the NEW service, not old one

## 📊 API Response Format

**TTS Success:**
```json
{
  "success": true,
  "audio": "base64_encoded_mp3",
  "format": "mp3",
  "provider": "gemini-native-audio",
  "voice": "Aoede",
  "language": "en-US",
  "voice_profile": {
    "gender": "Female",
    "tone": "Warm, Clear",
    ...
  }
}
```

**TTS Error:**
```json
{
  "success": false,
  "error": "GOOGLE_API_KEY not configured"
}
```

## 🎯 Production Deployment

### Vercel (Frontend)
```bash
# No special config needed for frontend
vercel deploy
```

### Railway/Render (Backend)
```bash
# Add environment variable
GOOGLE_API_KEY=your_key

# Backend will auto-start
```

### Environment Variables
```env
# Required
GOOGLE_API_KEY=your_gemini_key

# Optional
OPENROUTER_API_KEY=your_openrouter_key  # For fallback models
```

## 📈 Performance Optimization

**Frontend:**
- Audio visualizer runs at 60fps
- Lazy load voice component
- Cancel pending requests on unmount

**Backend:**
- Gemini API typically responds in ~800ms
- Consider caching common responses
- Implement request queuing for high traffic

## 🤝 Migration from Old Voice Mode

If upgrading from browser TTS:

1. **Remove old imports**:
```javascript
// ❌ Delete this
import OldVoiceMode from './components/OldVoiceMode';
```

2. **Replace with new**:
```javascript
// ✅ Use this
import VoiceMode from './voice-mode/frontend/components/VoiceMode';
```

3. **Update backend TTS service**:
```python
# Replace old tts_service.py with new gemini_tts_service.py
```

4. **Remove browser TTS code**:
- Search project for `SpeechSynthesis`
- Remove all browser TTS fallbacks
- Use Gemini exclusively

## 📚 Additional Resources

- [Gemini API Docs](https://ai.google.dev/docs)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Speech Recognition API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)

## ✅ Verification Checklist

After integration, verify:

- [ ] Voice Mode opens/closes correctly
- [ ] Microphone permission requested
- [ ] Speech recognition working
- [ ] Gemini API responds (check network tab)
- [ ] Audio plays with natural voice (NOT robotic)
- [ ] Session analytics display correctly
- [ ] Export conversation works
- [ ] No browser TTS fallback triggers
- [ ] Dark/light mode themes work
- [ ] Mobile haptics work (on supported devices)

## 🆘 Support

For issues:
1. Check backend logs for Gemini API errors
2. Verify `GOOGLE_API_KEY` is valid
3. Test `/api/voice/tts` endpoint directly with curl
4. Review browser console for frontend errors

---

**Made with ❤️ using Gemini 2.5 Flash Native Audio**
