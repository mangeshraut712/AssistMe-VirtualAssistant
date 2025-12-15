# 🎤 Gemini Voice Mode

**Premium Voice AI powered by Gemini 2.5 Flash Native Audio**

A production-ready, standalone voice conversation module featuring 30 HD voices with emotional intelligence, natural accents, and context-aware pacing across 24 languages.

## ✨ Features

- **30 Premium HD Voices** (Aoede, Charon, Fenrir, Kore, Puck, and more)
- **Emotional Intelligence** with affective dialogue
- **Natural Accents** and prosody
- **Context-Aware Pacing** for human-like conversations
- **24 Languages** supported
- **Real-time Audio Visualization** using Web Audio API
- **Haptic Feedback** for mobile devices
- **Session Analytics** (tokens, words, latency, duration)
- **Export Conversations** to JSON

## 🏗️ Architecture

```
voice-mode/
├── frontend/
│   ├── components/
│   │   └── VoiceMode.jsx          # Main voice interface
│   ├── hooks/
│   │   ├── useVoiceRecognition.js # Speech-to-text hook
│   │   ├── useGeminiTTS.js        # Gemini audio hook
│   │   └── useAudioVisualizer.js  # Web Audio API hook
│   └── utils/
│       ├── gemini-voices.js       # Voice configurations
│       └── audio-helpers.js       # Audio utilities
├── backend/
│   ├── services/
│   │   └── gemini-tts.service.js  # Gemini TTS integration
│   ├── routes/
│   │   └── voice.routes.js        # API endpoints
│   └── types/
│       └── voice.types.js         # TypeScript types
├── config/
│   └── voices.config.js           # Voice model configs
└── docs/
    ├── INTEGRATION.md             # How to integrate
    └── API.md                     # API documentation
```

## 🚀 Quick Integration

### 1. Backend Setup

```javascript
// backend/app/main.js
import { voiceRoutes } from './voice-mode/backend/routes/voice.routes.js';
app.use('/api/voice', voiceRoutes);
```

### 2. Frontend Setup

```javascript
// src/App.jsx
import VoiceMode from './voice-mode/frontend/components/VoiceMode.jsx';

function App() {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsVoiceOpen(true)}>Open Voice</button>
      <VoiceMode isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
    </>
  );
}
```

### 3. Environment Variables

```env
GOOGLE_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_key  # Optional fallback
```

## 🎨 Voice Profiles

| Voice   | Gender | Tone              | Best For                    |
|---------|--------|-------------------|-----------------------------|
| Aoede   | Female | Warm, Clear       | Professional, Friendly      |
| Charon  | Male   | Deep, Authoritative| Serious, Educational       |
| Fenrir  | Unisex | Dynamic, Expressive| Creative, Storytelling     |
| Kore    | Female | Smooth, Professional| Business, Presentations   |
| Puck    | Male   | Playful, Energetic | Casual, Fun                |

## 📋 Prerequisites

- **Node.js** >= 18.x
- **Google API Key** (for Gemini 2.5 Flash)
- **Modern Browser** with Web Audio API support
- **HTTPS** (required for microphone access in production)

## ⚙️ Configuration

```javascript
// voice-mode/config/voices.config.js
export const VOICE_CONFIG = {
  models: [
    'gemini-2.5-flash-native-audio-preview-12-2025',
    'google/gemini-2.5-flash',
    // ... fallbacks
  ],
  voices: {
    en: ['Aoede', 'Charon', 'Fenrir', 'Kore', 'Puck'],
    hi: ['Kore', 'Puck'],
    es: ['Aoede', 'Charon'],
    // ... 24 languages
  },
  defaultSpeed: 1.05,
  enableHaptics: true,
  enableAnalytics: true,
};
```

## 📊 API Endpoints

### POST `/api/voice/tts`
Generate speech from text using Gemini Native Audio

**Request:**
```json
{
  "text": "Hello, how can I help you today?",
  "language": "en-US",
  "voice": "Aoede",
  "speed": 1.05
}
```

**Response:**
```json
{
  "success": true,
  "audio": "base64_encoded_mp3",
  "format": "mp3",
  "provider": "gemini-native-audio",
  "voice": "Aoede",
  "language": "en-US"
}
```

### POST `/api/voice/chat`
Complete voice conversation cycle (STT + LLM + TTS)

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "What's the weather like?"}
  ],
  "model": "gemini-2.5-flash-native-audio-preview-12-2025",
  "language": "en-US",
  "voice": "Kore"
}
```

## 🎯 Use Cases

- **Virtual Assistants** with natural conversations
- **Customer Support** bots with empathy
- **Language Learning** apps with native accents
- **Accessibility** tools for visually impaired users
- **Voice-First Apps** (smart speakers, IoT devices)

## 🔒 Security

- Microphone access requires user permission
- HTTPS required in production
- API keys stored securely in environment variables
- No audio data persisted on server

## 📈 Performance

- **Latency**: ~800ms average (Gemini API)
- **Voice Quality**: 48kHz, 128kbps MP3
- **Real-time Processing**: 60fps audio visualization
- **Memory**: < 50MB during active session

## 🐛 Troubleshooting

**Microphone not working:**
- Ensure HTTPS (localhost exempt)
- Grant browser permissions
- Check browser compatibility

**Robotic voice:**
- Verify `GOOGLE_API_KEY` is set
- Check Gemini API quota
- Review backend logs for errors

**No audio output:**
- Verify speakers/headphones connected
- Check browser audio permissions
- Test with `/api/voice/tts` directly

## 📦 Dependencies

**Frontend:**
- `react` >= 18.x
- `framer-motion` >= 10.x
- `lucide-react` >= 0.263.x

**Backend:**
- `fastapi` >= 0.100.x (Python) or `express` >= 4.x (Node.js)
- `httpx` >= 0.24.x or `axios` >= 1.x

## 🤝 Contributing

This is a standalone module. To contribute:
1. Test changes in isolated environment
2. Update documentation
3. Ensure backward compatibility
4. Submit PR with clear description

## 📄 License

MIT License - Free to use in any project

## 🌟 Credits

Built with **Gemini 2.5 Flash Native Audio** by Google DeepMind
