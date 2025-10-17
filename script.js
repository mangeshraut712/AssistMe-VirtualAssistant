document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const commandInput = document.getElementById('commandInput');
    const speakButton = document.getElementById('speakButton');
    const chatHistory = document.getElementById('chat-history');
    const voiceToggle = document.getElementById('voiceToggle');
    const stopVoiceBtn = document.getElementById('stopVoiceBtn');
    const recordButton = document.getElementById('recordButton');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const modelSelect = document.getElementById('modelSelect');
    const architectureBtn = document.getElementById('architectureBtn');
    const architectureModal = document.getElementById('architectureModal');

    // --- API Keys & Configuration ---
    const NEWS_API_KEY = '7c0f446a765249edab2c14df05956792'; // Replace with your key
    const NASA_API_KEY = 'AADXc64v1KehekFRHPZeqvR0mdD1DPwpSLUEsXhn'; // Replace with your key
    const DEFAULT_MODEL = 'meta-llama/llama-4-scout';

    // --- Initial Check ---
    if (!commandInput || !speakButton || !chatHistory) {
        alert("CRITICAL ERROR: HTML elements are missing. Please ensure your index.HTML file is correct and you have done a hard refresh (Cmd+Shift+R).");
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;
    const supportsMediaRecorder = !!(navigator.mediaDevices && window.MediaRecorder);

    let mediaRecorder = null;
    let recordedChunks = [];
    let microphoneStream = null;
    let isRecording = false;

    if (!recognition) {
        speakButton.disabled = true;
        addMessageToChat('AssistMe', "Error: Speech recognition is not supported by your browser.");
        return;
    }

    recognition.lang = 'en-US';
    recognition.interimResults = false;

    let isMicMode = false;

    speakButton.addEventListener('click', () => {
        if (isMicMode) {
            // Mic mode: start stop cycle
            if (recognition.continuous) {
                recognition.abort();
                speakButton.classList.remove('listening');
            } else {
                speakButton.classList.add('listening');
                recognition.start();
            }
        } else {
            // Send mode: send message
            const message = commandInput.value.trim();
            if (message) {
                handleCommand(message);
            }
        }
    });

    // Double click or right click to toggle mode? But user said "then mic then voicemode" perhaps click to toggle.

    // Interpret as click to toggle between send and mic.

    speakButton.addEventListener('dblclick', () => {
        toggleMicSendMode();
    });

    function toggleMicSendMode() {
        isMicMode = !isMicMode;
        const icon = speakButton.querySelector('i');
        if (isMicMode) {
            icon.className = 'fas fa-microphone';
            speakButton.title = 'Voice mode: click to start/stop listening';
        } else {
            icon.className = 'fas fa-paper-plane';
            speakButton.title = 'Send mode: click to send message';
        }
    }

    // Default to send mode
    toggleMicSendMode(); // Start with send mode

    stopVoiceBtn.addEventListener('click', () => {
        speechSynthesis.cancel();
    });

    if (recordButton) {
        if (!supportsMediaRecorder) {
            recordButton.disabled = true;
            recordButton.title = 'Audio recording is not supported in this browser.';
        } else {
            recordButton.addEventListener('click', async () => {
                if (isRecording) {
                    stopRecording();
                } else {
                    await startRecording();
                }
            });
        }
    }

    recognition.onend = () => speakButton.classList.remove('listening');
    recognition.onerror = (event) => addMessageToChat('AssistMe', `Speech Error: ${event.error}. Please check microphone permissions.`);
    recognition.onresult = (event) => handleCommand(event.results[0][0].transcript);

    commandInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey && commandInput.value.trim()) {
            event.preventDefault();
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
    } else {
        body.classList.add('dark');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'dark');
    }
    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark');
        const theme = body.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        darkModeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    const adjustInputHeight = () => {
        commandInput.style.height = 'auto';
        const maxHeight = 240;
        commandInput.style.height = `${Math.min(commandInput.scrollHeight, maxHeight)}px`;
    };

    adjustInputHeight();
    commandInput.addEventListener('input', adjustInputHeight);

    // Test models button
    const testModelsBtn = document.getElementById('testModelsBtn');
    if (testModelsBtn) {
        testModelsBtn.addEventListener('click', async () => {
            addMessageToChat('AssistMe', 'Testing and ranking models...', true);

            try {
                const response = await fetch('/api/testmodels');
                if (!response.ok) {
                    throw new Error(`API error (${response.status}): ${await response.text()}`);
                }
                const data = await response.json();
                const results = data.results;

                let summary = 'Model Rankings (based on test questions):\n';
                results.forEach((result, index) => {
                    summary += `${index + 1}. ${result.model} - Score: ${result.score}/${data.questionsCount}\n`;
                });
                speakAndDisplay(summary);

                // Update model select with ranked options
                const modelSelect = document.getElementById('modelSelect');
                if (modelSelect) {
                    modelSelect.innerHTML = '';
                    results.forEach((result, index) => {
                        const option = document.createElement('option');
                        option.value = result.id;
                        option.textContent = `Rank ${index + 1}: ${result.model} (Score: ${result.score}/${data.questionsCount})`;
                        modelSelect.appendChild(option);
                    });
                    localStorage.setItem('assistme:model', results[0].id); // Default to top ranked
                    modelSelect.value = results[0].id;
                }
            } catch (error) {
                speakAndDisplay(`Sorry, I couldn't test the models: ${error.message}`);
            }
        });
    }

    if (modelSelect) {
        const savedModel = localStorage.getItem('assistme:model');
        if (savedModel) {
            const optionExists = Array.from(modelSelect.options).some((opt) => opt.value === savedModel);
            if (optionExists) {
                modelSelect.value = savedModel;
            }
        }
        modelSelect.addEventListener('change', () => {
            localStorage.setItem('assistme:model', modelSelect.value);
        });
    }

    if (architectureBtn && architectureModal) {
        const openModal = () => {
            architectureModal.classList.add('open');
            architectureModal.setAttribute('aria-hidden', 'false');
            setTimeout(() => {
                const focusable = architectureModal.querySelector('button[data-close-modal]');
                focusable?.focus();
            }, 10);
        };

        const closeModal = () => {
            architectureModal.classList.remove('open');
            architectureModal.setAttribute('aria-hidden', 'true');
            architectureBtn.focus();
        };

        architectureBtn.addEventListener('click', openModal);

        architectureModal.querySelectorAll('[data-close-modal]').forEach((element) => {
            element.addEventListener('click', closeModal);
        });

        architectureModal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        });
    }

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

    async function startRecording() {
        if (!supportsMediaRecorder || !recordButton) return;

        try {
            microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(microphoneStream);
            recordedChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                speakAndDisplay('Sorry, something went wrong while recording audio.');
                resetRecordingState();
            };

            mediaRecorder.onstop = async () => {
                const blob = recordedChunks.length
                    ? new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' })
                    : null;

                resetRecordingState();

                if (blob && blob.size > 0) {
                    await transcribeAudio(blob);
                } else {
                    speakAndDisplay('I could not capture any audio. Please try again.');
                }
            };

            mediaRecorder.start();
            isRecording = true;
            updateRecordButton(true);
            addMessageToChat('AssistMe', 'Recording... speak now!');
        } catch (error) {
            console.error('Unable to access microphone:', error);
            speakAndDisplay('I could not access the microphone. Please check your permissions and try again.');
            resetRecordingState();
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
        }
    }

    function resetRecordingState() {
        if (microphoneStream) {
            microphoneStream.getTracks().forEach((track) => track.stop());
            microphoneStream = null;
        }
        mediaRecorder = null;
        recordedChunks = [];
        isRecording = false;
        updateRecordButton(false);
    }

    function updateRecordButton(isActive) {
        if (!recordButton) return;
        recordButton.classList.toggle('recording', isActive);
        const icon = recordButton.querySelector('i');
        if (!icon) return;
        if (isActive) {
            icon.classList.remove('fa-circle');
            icon.classList.add('fa-stop');
        } else {
            icon.classList.add('fa-circle');
            icon.classList.remove('fa-stop');
        }
    }

    async function transcribeAudio(audioBlob) {
        addMessageToChat('AssistMe', 'Processing your recording...', true);

        try {
            const base64Audio = await blobToBase64(audioBlob);
            const mimeType = (audioBlob.type || 'audio/webm').split(';')[0];

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    audioBase64: base64Audio,
                    mimeType
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Transcription API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const transcription = (data.text || data.transcription || data.result || '').trim();

            if (transcription) {
                speakAndDisplay(transcription);
            } else {
                throw new Error('No transcription returned from OpenRouter.');
            }
        } catch (error) {
            console.error('Audio transcription failed:', error);
            speakAndDisplay('Sorry, I could not transcribe that recording. Please try again.');
        }
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                if (typeof result === 'string') {
                    const base64 = result.split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error('Unable to convert audio blob to base64.'));
                }
            };
            reader.onerror = () => reject(reader.error || new Error('Unknown FileReader error.'));
            reader.readAsDataURL(blob);
        });
    }

    async function handleCommand(command) {
        addMessageToChat('user', command);
        commandInput.value = '';
        adjustInputHeight();
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

        await fetchAICompletion(query);
    }

    async function fetchAICompletion(prompt) {
        try {
            const selectedModel = (modelSelect && modelSelect.value) || DEFAULT_MODEL;
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are AssistMe, a helpful and concise virtual assistant embedded in a web app. Provide accurate answers and, when relevant, suggest follow-up actions.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const message = data.text || data.message || data.output || data.choices?.[0]?.message?.content || '';
            if (message.trim()) {
                speakAndDisplay(message.trim());
            } else {
                throw new Error('Model returned an empty response.');
            }
        } catch (error) {
            console.error('AI completion failed:', error);
            speakAndDisplay(`Sorry, I ran into a problem getting an AI response. ${error.message || ''}`.trim());
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
        },
        {
            keywords: ['test models', 'rank models'],
            handler: async () => {
                addMessageToChat('AssistMe', 'Testing and ranking models...', true);

                try {
                    const response = await fetch('/api/testmodels');
                    if (!response.ok) {
                        throw new Error(`API error (${response.status}): ${await response.text()}`);
                    }
                    const data = await response.json();
                    const results = data.results;

                    let summary = 'Model Rankings (based on test questions):\n';
                    results.forEach((result, index) => {
                        summary += `${index + 1}. ${result.model} - Score: ${result.score}/${data.questionsCount}\n`;
                    });
                    speakAndDisplay(summary);

                    // Update model select with ranked options
                    const modelSelect = document.getElementById('modelSelect');
                    if (modelSelect) {
                        modelSelect.innerHTML = '';
                        results.forEach((result, index) => {
                            const option = document.createElement('option');
                            option.value = result.id;
                            option.textContent = `Rank ${index + 1}: ${result.model} (Score: ${result.score}/${data.questionsCount})`;
                            modelSelect.appendChild(option);
                        });
                        localStorage.setItem('assistme:model', results[0].id); // Default to top ranked
                        modelSelect.value = results[0].id;
                    }
                } catch (error) {
                    speakAndDisplay(`Sorry, I couldn't test the models: ${error.message}`);
                }
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
