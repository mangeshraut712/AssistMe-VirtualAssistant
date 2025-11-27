# AssistMe - Virtual Assistant

![AssistMe Logo](frontend/public/assets/logo.png)

**Your Intelligent Companion** - A comprehensive AI-powered virtual assistant with multilingual support, voice interaction, image generation, and more.

## 🌟 Features

- **💬 Chat Interface**: Intelligent conversational AI with multiple model support
- **🌐 Multilingual Support**: AI4Bharat integration for Indian languages
- **🎤 Advanced Voice Mode**: Full voice-to-voice interaction powered by **Gemini 2.0 Flash**
  - Speech-to-text with Whisper
  - Lightning-fast responses with Gemini 2.0 Flash (1.05M context)
  - Natural text-to-speech output
  - Streaming and synchronous modes
  - 17+ language support
- **🖼️ Image Generation**: Create images from text descriptions
- **📚 Grokipedia**: Deep search and knowledge base
- **✍️ Grammar Boost**: Grammarly/Quillbot-style text enhancement
- **⚡ Speedtest**: Network performance testing
- **🎨 Themes**: Light, Dark, and System themes
- **📊 Benchmarks**: AI model performance comparison

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- OpenRouter API Key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Install Backend Dependencies**
```bash
cd ../backend
pip install -r requirements.txt
```

4. **Set up Environment Variables**

Create a `.env` file in the root directory:
```env
OPENROUTER_API_KEY=your_api_key_here
DEV_MODE=false
```

5. **Run the Application**

**Frontend** (in one terminal):
```bash
cd frontend
npm run dev
```

**Backend** (in another terminal):
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8001
```

6. **Access the Application**

Open your browser and navigate to: `http://localhost:5173`

## 📦 Deployment

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel
```

3. **Set Environment Variables in Vercel Dashboard**
- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `DEV_MODE`: Set to `false`

### Manual Deployment

1. **Build Frontend**
```bash
cd frontend
npm run build
```

2. **Deploy Backend**
- Use any Python hosting service (Render, Railway, etc.)
- Set environment variables
- Point to `backend/app/main.py`

## 🛠️ Tech Stack

### Frontend
- **React** with Vite
- **TailwindCSS** for styling
- **Lucide Icons**
- **Recharts** for data visualization

### Backend
- **FastAPI** (Python)
- **OpenRouter** for AI models
- **Whisper** for speech-to-text
- **AI4Bharat** for multilingual support

## 📁 Project Structure

```
AssistMe-VirtualAssistant/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   └── assets/
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── providers/
│   │   └── main.py
│   └── requirements.txt
├── vercel.json
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

### Free Models
- **Google Gemini 2.0 Flash** ⭐ (Voice-optimized, 1.05M context)
- Meta Llama 3.3 70B
- NVIDIA Nemotron Nano 9B/12B
- Google Gemma 3 27B
- Meituan LongCat Flash

### Premium Models (Advanced Mode)
- OpenAI GPT-4o Mini
- Anthropic Claude 3 Haiku
- Google Gemini 2.5 Flash
- xAI Grok 4.1 Fast

## 🎤 Advanced Voice Mode

Experience full voice-to-voice interaction powered by **Gemini 2.0 Flash**.

**Features:**
- **Real-time Interaction**: Speak naturally and get instant responses.
- **Multilingual**: Supports 17+ languages.
- **Streaming Audio**: Low-latency audio streaming for a fluid conversation.

**How to Use:**
1. Click the **Mic** icon in the sidebar or "Voice Mode" card.
2. Grant microphone permissions if prompted.
3. Start speaking! The AI will listen and respond with voice.

**Technical Details:**
- **WebSocket Endpoint**: `/api/chat/voice`
- **Audio Format**: PCM 16-bit, 24kHz (Input/Output)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenRouter for AI model access
- AI4Bharat for multilingual support
- Recharts for data visualization
- Lucide for beautiful icons

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ by the AssistMe Team**
