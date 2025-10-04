document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const commandInput = document.getElementById('commandInput');
    const speakButton = document.getElementById('speakButton');
    const chatHistory = document.getElementById('chat-history');
    const voiceToggle = document.getElementById('voiceToggle');
    const stopVoiceBtn = document.getElementById('stopVoiceBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');

    // --- API Keys & Configuration ---
    const NEWS_API_KEY = '7c0f446a765249edab2c14df05956792'; // Replace with your key
    const NASA_API_KEY = 'AADXc64v1KehekFRHPZeqvR0mdD1DPwpSLUEsXhn'; // Replace with your key

    // --- Initial Check ---
    if (!commandInput || !speakButton || !chatHistory) {
        alert("CRITICAL ERROR: HTML elements are missing. Please ensure your index.HTML file is correct and you have done a hard refresh (Cmd+Shift+R).");
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    if (!recognition) {
        speakButton.disabled = true;
        addMessageToChat('AssistMe', "Error: Speech recognition is not supported by your browser.");
        return;
    }

    recognition.lang = 'en-US';
    recognition.interimResults = false;

    speakButton.addEventListener('click', () => {
        speakButton.classList.add('listening');
        recognition.start();
    });

    stopVoiceBtn.addEventListener('click', () => {
        speechSynthesis.cancel();
    });

    recognition.onend = () => speakButton.classList.remove('listening');
    recognition.onerror = (event) => addMessageToChat('AssistMe', `Speech Error: ${event.error}. Please check microphone permissions.`);
    recognition.onresult = (event) => handleCommand(event.results[0][0].transcript);

    commandInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && commandInput.value.trim()) {
            handleCommand(commandInput.value.trim());
        }
    });

    // Dark mode toggle
    const body = document.body;
    const savedMode = localStorage.getItem('theme');
    if (savedMode) {
        body.classList.add(savedMode);
        if (savedMode === 'dark') {
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark');
        const theme = body.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        darkModeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    function addMessageToChat(sender, text, isThinking = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        if (sender === 'user') {
            messageDiv.classList.add('user-message');
            messageDiv.textContent = text;
        } else {
            messageDiv.classList.add('assistant-message');
            if (isThinking) {
                messageDiv.classList.add('typing');
                messageDiv.id = 'thinking-bubble';
                messageDiv.innerHTML = '<span></span><span></span><span></span>';
            } else {
                messageDiv.textContent = text;
            }
        }
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return messageDiv;
    }

    function speakAndDisplay(text) {
        const thinkingBubble = document.getElementById('thinking-bubble');
        if (thinkingBubble) {
            thinkingBubble.textContent = text;
            thinkingBubble.classList.remove('typing');
            thinkingBubble.id = '';
        } else {
            addMessageToChat('AssistMe', text);
        }
        if (voiceToggle.checked) {
            try {
                speechSynthesis.cancel(); // Cancel any previous speaking
                const utterance = new SpeechSynthesisUtterance(text);
                speechSynthesis.speak(utterance);
            } catch (error) {
                console.error("Speech synthesis error:", error);
                addMessageToChat('AssistMe', 'Error: Could not play audio response.');
            }
        }
    }

    async function handleCommand(command) {
        addMessageToChat('user', command);
        commandInput.value = '';
        await processCommand(command.toLowerCase().trim());
    }

    async function getImprovedAnswer(query) {
        addMessageToChat('AssistMe', 'Thinking...', true);

        // 1. Try to solve as a math problem first
        try {
            // Use math.js if the query looks like a calculation
            if (/[0-9]/.test(query) && /[+\-*/.^]/.test(query)) {
                const expression = query.replace(/^(what is|calculate|compute)\s*/i, '').replace(/[=?]$/, '').trim();
                if (typeof math !== 'undefined') {
                    const result = math.evaluate(expression);
                    speakAndDisplay(`The answer is ${result}.`);
                    return;
                }
            }
        } catch (error) {
            // Not a valid math expression, proceed to other APIs.
            console.log("Math evaluation failed, trying APIs.");
        }

        // 2. Use a generic knowledge API for other questions
        const searchQuery = query.replace(/[.?!\s]+$/, '');
        const duckduckgoUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&t=AssistMe`;

        try {
            const response = await fetch(duckduckgoUrl);
            const data = await response.json();

            // Prioritize Answer, then AbstractText, then Definition
            let answer = data.Answer || data.AbstractText || data.Definition;

            if (answer) {
                // Clean up DuckDuckGo's source links if they exist
                answer = answer.replace(/<a href=.*?>.*?<\/a>/g, '').trim();
                speakAndDisplay(answer);
                return;
            }

            // 3. Fallback to Wikipedia if DuckDuckGo fails
            const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchQuery)}`;
            const wikiResponse = await fetch(wikiUrl);
            const wikiData = await wikiResponse.json();

            if (wikiData.extract && !wikiData.type.includes('disambiguation')) {
                // Return the first one or two sentences for a concise summary
                const sentences = wikiData.extract.split('. ');
                const shortSummary = sentences[0] + (sentences[1] ? '. ' + sentences[1] : '') + '.';
                speakAndDisplay(shortSummary);
                return;
            }

            // 4. If all APIs fail, give a generic response
            throw new Error('No answer found from any API.');

        } catch (error) {
            console.error("API fetch error:", error);
            speakAndDisplay(`Sorry, I couldn't find information for "${query}". Please try rephrasing.`);
        }
    }

    async function getWeather(city) {
        addMessageToChat('AssistMe', 'Fetching weather data...', true);
        try {
            // Simulating weather with random data since no API key
            const temperatures = [15, 20, 25, 30, 35];
            const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Foggy', 'Windy'];
            const temp = temperatures[Math.floor(Math.random() * temperatures.length)];
            const condition = conditions[Math.floor(Math.random() * conditions.length)];
            speakAndDisplay(`The weather in ${city} is ${temp} degrees Celsius and ${condition}.`);
        } catch (error) {
            speakAndDisplay(`Sorry, I couldn't fetch the weather data: ${error.message}.`);
        }
    }

    async function getJoke() {
        addMessageToChat('AssistMe', 'Thinking of a joke...', true);
        try {
            const response = await fetch('https://official-joke-api.appspot.com/random_joke');
            if (!response.ok) throw new Error(`Network error (status: ${response.status})`);
            const joke = await response.json();
            speakAndDisplay(`${joke.setup} ${joke.punchline}`);
        } catch (error) {
            speakAndDisplay(`Sorry, I couldn't fetch a joke: ${error.message}.`);
        }
    }

    async function getNews() {
        addMessageToChat('AssistMe', 'Fetching latest news...', true);
        try {
            const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWS_API_KEY}`);
            if (!response.ok) throw new Error(`Network error (status: ${response.status})`);
            const data = await response.json();
            if (data.articles && data.articles.length > 0) {
                let newsSummary = 'Here are some top headlines:\n';
                for (let i = 0; i < Math.min(5, data.articles.length); i++) {
                    const article = data.articles[i];
                    newsSummary += `- ${article.title} (Source: ${article.source.name})\n`;
                }
                speakAndDisplay(newsSummary.trim());
            } else {
                speakAndDisplay('No news articles found.');
            }
        } catch (error) {
            speakAndDisplay(`Sorry, I couldn't fetch the news: ${error.message}.`);
        }
    }

    async function getNASAAPOD() {
        addMessageToChat('AssistMe', 'Fetching NASA\'s Astronomy Picture of the Day...', true);
        try {
            const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`);
            if (!response.ok) throw new Error(`Network error (status: ${response.status})`);
            const data = await response.json();
            speakAndDisplay(`NASA Astronomy Picture of the Day: ${data.title}. Explanation: ${data.explanation}`);
        } catch (error) {
            speakAndDisplay(`Sorry, I couldn't fetch NASA's APOD: ${error.message}.`);
        }
    }

    async function getReddit(subreddit) {
        addMessageToChat('AssistMe', `Fetching top posts from r/${subreddit}...`, true);
        try {
            const response = await fetch(`https://www.reddit.com/r/${encodeURIComponent(subreddit)}/.json?limit=5`);
            if (!response.ok) throw new Error(`Network error (status: ${response.status})`);
            const data = await response.json();
            if (data.data && data.data.children.length > 0) {
                let postsSummary = `Top 5 posts from r/${subreddit}:\n`;
                data.data.children.forEach((post, i) => {
                    postsSummary += `${i+1}. ${post.data.title} (Score: ${post.data.score})\n`;
                });
                speakAndDisplay(postsSummary.trim());
            } else {
                speakAndDisplay(`r/${subreddit} not found or no posts available.`);
            }
        } catch (error) {
            speakAndDisplay(`Sorry, I couldn't fetch Reddit posts: ${error.message}.`);
        }
    }

    function openWebsite(url, name) {
        try {
            window.open(url, '_blank');
            speakAndDisplay(`Opening ${name}.`);
        } catch (error) {
            speakAndDisplay(`Sorry, I couldn't open ${name}.`);
        }
    }

    async function searchGoogle(query) {
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        try {
            window.open(url, '_blank');
            speakAndDisplay(`Searching Google for ${query}.`);
        } catch (error) {
            speakAndDisplay(`Sorry, I couldn't perform the search.`);
        }
    }

    // --- Command Processing ---
    const commands = [
        {
            keywords: ['hello', 'hi'],
            handler: () => speakAndDisplay("Hello! How can I help you today?")
        },
        {
            keywords: ['who are you', 'what are you'],
            handler: () => speakAndDisplay("I am AssistMe, your web-based virtual assistant.")
        },
        {
            keywords: ['time'],
            handler: () => {
                const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
                speakAndDisplay(`The current time is ${time}.`);
            }
        },
        {
            keywords: ['date', 'day'],
            handler: () => {
                const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                speakAndDisplay(`Today is ${date}.`);
            }
        },
        {
            keywords: ['weather'],
            handler: async (command) => {
                const cityMatch = command.match(/weather in (\w+)/i);
                await getWeather(cityMatch ? cityMatch[1] : 'your location');
            }
        },
        {
            keywords: ['joke'],
            handler: getJoke
        },
        {
            keywords: ['news', 'headline'],
            handler: getNews
        },
        {
            keywords: ['nasa', 'apod', 'astronomy'],
            handler: getNASAAPOD
        },
        {
            regex: /^open google(.*)/i,
            handler: async (command, matches) => {
                const query = matches[1].trim();
                query ? await searchGoogle(query) : openWebsite('https://www.google.com', 'Google');
            }
        },
        {
            regex: /^open youtube/i,
            handler: () => openWebsite('https://www.youtube.com', 'YouTube')
        },
        {
            regex: /^reddit (.*)/i,
            handler: async (command, matches) => {
                const subreddit = matches[1].trim();
                if (subreddit) await getReddit(subreddit);
            }
        }
    ];

    async function processCommand(command) {
        for (const cmd of commands) {
            if (cmd.keywords && cmd.keywords.some(k => command.includes(k))) {
                await cmd.handler(command);
                return;
            }
            if (cmd.regex) {
                const matches = command.match(cmd.regex);
                if (matches) {
                    await cmd.handler(command, matches);
                    return;
                }
            }
        }
        // Fallback for any command that doesn't match
        await getImprovedAnswer(command);
    }

    addMessageToChat('AssistMe', 'Hello! How can I help you?');
});
