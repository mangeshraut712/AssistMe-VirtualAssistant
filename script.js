document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const elements = {
        // UI Containers
        welcomeMessage: document.getElementById('welcomeMessage'),
        chatMessages: document.getElementById('chatMessages'),

        // Header Elements
        modelSelector: document.querySelector('.model-selector'),
        modelButton: document.getElementById('modelButton'),
        modelDropdown: document.getElementById('modelDropdown'),
        testModelsBtn: document.getElementById('testModelsBtn'),
        darkModeToggle: document.getElementById('darkModeToggle'),

        // Input Elements
        messageInput: document.getElementById('messageInput'),
        voiceButton: document.getElementById('voiceButton'),
        sendButton: document.getElementById('sendButton'),
    };

    // --- API Keys & Configuration ---
    const NEWS_API_KEY = '7c0f446a765249edab2c14df05956792';
    const NASA_API_KEY = 'AADXc64v1KehekFRHPZeqvR0mdD1DPwpSLUEsXhn';
    const DEFAULT_MODEL = 'meta-llama/llama-4-scout';

    let currentModel = DEFAULT_MODEL;
    let isRecording = false;
    let isTypingIndicator = null;
    let lastInputWasVoice = false;

    // --- Initialization ---
    initializeApp();

    function initializeApp() {
        setupEventListeners();
        setupModelSelector();
        loadStoredPreferences();
        updateTheme();

        // Check for saved conversation or show welcome
        const hasMessages = elements.chatMessages.children.length > 0;
        if (hasMessages) {
            showChat();
        } else {
            showWelcome();
        }
    }

    function setupEventListeners() {
        // Message Input Events
        elements.messageInput.addEventListener('input', handleMessageInput);
        elements.messageInput.addEventListener('keydown', handleMessageKeydown);
        elements.sendButton.addEventListener('click', handleSendMessage);
        elements.voiceButton.addEventListener('click', handleVoiceToggle);

        // Suggestion Events
        document.querySelectorAll('.suggestion-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const prompt = e.currentTarget.dataset.prompt;
                if (prompt) {
                    handleSuggestionClick(prompt);
                }
            });
        });

        // Dark Mode Toggle
        elements.darkModeToggle.addEventListener('click', toggleTheme);

        // Test Models Button
        elements.testModelsBtn.addEventListener('click', testModels);
    }

    function setupModelSelector() {
        console.log('modelSelector element:', document.getElementById('modelSelector'));
        console.log('modelButton element:', document.getElementById('modelButton'));

        // Model button click
        elements.modelButton.addEventListener('click', (e) => {
            console.log('Model button clicked');
            e.stopPropagation();
            elements.modelSelector?.classList.toggle('open');
            console.log('modelSelector open class:', elements.modelSelector?.classList.contains('open'));
        });

        // Model option clicks
        elements.modelDropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.model-option');
            if (option && option.dataset.model) {
                selectModel(option.dataset.model, option.textContent.trim());
                elements.modelSelector.classList.remove('open');
            }
        });

        // Close dropdown when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!elements.modelSelector?.contains(e.target)) {
                elements.modelSelector?.classList.remove('open');
            }
        });

        // Mark active model
        updateModelDisplay();
    }

    function loadStoredPreferences() {
        const savedModel = localStorage.getItem('assistme:model');
        const savedTheme = localStorage.getItem('assistme:theme');

        if (savedModel) {
            currentModel = savedModel;
        }

        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        updateModelDisplay();
        updateThemeUI();
    }

    // --- Model Management ---
    function selectModel(modelId, modelName) {
        currentModel = modelId;
        localStorage.setItem('assistme:model', modelId);
        updateModelDisplay();
    }

    function updateModelDisplay() {
        const activeOption = elements.modelDropdown.querySelector(`[data-model="${currentModel}"]`);
        if (activeOption) {
            const modelName = activeOption.querySelector('.model-label').textContent;
            elements.modelButton.querySelector('.model-name').textContent = modelName;

            // Update active state
            elements.modelDropdown.querySelectorAll('.model-option').forEach(opt => {
                opt.classList.remove('active');
            });
            activeOption.classList.add('active');
        }
    }

    // --- Theme Management ---
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('assistme:theme', newTheme);
        updateThemeUI();

        // Show theme change message
        showTemporaryMessage(
            `${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`,
            'success'
        );
    }

    function updateTheme() {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const icon = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        elements.darkModeToggle.innerHTML = `<i class="${icon}"></i>`;
        elements.darkModeToggle.setAttribute('aria-label',
            `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }

    function updateThemeUI() {
        updateTheme();
    }

    // --- UI Transitions ---
    function showWelcome() {
        elements.welcomeMessage.style.display = 'flex';
        elements.chatMessages.classList.remove('visible');
    }

    function showChat() {
        elements.welcomeMessage.style.display = 'none';
        elements.chatMessages.classList.add('visible');
        scrollToBottom();
    }

    function showTemporaryMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.className = `temporary-message temporary-message--${type}`;
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--background-tertiary);
            color: var(--text-primary);
            padding: var(--spacing-md);
            border-radius: var(--border-radius-lg);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            opacity: 0;
            animation: slideDownFade 0.3s ease-out forwards;
        `;

        document.body.appendChild(message);
        setTimeout(() => {
            message.style.animation = 'slideUpFade 0.3s ease-out forwards';
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    // --- Message Input Handling ---
    function handleMessageInput() {
        const hasContent = elements.messageInput.value.trim().length > 0;
        elements.sendButton.classList.toggle('disabled', !hasContent);

        autoResizeTextarea();
    }

    function handleMessageKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            lastInputWasVoice = false; // Text input
            if (elements.messageInput.value.trim()) {
                handleSendMessage();
            }
        }
    }

    function handleSendMessage() {
        const message = elements.messageInput.value.trim();
        if (!message) return;

        console.log('Sending message:', message);
        elements.messageInput.value = '';
        autoResizeTextarea();
        elements.sendButton.classList.add('disabled');

        addUserMessage(message);
        showChat();

        // Process the message
        processCommand(message);
    }

    function handleVoiceToggle() {
        if (isRecording) {
            stopVoiceRecording();
        } else {
            startVoiceRecording();
        }
    }

    function handleSuggestionClick(prompt) {
        lastInputWasVoice = false; // Suggestion is text-based
        addUserMessage(prompt);
        showChat();
        processCommand(prompt);
    }

    function autoResizeTextarea() {
        elements.messageInput.style.height = 'auto';
        const scrollHeight = elements.messageInput.scrollHeight;
        const newHeight = Math.min(scrollHeight, 200);
        elements.messageInput.style.height = `${newHeight}px`;
    }

    // --- Voice Recording ---
    function startVoiceRecording() {
        if (!SpeechRecognition && !webkitSpeechRecognition) {
            showTemporaryMessage('Voice recognition not supported in this browser', 'error');
            return;
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                isRecording = true;
                lastInputWasVoice = true; // Set flag for voice input
                elements.voiceButton.classList.add('recording');
                showTemporaryMessage('Listening...', 'info');
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                elements.messageInput.value = transcript;
                handleMessageInput();
                handleSendMessage();
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                stopVoiceRecording();
                showTemporaryMessage(`Voice recognition error: ${event.error}`, 'error');
            };

            recognition.onend = () => {
                stopVoiceRecording();
            };

            recognition.start();
        } catch (error) {
            console.error('Voice recording setup error:', error);
            showTemporaryMessage('Failed to start voice recording', 'error');
        }
    }

    function stopVoiceRecording() {
        isRecording = false;
        elements.voiceButton.classList.remove('recording');
    }

    // --- Message Management ---
    function addUserMessage(text) {
        addMessage(text, 'user');
    }

    function addAssistantMessage(text) {
        addMessage(text, 'assistant');
    }

    function addMessage(text, role) {
        console.log('Adding message:', role, text);
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message fade-in`;

        if (role === 'user') {
            messageDiv.innerHTML = `
                <div class="message-bubble user-bubble">
                    <div class="message-text">${escapeHtml(text)}</div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-bubble assistant-bubble">
                    <div class="message-text">${escapeHtml(text)}</div>
                    <div class="message-actions">
                        <button class="message-action-btn" title="Copy message" onclick="navigator.clipboard.writeText('${escapeHtml(text).replace(/'/g, "\\'")}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        elements.chatMessages.appendChild(messageDiv);
        console.log('Message div added to DOM');
        scrollToBottom();
    }

    function showTypingIndicator() {
        if (isTypingIndicator) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';

        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-bubble assistant-bubble">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        elements.chatMessages.appendChild(typingDiv);
        isTypingIndicator = typingDiv;
        scrollToBottom();
    }

    function hideTypingIndicator() {
        if (isTypingIndicator) {
            isTypingIndicator.remove();
            isTypingIndicator = null;
        }
    }

    function scrollToBottom() {
        setTimeout(() => {
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        }, 100);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Text-to-Speech ---
    function speakText(text) {
        if ('speechSynthesis' in window) {
            const synth = window.speechSynthesis;

            // Cancel any ongoing speech
            synth.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 0.8; // Slightly softer

            synth.speak(utterance);
        } else {
            console.warn('Speech synthesis not supported in this browser');
        }
    }

    // --- API Integration ---
    async function fetchAICompletion(prompt) {
        try {
            console.log('Starting API call for:', prompt, 'model:', currentModel);
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: currentModel,
                    messages: [{
                        role: 'system',
                        content: 'You are AssistMe, a helpful AI assistant. Provide clear, concise, and accurate responses.'
                    }, {
                        role: 'user',
                        content: prompt
                    }]
                }),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });
            console.log('API call received response');

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('API response data:', data); // Debug: check metadata
            const message = data.text || data.message || data.content || 'Sorry, I couldn\'t generate a response.';

            hideTypingIndicator();
            addAssistantMessage(message);

            // Text-to-speech for voice input
            if (lastInputWasVoice) {
                speakText(message.replace(/[*_`]/g, '')); // Clean markdown
                lastInputWasVoice = false;
            }

        } catch (error) {
            console.error('AI completion error:', error);
            hideTypingIndicator();
            addAssistantMessage('Sorry, I encountered an error while processing your request. Please try again.');

            // Text-to-speech for voice input errors
            if (lastInputWasVoice) {
                speakText('Sorry, I encountered an error while processing your request. Please try again.');
                lastInputWasVoice = false;
            }
        }
    }

    // --- Test Models ---
    async function testModels() {
        addAssistantMessage('Testing and ranking AI models...', 'assistant');
        showTypingIndicator();

        try {
            const response = await fetch('/api/testmodels', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                let resultsText = '🧪 **Model Performance Rankings**\n\n';
                data.results.forEach((result, index) => {
                    resultsText += `${index + 1}. **${result.model}**: ${result.score}/${data.questionsCount} points\n`;
                });

                hideTypingIndicator();
                addAssistantMessage(resultsText);

                // Update model selector if ranking is available
                updateModelSelectorWithRankings(data.results);
            } else {
                throw new Error('No test results returned');
            }

        } catch (error) {
            console.error('Test models error:', error);
            hideTypingIndicator();
            addAssistantMessage('Sorry, I couldn\'t complete the model testing at this time.');
        }
    }

    function updateModelSelectorWithRankings(results) {
        if (results.length > 0) {
            // Update current model to the highest ranked
            const topModel = results[0].id || results[0].model;
            if (topModel) {
                currentModel = topModel;
                localStorage.setItem('assistme:model', currentModel);
                updateModelDisplay();
            }
        }
    }

    // --- Command Processing ---
    async function processCommand(command) {
        const cmd = command.toLowerCase().trim();

        showTypingIndicator();

        // Math processing
        if (/[0-9]/.test(cmd) && /[+\-*/.^]/.test(cmd)) {
            try {
                const result = math.evaluate(cmd);
                hideTypingIndicator();
                addAssistantMessage(`The answer is: **${result}**`);
                return;
            } catch (e) {
                // Not a math expression, continue to AI
            }
        }

        // Open commands
        if (cmd.startsWith('open') || cmd.includes('search')) {
            handleOpenCommand(cmd);
            return;
        }

        // Default to AI completion
        await fetchAICompletion(command);
    }

    function handleOpenCommand(command) {
        hideTypingIndicator();

        if (command.includes('google') || command.includes('search')) {
            const query = command.replace(/^(open google|search)/i, '').trim();
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
            addAssistantMessage(`Opening Google search for: ${query}`);
        } else if (command.includes('youtube')) {
            window.open('https://youtube.com', '_blank');
            addAssistantMessage('Opening YouTube');
        } else {
            addAssistantMessage('I can help you search Google or open YouTube. Try "search for [topic]" or "open youtube".');
        }
    }

    // --- Keyboard Accessibility ---
    document.addEventListener('keydown', (e) => {
        // Escape to close dropdown
        if (e.key === 'Escape') {
            elements.modelSelector?.classList.remove('open');
        }

        // Ctrl/Cmd + K to focus input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            elements.messageInput.focus();
        }
    });

    // --- Initialize ---
    autoResizeTextarea();
    updateModelDisplay();
});
