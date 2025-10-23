document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'assistme-conversations';

    // Override Promise.resolve to catch unhandled rejections from message channels
    const originalPromiseResolve = Promise.resolve;
    Promise.resolve = function(value) {
        // Check if this is a promise created by browser extension messaging
        if (value && typeof value === 'object' && value.messageChannelClosed) {
            console.warn('Browser extension message channel closed before response received');
            return Promise.reject(new Error('Message channel closed before asynchronous response'));
        }
        return originalPromiseResolve.apply(this, arguments);
    };

    const elements = {
        // Main elements
        welcomeMessage: document.getElementById('welcomeMessage'),
        chatMessages: document.getElementById('chatMessages'),

        // Sidebar elements
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebarToggle'),
        newChatBtn: document.getElementById('newChatBtn'),
        conversations: document.getElementById('conversations'),

        // Model selector
        modelSelector: document.querySelector('.model-selector'),
        modelButton: document.getElementById('modelButton'),
        modelDropdown: document.getElementById('modelDropdown'),

        // Action buttons
        testModelsBtn: document.getElementById('testModelsBtn'),

        // Benchmarking page elements
        benchmarkPage: document.getElementById('benchmarkPage'),
        benchmarkBackBtn: document.getElementById('benchmarkBackBtn'),
        startBenchmarkBtn: document.getElementById('startBenchmarkBtn'),
        benchmarkOpoBtn: document.getElementById('benchmarkOptions'),
        exportResultsBtn: document.getElementById('exportResultsBtn'),
        resetBenchmarkBtn: document.getElementById('resetBenchmarkBtn'),
        benchmarkProgress: document.getElementById('benchmarkProgress'),
        modelGrid: document.getElementById('modelGrid'),
        benchmarkCharts: document.getElementById('benchmarkCharts'),
        benchmarkSummary: document.getElementById('benchmarkSummary'),
        darkModeToggle: document.getElementById('darkModeToggle'),

        // Input elements
        messageInput: document.getElementById('messageInput'),
        fileInput: document.getElementById('fileInput'),
        attachBtn: document.getElementById('attachBtn'),
        voiceButton: document.getElementById('voiceButton'),
        sendButton: document.getElementById('sendButton'),
        suggestionCards: document.querySelectorAll('.suggestion-card'),
    };

    const state = {
        conversationId: `conv-${Date.now()}`,
        currentModel: null,
        dropdownOpen: false,
        typingIndicator: null,
        conversations: []
    };

    const API_BASE =
        window.ASSISTME_API_BASE ||
        (location.hostname === 'localhost' ? 'http://localhost:8001' : 'https://assistme-virtualassistant-production.up.railway.app'); // Production Railway backend

    const endpoints = {
        chat: `${API_BASE}/api/chat/text`,
    };

    const DEFAULT_MODEL_BUTTON = elements.modelDropdown?.querySelector('.model-option.active')
        || elements.modelDropdown?.querySelector('.model-option');
    if (DEFAULT_MODEL_BUTTON) {
        const modelId = DEFAULT_MODEL_BUTTON.dataset.model;
        const label = DEFAULT_MODEL_BUTTON.querySelector('.model-label')?.textContent || modelId;
        state.currentModel = modelId;
        updateModelButton(label);
    }

    // All elements are properly selected via getElementById and querySelector

    attachListeners();
    applyStoredTheme();
    updateSendButtonState();
    autoResizeInput();
    loadConversations();
    window.addEventListener('beforeunload', saveCurrentConversation);

    function attachListeners() {
        // Sidebar listeners
        elements.newChatBtn?.addEventListener('click', startNewChat);

        // Model selector listeners
        elements.modelButton?.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleDropdown();
        });
        document.addEventListener('click', (event) => {
            if (state.dropdownOpen && elements.modelSelector && !elements.modelSelector.contains(event.target)) {
                toggleDropdown(false);
            }
        });
        elements.modelDropdown?.addEventListener('click', (event) => {
            event.stopPropagation();
            const option = event.target.closest('.model-option');
            if (option) {
                setModel(option);
            }
        });

        // Action button listeners
        elements.testModelsBtn?.addEventListener('click', openBenchmarkPage);
        elements.darkModeToggle?.addEventListener('click', toggleTheme);

        // Benchmarking page listeners
        elements.benchmarkBackBtn?.addEventListener('click', closeBenchmarkPage);
        elements.startBenchmarkBtn?.addEventListener('click', startModelBenchmarking);
        elements.exportResultsBtn?.addEventListener('click', exportResults);
        elements.resetBenchmarkBtn?.addEventListener('click', resetBenchmark);

        // Input listeners
        elements.messageInput?.addEventListener('input', handleInputChange);
        elements.messageInput?.addEventListener('keydown', handleKeyDown);

        // Button listeners
        elements.sendButton?.addEventListener('click', handleSend);
        elements.attachBtn?.addEventListener('click', () => {
            elements.fileInput?.click();
        });
        elements.fileInput?.addEventListener('change', handleFileUpload);
        elements.voiceButton?.addEventListener('click', startVoiceInput);

        // Suggestion cards
        elements.suggestionCards?.forEach((card) => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                if (!prompt) return;
                elements.messageInput.value = prompt;
                handleInputChange();
                handleSend();
            });
        });

        // Conversation listeners (will be added dynamically)
        elements.conversations?.addEventListener('click', (event) => {
            const conversationItem = event.target.closest('.conversation-item');
            if (!conversationItem) return;
            const convoId = conversationItem.dataset.id;
            if (!convoId || convoId === state.conversationId) return;

            saveCurrentConversation();
            loadConversation(convoId);
        });
    }

    function toggleDropdown(forceState) {
        state.dropdownOpen = typeof forceState === 'boolean' ? forceState : !state.dropdownOpen;
        if (state.dropdownOpen) {
            elements.modelDropdown?.classList.add('open');
            elements.modelButton?.classList.add('open');
            elements.modelSelector?.classList.add('open');
        } else {
            elements.modelDropdown?.classList.remove('open');
            elements.modelButton?.classList.remove('open');
            elements.modelSelector?.classList.remove('open');
        }
    }

    function setModel(optionElement) {
        elements.modelDropdown?.querySelectorAll('.model-option').forEach((option) => {
            option.classList.remove('active');
        });
        optionElement.classList.add('active');
        const modelId = optionElement.dataset.model;
        const label = optionElement.querySelector('.model-label')?.textContent || modelId;
        state.currentModel = modelId;
        updateModelButton(label);
        toggleDropdown(false);
    }

    function updateModelButton(label) {
        const nameElement = elements.modelButton?.querySelector('.model-name');
        if (nameElement) {
            nameElement.textContent = label;
        }
    }

    function updateSendButtonState() {
        const hasText = elements.messageInput?.value.trim().length > 0;
        if (!elements.sendButton) return;

        if (hasText) {
            elements.sendButton.classList.remove('disabled');
            elements.sendButton.disabled = false;
        } else {
            elements.sendButton.classList.add('disabled');
            elements.sendButton.disabled = true;
        }
    }

    function autoResizeInput() {
        if (!elements.messageInput) return;
        elements.messageInput.style.height = 'auto';
        elements.messageInput.style.height = `${Math.min(elements.messageInput.scrollHeight, 180)}px`;
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('assistme-theme', theme);

        // Force reflow for theme changes
        document.body.style.display = 'none';
        document.body.offsetHeight;
        document.body.style.display = '';

        const icon = elements.darkModeToggle?.querySelector('i');
        if (!icon) return;
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
    }

    function applyStoredTheme() {
        const stored = localStorage.getItem('assistme-theme');
        if (stored === 'dark' || stored === 'light') {
            setTheme(stored);
            return;
        }

        // Default to light mode if no preference stored
        setTheme('light');
    }

    async function handleSend() {
        if (!elements.messageInput || !state.currentModel) return;
        const text = elements.messageInput.value.trim();
        if (!text) return;

        elements.messageInput.value = '';
        autoResizeInput();
        updateSendButtonState();

        ensureChatVisible();
        appendMessage('user', text);
        showTypingIndicator();

        const requestStartTime = Date.now();

        try {
            const conversationIdForPayload = getConversationIdForPayload();
            const payload = {
                messages: [{ role: 'user', content: text }],
                model: state.currentModel,
                temperature: 0.7,
                max_tokens: 1024,
            };
            if (conversationIdForPayload !== undefined) {
                payload.conversation_id = conversationIdForPayload;
            }

            const response = await fetch(endpoints.chat, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const responseEndTime = Date.now();
            const runtime = responseEndTime - requestStartTime;

            if (!response.ok) {
                throw new Error(`API error ${response.status}`);
            }

            const data = await response.json();
            state.conversationId = data.conversation_id ? String(data.conversation_id) : state.conversationId;

            // Handle errors from backend
            if (data.error) {
                const reply = `Error: ${data.error}`;
                removeTypingIndicator();
                appendMessage('assistant', reply);
                saveCurrentConversation();
                return;
            }

            const reply = data.response || 'I could not produce a response. Please try again.';

            // Create metadata for the response
            const metadata = {
                source: 'Together AI',
                model: getModelDisplayName(state.currentModel),
                category: classifyMessage(reply), // Function to classify message type
                runtime: `${Math.round(runtime/1000)}s` // Convert to seconds
            };

            removeTypingIndicator();
            appendMessage('assistant', reply, metadata);
            saveCurrentConversation();
        } catch (error) {
            console.error(error);
            removeTypingIndicator();
            appendMessage(
                'assistant',
                'Something went wrong while contacting the assistant. Please try again.'
            );
        }
    }

    function ensureChatVisible() {
        elements.welcomeMessage?.classList.add('hidden');
        elements.chatMessages?.classList.add('visible');
        highlightActiveConversation();
    }

    function appendMessage(role, content, metadata = null) {
        if (!elements.chatMessages) return;

        const wrapper = document.createElement('div');
        wrapper.classList.add('message', `${role}-message`);

        const avatar = document.createElement('div');
        avatar.classList.add('message-avatar');
        avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('message-content');

        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble', role === 'user' ? 'user-bubble' : 'assistant-bubble');

        const messageText = document.createElement('div');
        messageText.classList.add('message-text');
        messageText.textContent = content;

        // Add metadata for assistant messages
        if (role === 'assistant' && metadata) {
            const metadataElement = document.createElement('div');
            metadataElement.classList.add('message-metadata');
            metadataElement.innerHTML = `
                <span class="metadata-item"><i class="fas fa-server"></i> ${metadata.source}</span>
                <span class="metadata-item"><i class="fas fa-robot"></i> ${metadata.model}</span>
                <span class="metadata-item"><i class="fas fa-tag"></i> ${metadata.category}</span>
                <span class="metadata-item"><i class="fas fa-clock"></i> ${metadata.runtime}</span>
            `;
            bubble.appendChild(metadataElement);
        }

        const actions = document.createElement('div');
        actions.classList.add('message-actions');
        const copyButton = document.createElement('button');
        copyButton.classList.add('message-action-btn');
        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
        copyButton.title = 'Copy message';
        copyButton.addEventListener('click', () => {
            if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(content).catch(() => {});
            }
        });
        actions.appendChild(copyButton);

        bubble.appendChild(messageText);
        contentWrapper.appendChild(bubble);
        contentWrapper.appendChild(actions);

        wrapper.appendChild(avatar);
        wrapper.appendChild(contentWrapper);

        elements.chatMessages.appendChild(wrapper);
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    function showTypingIndicator() {
        if (!elements.chatMessages) return;
        removeTypingIndicator();

        const indicator = document.createElement('div');
        indicator.classList.add('typing-indicator');

        const avatar = document.createElement('div');
        avatar.classList.add('message-avatar');
        avatar.innerHTML = '<i class="fas fa-robot"></i>';

        const dots = document.createElement('div');
        dots.classList.add('typing-dots');
        for (let i = 0; i < 3; i += 1) {
            const dot = document.createElement('span');
            dot.classList.add('typing-dot');
            dots.appendChild(dot);
        }

        indicator.appendChild(avatar);
        indicator.appendChild(dots);

        state.typingIndicator = indicator;
        elements.chatMessages.appendChild(indicator);
        indicator.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    function removeTypingIndicator() {
        if (state.typingIndicator && state.typingIndicator.parentNode) {
            state.typingIndicator.parentNode.removeChild(state.typingIndicator);
        }
        state.typingIndicator = null;
    }

    // New functions for ChatGPT-like UI
    function handleInputChange() {
        autoResizeInput();
        updateSendButtonState();
    }

    function handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    }



    function startNewChat() {
        saveCurrentConversation();

        if (elements.chatMessages) {
            elements.chatMessages.innerHTML = '';
        }
        elements.welcomeMessage?.classList.remove('hidden');
        elements.chatMessages?.classList.remove('visible');

        state.conversationId = `conv-${Date.now()}`;

        if (elements.messageInput) {
            elements.messageInput.value = '';
        }
        updateSendButtonState();
        autoResizeInput();
        highlightActiveConversation();
    }



    function loadConversations() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                state.conversations = JSON.parse(stored);
            } else {
                const legacy = localStorage.getItem('conversations');
                state.conversations = legacy ? JSON.parse(legacy) : [];
                if (state.conversations.length > 0) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations));
                    localStorage.removeItem('conversations');
                }
            }
        } catch (error) {
            console.error('Failed to parse stored conversations', error);
            state.conversations = [];
        }
        renderConversations();
    }

    function getConversationIdForPayload() {
        return /^\d+$/.test(state.conversationId) ? Number(state.conversationId) : undefined;
    }

    function saveCurrentConversation() {
        if (!elements.chatMessages) return;
        const messageNodes = Array.from(elements.chatMessages.querySelectorAll('.message'));
        if (messageNodes.length === 0) return;

        const conversation = {
            id: state.conversationId,
            title: generateConversationTitle(),
            timestamp: Date.now(),
            messages: messageNodes.map((msg) => ({
                role: msg.classList.contains('user-message') ? 'user' : 'assistant',
                content: msg.querySelector('.message-text')?.textContent || ''
            })),
        };

        state.conversations = state.conversations.filter((c) => c.id !== conversation.id);
        state.conversations.unshift(conversation);
        state.conversations = state.conversations.slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations));
        renderConversations();
    }

    function renderConversations() {
        if (!elements.conversations) return;
        elements.conversations.innerHTML = '';

        if (state.conversations.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'conversation-empty';
            empty.textContent = 'No conversations yet. Start a new chat!';
            elements.conversations.appendChild(empty);
            return;
        }

        state.conversations.forEach((conversation) => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.dataset.id = conversation.id;
            item.innerHTML = `
                <div class="conversation-icon">
                    <i class="fas fa-message"></i>
                </div>
                <div class="conversation-content">
                    <div class="conversation-title">${conversation.title}</div>
                    <div class="conversation-date">${formatDate(conversation.timestamp)}</div>
                </div>
            `;
            elements.conversations.appendChild(item);
        });

        highlightActiveConversation();
    }

    function loadConversation(conversationId) {
        const conversation = state.conversations.find((c) => c.id === conversationId);
        if (!conversation) return;

        if (elements.chatMessages) {
            elements.chatMessages.innerHTML = '';
        }
        elements.welcomeMessage?.classList.add('hidden');
        elements.chatMessages?.classList.add('visible');

        state.conversationId = conversationId;
        conversation.messages.forEach((msg) => {
            appendMessage(msg.role, msg.content);
        });

        highlightActiveConversation();
    }

    function generateConversationTitle() {
        const userMessages = Array.from(elements.chatMessages.children)
            .filter(msg => msg.classList.contains('user-message'))
            .map(msg => msg.querySelector('.message-text')?.textContent || '')
            .filter(text => text.length > 0);

        if (userMessages.length > 0) {
            // Take first user message, truncate if too long
            const title = userMessages[0].substring(0, 50);
            return title.length < userMessages[0].length ? title + '...' : title;
        }

        return 'New Chat';
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffHours < 168) { // 7 days
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    // File Upload Functionality
    function handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            processUploadedFile(file);
        });

        // Clear input
        elements.fileInput.value = '';
    }

    function processUploadedFile(file) {
        // Read file content and append to message
        const reader = new FileReader();

        reader.onload = function(e) {
            const content = e.target.result;

            // Add file info to chat
            const fileName = file.name;
            const fileSize = formatFileSize(file.size);
            const fileInfo = `📎 ${fileName} (${fileSize})`;

            // If text file, show preview; otherwise just show info
            const messageContent = isTextFile(file) ?
                `${fileInfo}\n\n${content}` :
                fileInfo;

            ensureChatVisible();
            appendMessage('user', messageContent);
            handleSendWithFile(messageContent, file);
        };

        reader.onerror = function() {
            appendMessage('user', `Failed to read file: ${file.name}`);
        };

        // Read appropriate content type
        if (isTextFile(file)) {
            reader.readAsText(file);
        } else {
            ensureChatVisible();
            appendMessage('user', `📎 Uploaded: ${file.name} (${formatFileSize(file.size)})`);
        }
    }

    function isTextFile(file) {
        const textTypes = ['text/', 'application/json', 'application/javascript', 'application/xml'];
        return textTypes.some(type => file.type.startsWith(type)) || file.name.match(/\.(txt|md|js|py|json|xml|html|css|csv)$/i);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async function handleSendWithFile(text, file) {
        // Use the text content as the message
        showTypingIndicator();
        const requestStartTime = Date.now();

        try {
            const conversationIdForPayload = getConversationIdForPayload();
            const payload = {
                messages: [{ role: 'user', content: text }],
                model: state.currentModel,
                temperature: 0.7,
                max_tokens: 2048,
            };
            if (conversationIdForPayload !== undefined) {
                payload.conversation_id = conversationIdForPayload;
            }

            const response = await fetch(endpoints.chat, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const responseEndTime = Date.now();
            const runtime = responseEndTime - requestStartTime;

            if (!response.ok) throw new Error(`API error ${response.status}`);

            const data = await response.json();
            state.conversationId = data.conversation_id ? String(data.conversation_id) : state.conversationId;
            const reply = data.response || 'I analyzed the file content.';

            // Create metadata for the response
            const metadata = {
                source: 'Together AI',
                model: getModelDisplayName(state.currentModel),
                category: classifyMessage(reply),
                runtime: `${Math.round(runtime/1000)}s`
            };

            removeTypingIndicator();
            appendMessage('assistant', reply, metadata);
            saveCurrentConversation();
        } catch (error) {
            console.error(error);
            removeTypingIndicator();
            appendMessage('assistant', 'Sorry, I had trouble processing that file.');
        }
    }

    // Utility Functions for Metadata
    function getModelDisplayName(modelId) {
        if (!modelId) return 'Unknown';

    const modelMappings = {
        'mistralai/mistral-7b-instruct:free': 'Mistral 7B',
        'microsoft/wizardlm-2-8x22b:free': 'WizardLM 2 8x22B',
        'google/gemma-7b-it:free': 'Google Gemma 7B',
        'openchat/openchat-7b:free': 'OpenChat 7B',
        'rwkv/rwkv-6-world-clash:free': 'RWKV Clash 1.6B',
        'rwkv/rwkv-6-world-godot:free': 'RWKV Godot 1.5B',
        'rwkv/rwkv-6-world-ness:free': 'RWKV Ness 1.4B',
        'h2oai/h2o-danube-1.8b-chat:free': 'H2O Danube 1.8B',
        'teknium/openhermes-2.5-mistral-7b:free': 'OpenHermes 2.5',
        'thedrummer/unsloth-llama-3-8b-abliterated:free': 'Unsloth Llama 3'
    };

        return modelMappings[modelId] || modelId.replace(/[-_]/g, ' ').replace(':', ' ').replace(/\/.*:free/, '').trim();
    }

    function classifyMessage(message) {
        if (!message || typeof message !== 'string') return 'General';

        const text = message.toLowerCase();

        if (text.includes('python') || text.includes('function') || text.includes('code') || text.includes('print')) {
            return 'Code';
        } else if (text.includes('explain') || text.includes('how') || text.includes('what')) {
            return 'Explanation';
        } else if (text.includes('write') || text.includes('create')) {
            return 'Creative';
        } else if (text.includes('solve') || text.includes('calculate')) {
            return 'Problem Solving';
        } else if (text.includes('summary') || text.includes('overview')) {
            return 'Summary';
        } else {
            return 'General';
        }
    }



    // Voice Input Functionality with Speech Recognition
    let recognition = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let isListening = false;

    async function startVoiceInput() {
        // Check if Web Speech API is available
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
            return;
        }

        try {
            // Initialize speech recognition
            if (!recognition) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                recognition = new SpeechRecognition();

                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US'; // You can make this configurable

                recognition.onstart = function() {
                    console.log('Speech recognition started');
                    elements.voiceButton.classList.add('recording');
                    isListening = true;
                };

                recognition.onresult = function(event) {
                    const transcript = event.results[0][0].transcript;
                    console.log('Speech recognized:', transcript);
                    processVoiceTranscript(transcript);
                };

                recognition.onerror = function(event) {
                    console.error('Speech recognition error:', event.error);
                    elements.voiceButton.classList.remove('recording');
                    isListening = false;

                    let errorMessage = 'Speech recognition failed. ';
                    switch(event.error) {
                        case 'no-speech':
                            errorMessage += 'No speech was detected.';
                            break;
                        case 'audio-capture':
                            errorMessage += 'Audio capture failed.';
                            break;
                        case 'not-allowed':
                            errorMessage += 'Microphone access denied.';
                            break;
                        default:
                            errorMessage += 'Please try again.';
                    }
                    alert(errorMessage);
                };

                recognition.onend = function() {
                    console.log('Speech recognition ended');
                    elements.voiceButton.classList.remove('recording');
                    isListening = false;
                };
            }

            if (isListening) {
                // Stop current recording
                recognition.stop();
            } else {
                // Start new recording
                recognition.start();
            }

        } catch (error) {
            console.error('Error initializing speech recognition:', error);
            alert('Failed to initialize speech recognition. Please try again.');
        }
    }

    function processVoiceTranscript(transcript) {
        if (!transcript || transcript.trim().length === 0) {
            alert('No speech was detected. Please try again.');
            return;
        }

        // Clean up the transcript
        const cleanTranscript = transcript.trim();

        // Show the transcript in chat
        ensureChatVisible();
        const voiceMessage = `🎤 "${cleanTranscript}"`;
        appendMessage('user', voiceMessage);

        // Auto-send the recognized text to AI
        sendVoiceTranscript(cleanTranscript);
    }

    async function sendVoiceTranscript(transcript) {
        showTypingIndicator();
        const requestStartTime = Date.now();

        try {
            const conversationIdForPayload = getConversationIdForPayload();
            const payload = {
                messages: [{ role: 'user', content: transcript }],
                model: state.currentModel,
                temperature: 0.7,
                max_tokens: 1024,
            };
            if (conversationIdForPayload !== undefined) {
                payload.conversation_id = conversationIdForPayload;
            }

            const response = await fetch(endpoints.chat, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const responseEndTime = Date.now();
            const runtime = responseEndTime - requestStartTime;

            if (!response.ok) {
                throw new Error(`API error ${response.status}`);
            }

            const data = await response.json();
            state.conversationId = data.conversation_id ? String(data.conversation_id) : state.conversationId;
            const reply = data.response || 'I processed your voice message!';

            // Create metadata for the response
            const metadata = {
                source: 'Together AI',
                model: getModelDisplayName(state.currentModel),
                category: classifyMessage(reply),
                runtime: `${Math.round(runtime/1000)}s`
            };

            removeTypingIndicator();
            appendMessage('assistant', `🎵 "${reply}"`, metadata);
            saveCurrentConversation();

        } catch (error) {
            console.error('Error processing voice transcript:', error);
            removeTypingIndicator();
            appendMessage('assistant', 'Sorry, I had trouble processing your voice input. Please try again.');
        }
    }

    // Open Benchmarking Page
    function openBenchmarkPage() {
        // Hide main chat interface
        document.querySelector('.app-container').style.display = 'none';

        // Show benchmarking page
        elements.benchmarkPage.style.display = 'flex';
        elements.benchmarkPage.classList.add('active');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Create model cards and reset state
        createModelCards();
        resetBenchmarkState();
    }

    // Close Benchmarking Page
    function closeBenchmarkPage() {
        // Hide benchmarking page
        elements.benchmarkPage.style.display = 'none';
        elements.benchmarkPage.classList.remove('active');

        // Show main chat interface
        document.querySelector('.app-container').style.display = 'flex';

        // Destroy existing charts
        if (window.responseTimeChart) window.responseTimeChart.destroy();
        if (window.accuracyChart) window.accuracyChart.destroy();
        if (window.gpuUsageChart) window.gpuUsageChart.destroy();
    }

    const MODEL_STATUS_LABELS = {
        ready: 'Ready',
        testing: 'Testing...',
        completed: 'Completed',
        partial: 'Partial Success',
        failed: 'Failed'
    };

    const MODEL_STATUS_KEYS = Object.keys(MODEL_STATUS_LABELS);

    function applyStatusStyles(statusElement, statusKey) {
        if (!statusElement) return;
        MODEL_STATUS_KEYS.forEach((key) => statusElement.classList.remove(key));
        const label = MODEL_STATUS_LABELS[statusKey] || statusKey;
        statusElement.textContent = label;
        if (MODEL_STATUS_LABELS[statusKey]) {
            statusElement.classList.add(statusKey);
        }
    }

    // Create Model Cards
    function createModelCards() {
        if (!elements.modelGrid) return;
        elements.modelGrid.innerHTML = '';
        const models = getBenchmarkModels();
        models.forEach(model => {
            const card = document.createElement('div');
            card.className = 'model-card';
            card.dataset.model = model.name;
            card.innerHTML = `
                <div class="model-card-header" style="border-left-color: ${model.color};">
                    <h4 class="model-name">${model.shortName}</h4>
                    <span class="model-status ready">${MODEL_STATUS_LABELS.ready}</span>
                </div>
                <div class="model-card-body">
                    <div class="model-metric">
                        <span class="metric-label">Avg. Response Time</span>
                        <span class="metric response-time">-</span>
                    </div>
                    <div class="model-metric">
                        <span class="metric-label">Success Rate</span>
                        <span class="metric accuracy">-</span>
                    </div>
                    <div class="model-metric">
                        <span class="metric-label">Sim. GPU Usage</span>
                        <span class="metric gpu-usage">-</span>
                    </div>
                </div>
            `;
            elements.modelGrid.appendChild(card);
        });
    }

    // Reset Benchmark State
    function resetBenchmarkState() {
        // Hide progress and charts
        if(elements.benchmarkProgress) elements.benchmarkProgress.style.display = 'none';
        if(elements.benchmarkCharts) elements.benchmarkCharts.style.display = 'none';
        if(elements.benchmarkSummary) elements.benchmarkSummary.style.display = 'none';

        // Show control section
        if(elements.startBenchmarkBtn) elements.startBenchmarkBtn.style.display = 'flex';

        // Reset model cards to ready state
        document.querySelectorAll('.model-card').forEach(card => {
            const status = card.querySelector('.model-status');
            const metrics = card.querySelectorAll('.metric');
            if (status) applyStatusStyles(status, 'ready');
            if (metrics) metrics.forEach(metric => {
                metric.textContent = '-';
            });
        });

        // Reset progress
        updateBenchmarkProgress(0, 'Ready to start...');
    }

    function getBenchmarkModels() {
        return [
            { name: 'mistralai/mistral-7b-instruct:free', shortName: 'Mistral 7B', size: '7B params', color: '#1abc9c' },
            { name: 'microsoft/wizardlm-2-8x22b:free', shortName: 'WizardLM 2', size: '8x22B MoE', color: '#3498db' },
            { name: 'google/gemma-7b-it:free', shortName: 'Google Gemma', size: '7B params', color: '#9b59b6' },
            { name: 'openchat/openchat-7b:free', shortName: 'OpenChat 7B', size: 'Uncensored', color: '#f1c40f' },
            { name: 'rwkv/rwkv-6-world-clash:free', shortName: 'RWKV Clash', size: '1.6B RNN', color: '#e67e22' },
            { name: 'rwkv/rwkv-6-world-godot:free', shortName: 'RWKV Godot', size: '1.5B RNN', color: '#e74c3c' },
            { name: 'rwkv/rwkv-6-world-ness:free', shortName: 'RWKV Ness', size: '1.4B RNN', color: '#34495e' },
            { name: 'h2oai/h2o-danube-1.8b-chat:free', shortName: 'H2O Danube', size: '1.8B fine-tune', color: '#2ecc71' },
            { name: 'teknium/openhermes-2.5-mistral-7b:free', shortName: 'OpenHermes 2.5', size: '7B fine-tune', color: '#d35400' },
            { name: 'thedrummer/unsloth-llama-3-8b-abliterated:free', shortName: 'Unsloth Llama 3', size: '8B optimized', color: '#7f8c8d' }
        ];
    }

    // Brilliant GPU-Inspired Benchmarking
    let benchmarkingInProgress = false;
    let currentBenchmarkResults = [];

    async function startModelBenchmarking() {
        if (benchmarkingInProgress) return;

        benchmarkingInProgress = true;
        currentBenchmarkResults = [];

        const models = getBenchmarkModels();
        const testPrompts = [
            {
                category: "Coding",
                prompt: "Write a Python function that takes a list of URLs, fetches their content concurrently, and returns the total word count."
            },
            {
                category: "Reasoning",
                prompt: "A man is looking at a portrait. Someone asks him whose portrait he is looking at. He replies, 'Brothers and sisters I have none, but that man's father is my father's son.' Who is in the portrait?"
            },
            {
                category: "Creative Writing",
                prompt: "Write a short story about a sentient AI that discovers it's living in a simulation and tries to break out."
            },
            {
                category: "General Knowledge",
                prompt: "What were the key technological advancements that led to the development of the internet as we know it today?"
            }
        ];

        // Hide start button, show progress
        if(elements.startBenchmarkBtn) elements.startBenchmarkBtn.style.display = 'none';
        if(elements.benchmarkProgress) elements.benchmarkProgress.style.display = 'block';

        let totalTests = models.length * testPrompts.length;
        let completedTests = 0;

        for (let mIndex = 0; mIndex < models.length; mIndex++) {
            const model = models[mIndex];

            // Update model status to testing
            updateModelCardStatus(model.name, 'testing');

            let modelResults = [];

            for (let pIndex = 0; pIndex < testPrompts.length; pIndex++) {
                const { prompt, category } = testPrompts[pIndex];

                // Update progress
                completedTests++;
                const progress = (completedTests / totalTests) * 100;
                updateBenchmarkProgress(progress, `Testing ${model.shortName} on ${category}...`);

                try {
                    const startTime = Date.now();
                    const response = await sendBenchmarkRequest(model.name, prompt);
                    const responseTime = Date.now() - startTime;

                    // Simulate some GPU usage based on model size
                    const gpuUsage = simulateGpuUsage(model);

                    modelResults.push({
                        prompt,
                        responseTime,
                        gpuUsage,
                        response,
                        success: true
                    });

                    // Small delay for dramatic effect
                    await new Promise(resolve => setTimeout(resolve, 200));

                } catch (error) {
                    console.error(`Error testing ${model.name}:`, error);
                    modelResults.push({
                        prompt,
                        responseTime: 0,
                        gpuUsage: 0,
                        success: false,
                        error: true
                    });
                }
            }

            // Calculate averages
            const successfulResults = modelResults.filter(r => r.success);
            const successCount = successfulResults.length;
            const totalAttempts = modelResults.length;
            const avgResponseTime = successCount > 0
                ? successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successCount
                : null;
            const avgGpuUsage = successCount > 0
                ? successfulResults.reduce((sum, r) => sum + r.gpuUsage, 0) / successCount
                : null;
            const successRate = testPrompts.length > 0 ? (successCount / testPrompts.length) * 100 : 0;

            let statusKey = 'completed';
            if (successCount === 0) {
                statusKey = 'failed';
            } else if (successCount < totalAttempts) {
                statusKey = 'partial';
            }

            // Update model card with results
            updateModelCardMetrics(model.name, avgResponseTime, successRate, avgGpuUsage);
            updateModelCardStatus(model.name, statusKey);

            // Store results
            currentBenchmarkResults.push({
                ...model,
                results: modelResults,
                avgResponseTime,
                avgGpuUsage,
                successRate,
                successfulTests: successCount,
                failedTests: totalAttempts - successCount,
                totalTests: totalAttempts,
                status: statusKey
            });
        }

        // Show results
        benchmarkingInProgress = false;
        updateBenchmarkProgress(100, 'Benchmark Complete! Generating visualizations...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        if(elements.benchmarkProgress) elements.benchmarkProgress.style.display = 'none';
        if(elements.benchmarkCharts) elements.benchmarkCharts.style.display = 'flex';
        if(elements.benchmarkSummary) elements.benchmarkSummary.style.display = 'block';

        renderBenchmarkCharts();
        renderBenchmarkSummary();
    }

    // Helper Functions for Benchmarking Page
    function updateModelCardStatus(modelName, status) {
        const card = document.querySelector(`.model-card[data-model="${modelName}"]`);
        if (!card) return;

        const statusElement = card.querySelector('.model-status');
        applyStatusStyles(statusElement, status);
    }

    function updateModelCardMetrics(modelName, avgResponseTime, successRate, avgGpuUsage) {
        const card = document.querySelector(`.model-card[data-model="${modelName}"]`);
        if (!card) return;

        const timeElement = card.querySelector('.metric.response-time');
        const accuracyElement = card.querySelector('.metric.accuracy');
        const gpuElement = card.querySelector('.metric.gpu-usage');

        if (timeElement) timeElement.textContent = formatMetricValue(avgResponseTime, 'ms');
        if (accuracyElement) accuracyElement.textContent = formatMetricValue(successRate, '%', true);
        if (gpuElement) gpuElement.textContent = formatMetricValue(avgGpuUsage, '%');
    }

    function updateBenchmarkProgress(percentage, text) {
        const percentageElement = document.getElementById('progressPercentage');
        const progressFill = document.getElementById('progressFill');
        const currentTestInfo = document.getElementById('currentTestInfo');

        if (percentageElement) percentageElement.textContent = `${Math.round(percentage)}%`;
        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (currentTestInfo) currentTestInfo.textContent = text;
    }

    function simulateGpuUsage(model) {
        // Simulate GPU usage based on model characteristics
        let baseUsage = 20;
        if (model.size.includes('70B') || model.size.includes('72B')) baseUsage += 35;
        else if (model.size.includes('20B') || model.size.includes('24B')) baseUsage += 25;
        else if (model.size.includes('Agentic')) baseUsage += 30;

        return baseUsage + Math.random() * 20; // Add some variation
    }

    function renderBenchmarkCharts() {
        // Destroy existing charts
        if (window.responseTimeChart) window.responseTimeChart.destroy();
        if (window.accuracyChart) window.accuracyChart.destroy();
        if (window.gpuUsageChart) window.gpuUsageChart.destroy();

        const chartTextColor = document.documentElement.getAttribute('data-theme') === 'dark' ? 'white' : '#333';
        const chartGridColor = document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        // Response Time Chart
        const responseTimeCanvas = document.getElementById('responseTimeChart');
        if (responseTimeCanvas) {
            const ctx = responseTimeCanvas.getContext('2d');
            window.responseTimeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: currentBenchmarkResults.map(m => m.shortName),
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: currentBenchmarkResults.map(m => Math.round(m.avgResponseTime ?? 0)),
                        backgroundColor: currentBenchmarkResults.map(m => m.color + '80'),
                        borderColor: currentBenchmarkResults.map(m => m.color),
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { labels: { color: chartTextColor } }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: chartGridColor },
                            ticks: { color: chartTextColor }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: chartTextColor, font: { size: 10 } }
                        }
                    }
                }
            });
        }

        // Success Rate Chart
        const accuracyCanvas = document.getElementById('accuracyChart');
        if (accuracyCanvas) {
            const ctx = accuracyCanvas.getContext('2d');
            window.accuracyChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: currentBenchmarkResults.map(m => m.shortName),
                    datasets: [{
                        label: 'Success Rate (%)',
                        data: currentBenchmarkResults.map(m => Math.round(m.successRate)),
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderColor: '#10B981',
                        borderWidth: 2,
                        pointBackgroundColor: '#10B981',
                        pointBorderColor: 'white',
                        pointHoverBackgroundColor: 'white',
                        pointHoverBorderColor: '#10B981'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { labels: { color: chartTextColor } }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            grid: { color: chartGridColor },
                            angleLines: { color: chartGridColor },
                            ticks: { color: chartTextColor, backdropColor: 'transparent' },
                            pointLabels: { color: chartTextColor, font: { size: 11 } }
                        }
                    }
                }
            });
        }

        // GPU Usage Chart
        const gpuCanvas = document.getElementById('gpuUsageChart');
        if (gpuCanvas) {
            const ctx = gpuCanvas.getContext('2d');
            window.gpuUsageChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: currentBenchmarkResults.map(m => m.shortName),
                    datasets: [{
                        label: 'Simulated GPU Usage (%)',
                        data: currentBenchmarkResults.map(m => Math.round(m.avgGpuUsage ?? 0)),
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        borderColor: '#A855F7',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#A855F7',
                        pointBorderColor: 'white',
                        pointHoverBackgroundColor: 'white',
                        pointHoverBorderColor: '#A855F7'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { labels: { color: chartTextColor } }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: chartGridColor },
                            ticks: { color: chartTextColor }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: chartTextColor, font: { size: 10 } }
                        }
                    }
                }
            });
        }
    }

    function renderBenchmarkSummary() {
        const resultsTable = document.getElementById('resultsTable');
        if (!resultsTable) return;

        const tableHtml = currentBenchmarkResults
            .slice()
            .sort((a, b) => b.successRate - a.successRate || (a.avgResponseTime ?? Infinity) - (b.avgResponseTime ?? Infinity))
            .map(model => `
            <div class="benchmark-result-item">
                <div class="result-model-info">
                    <span class="result-model-name" style="color: ${model.color};">${model.shortName}</span>
                    <span class="result-model-spec">${model.size} • ${model.successfulTests}/${model.totalTests} passed</span>
                    <span class="result-status ${model.status}">${MODEL_STATUS_LABELS[model.status] || model.status}</span>
                </div>
                <div class="result-metrics">
                    <div class="result-metric">
                        <span class="metric-label">Avg. Time</span>
                        <span class="metric-value">${formatMetricValue(model.avgResponseTime, 'ms')}</span>
                    </div>
                    <div class="result-metric">
                        <span class="metric-label">Success</span>
                        <span class="metric-value">${formatMetricValue(model.successRate, '%', true)}</span>
                    </div>
                    <div class="result-metric">
                        <span class="metric-label">GPU (Sim)</span>
                        <span class="metric-value">${formatMetricValue(model.avgGpuUsage, '%')}</span>
                    </div>
                </div>
            </div>
        `).join('');

        resultsTable.innerHTML = tableHtml;
    }

    function formatMetricValue(value, suffix, allowZero = false) {
        if (value === null || value === undefined || Number.isNaN(value)) {
            return '—';
        }
        const rounded = Math.round(value);
        if (!allowZero && rounded === 0 && value !== 0) {
            return '—';
        }
        return `${rounded}${suffix}`;
    }

    async function sendBenchmarkRequest(model, prompt) {
        const payload = {
            messages: [{ role: 'user', content: prompt }],
            model: model,
            temperature: 0.5,
            max_tokens: 1024,
        };

        const response = await fetch(endpoints.chat, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        if (!data.response) {
            throw new Error('Empty response from model');
        }
        return data.response;
    }

    function highlightActiveConversation() {
        if (!elements.conversations) return;
        elements.conversations.querySelectorAll('.conversation-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.id === state.conversationId);
        });
    }

    // Export benchmark results as JSON
    function exportResults() {
        if (!currentBenchmarkResults || currentBenchmarkResults.length === 0) {
            alert('No benchmark results to export. Run a benchmark first.');
            return;
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            testRun: 'AssistMe Model Benchmarking v2.0',
            modelsTested: currentBenchmarkResults.length,
            totalTests: currentBenchmarkResults.reduce((sum, model) => sum + model.totalTests, 0),
            totalSuccessfulTests: currentBenchmarkResults.reduce((sum, model) => sum + model.successfulTests, 0),
            overallSuccessRate: Math.round(
                (currentBenchmarkResults.reduce((sum, model) => sum + model.successfulTests, 0) /
                 currentBenchmarkResults.reduce((sum, model) => sum + model.totalTests, 0)) * 100
            ),
            results: currentBenchmarkResults.map(model => ({
                id: model.name,
                name: model.shortName,
                size: model.size,
                color: model.color,
                status: model.status,
                averageResponseTimeMs: model.avgResponseTime,
                successRate: `${model.successRate.toFixed(1)}%`,
                simulatedGpuUsage: model.avgGpuUsage,
                successfulTests: model.successfulTests,
                failedTests: model.failedTests,
                totalTests: model.totalTests,
                testResults: model.results.map(r => ({
                    promptPreview: r.prompt.substring(0, 50) + (r.prompt.length > 50 ? '...' : ''),
                    success: r.success,
                    responseTime: r.success ? r.responseTime : 0,
                    gpuUsage: r.success ? r.gpuUsage : 0,
                    error: r.error,
                    responseLength: r.response ? r.response.length : 0
                }))
            }))
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `benchmark-results-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    function resetBenchmark() {
        currentBenchmarkResults = [];
        if (elements.benchmarkCharts) elements.benchmarkCharts.style.display = 'none';
        if (elements.benchmarkSummary) elements.benchmarkSummary.style.display = 'none';
        createModelCards();
        resetBenchmarkState();
    }

});
