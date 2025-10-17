# AssistMe Virtual Assistant

**🌐 Live Demo:** [https://assist-me-virtual-assistant.vercel.app/](https://assist-me-virtual-assistant.vercel.app/)

AssistMe is an advanced web-based AI assistant featuring OpenRouter integration with multiple large language models. It offers intelligent conversation, voice commands, model testing/ranking, and a sleek Apple Intelligence-inspired interface.

## 🚀 Key Features
- **Multi-Model AI**: 339+ OpenRouter models available, with 6+ optimized free models
- **Live Model Testing**: Test and rank models with benchmarks on factual, creative, and analytical tasks
- **Voice Interface**: Dual-mode mic button (send/voice toggle) with colorful listening states
- **Smart UI**: Centered logo, streamlined controls, dark/light themes
- **Advanced Chat**: Math solving, news, NASA astronomy, Reddit integration, and general AI conversations
- **Privacy-First**: All API calls secured, keys protected in server environment

## Features
- **Voice Command Support** (Web Speech API for speech-to-text and text-to-speech)
- **Real-Time Information** (Current time, date, and formatted responses)
- **Weather Information** (Simulated for demonstration; can be upgraded to real APIs)
- **Entertainment** (Random jokes from free APIs)
- **Web Integration** (Opens Google, YouTube, and performs Google searches)
- **Intelligent Q&A** (Answers general knowledge questions using multiple free sources)
- **News Headlines** (Latest headlines from NewsAPI)
- **NASA Astronomy Picture** (Daily astronomy picture and explanation from NASA API)
- **Reddit Integration** (Fetch top posts from subreddits)
- **Mathematics** (Advanced arithmetic and calculations using MathJS library)
- **Dark Mode Toggle** (Persistent theme preference with localStorage)
- **Responsive Design** (Mobile-friendly interface)
- **No Dependencies** (Pure HTML/CSS/JS, APIs with built-in keys)

## Prerequisites
- Modern web browser with Web Speech API support (Chrome, Safari, Firefox)
- Internet connection for API calls (optional for offline features)
- For full voice features: Serve files via HTTP (localhost) due to browser security policies

## 🚀 Quick Start

### Option 1: Vercel Deployment (Recommended)
1. Import to Vercel from GitHub repo
2. Add `OPENROUTER_API_KEY` in Vercel Environment Variables
3. Deploy - app runs at `https://your-app.vercel.app`
4. Features working: AI chat (any model), voice, testing, all secure

### Option 2: Local Development
1. **Clone repo**: `git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git`
2. **Set up API key**: `export OPENROUTER_API_KEY=your_key_here`
3. **Run server**: `npm install && node server.js`
4. **Open app**: `http://localhost:8000`
5. **Note**: Set the API key for full AI features. Without it, basic commands work but AI responses will fail.

## Command Examples
- Basic Replies: "hello", "hi", "who are you", "what are you"
- Time/Date: "time", "what time is it?", "date", "what date is today?", "which day is today?"
- Information: "weather in [city]", "tell me a joke", "open youtube", "open google [query]"
- News & Space: "news", "nasa apod", "astronomy picture", "reddit AskReddit"
- Calculations: "what is 5 + 5?", "2 * (3 + 4)", "sqrt(16)"
- General Knowledge: "who is [person]?", "what is [topic]?", "when was [event]?", etc.
- Any general question not covered above will be answered using online knowledge bases.

## 📂 Project Structure
- **index.HTML**: Main interface with centered logo, chat layout, and controls
- **style.css**: Apple Intelligence-inspired CSS with colorful icons and themes
- **script.js**: Frontend logic for chat, voice dual-mode, commands, and API calls
- **api/testmodels.js**: Backend endpoint for testing and ranking AI models
- **server.js**: Express server for local development and API routing
- **.gitignore**: Excludes node_modules, Vercel files, and sensitive env vars

## 🎯 How It Works
1. **Model Selection**: Choose from pre-tested free models or test all models live
2. **Smart Responses**: Commands get instant replies, questions use selected AI model
3. **Voice Toggle**: Double-click mic to switch between send mode (paper-plane) and voice mode (microphone)
4. **Testing**: "Test Models" button runs performance benchmarks and updates rankings
5. **Security**: API keys protected in environment, no client-side exposure

## 🤖 Model Testing
- Tests 6+ models on factual accuracy, creative writing, and reasoning
- Ranks models: Llama 4 Scout, Llama 3.1 variants, Mistral, HuggingFace, Microsoft (free priority)
- Benchmarks: Capital cities, math problems, poems, quantum computing, Nobel prizes
- Returns scored rankings: higher scores = better performance

## Supported Commands and Responses
The app recognizes various phrasings of commands and provides accurate responses. For general questions, it leverages free APIs to ensure up-to-date and correct information.

## Browser Compatibility
- Tested on: Chrome (desktop/mobile), Safari, Firefox
- Requires modern browser for Web Speech API
- Mobile browsers may have limitations on speech features

## Contributing
This is an educational project. Feel free to enhance it by adding more features, improving AI responses, or integrating additional APIs. Pull requests are welcome!

## License
This project is open-source and available under the MIT License. No paid dependencies required.
