# AssistMe-Virtual-Assistant
AssistMe is a web-based virtual assistant developed using HTML, CSS, and JavaScript. It provides a range of features including voice commands, current time and date display, simulated weather updates, random jokes, website opening, and comprehensive question answering for general knowledge. The app uses free APIs (Wikipedia, DuckDuckGo, Official Joke API) for accurate information without requiring API keys. It's designed for ease of use, with an Apple-inspired UI, dark mode support, and full voice input/output capabilities.

The project demonstrates advanced front-end skills including asynchronous programming with fetch API, DOM manipulation, speech recognition and synthesis, local storage for preferences, and graceful error handling. It's fully self-contained and runs in any modern web browser.

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

## Installation and Usage
1. **Download the Files**: Ensure you have `index.HTML`, `style.css`, and `script.js` in the same directory.
2. **Run the Application**:
   - **Option 1 (Recommended for full features)**: Serve via local HTTP server to enable speech features.
     - Using Python: Run `python3 -m http.server 8000` (or `python -m http.server` if using Python 2)
     - Open `http://localhost:8000/index.HTML` in your browser.
   - **Option 2 (Basic features only)**: Open `index.HTML` directly in browser (speech features may not work).
3. **Interact with AssistMe**:
   - Type commands in the input field or use the microphone button for voice input.
   - Toggle voice output with the "Voice" checkbox.
   - Use the dark mode button (moon/sun icon) to switch themes.

## Command Examples
- Basic Replies: "hello", "hi", "who are you", "what are you"
- Time/Date: "time", "what time is it?", "date", "what date is today?", "which day is today?"
- Information: "weather in [city]", "tell me a joke", "open youtube", "open google [query]"
- News & Space: "news", "nasa apod", "astronomy picture", "reddit AskReddit"
- Calculations: "what is 5 + 5?", "2 * (3 + 4)", "sqrt(16)"
- General Knowledge: "who is [person]?", "what is [topic]?", "when was [event]?", etc.
- Any general question not covered above will be answered using online knowledge bases.

## Architecture
- **index.HTML**: Main interface with chat layout and form elements
- **style.css**: Apple-inspired CSS with CSS variables for light/dark themes
- **script.js**: Main logic including command parsing, API integration, and speech handling
  - Supports exact string matches and keyword includes for command recognition
  - Prioritizes hardcoded answers for accuracy on common queries
  - Falls back to Wikipedia/DuckDuckGo APIs for unknown questions
  - Uses SpeechRecognition for voice input and SpeechSynthesis for output

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
