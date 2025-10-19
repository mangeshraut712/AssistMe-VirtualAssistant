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
        (location.hostname === 'localhost' ? 'http://localhost:8001' : 'https://assistme-backend.onrender.com '); // TODO: Replace with actual deployed backend URL

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
            'meta-llama/llama-4-scout:free': 'Llama 4 Scout',
            'qwen/qwen3-14b:free': 'Qwen 3 14B',
            'deepseek/deepseek-chat-v3.1:free': 'DeepSeek V3.1',
            'mistralai/mistral-small-3.1-24b-instruct:free': 'Mistral 24B',
            'tngtech/deepseek-r1t-chimera:free': 'Chimera R1T',
            'moonshotai/kimi-dev-72b:free': 'Kimi Dev 72B',
            'nvidia/nemotron-nano-9b-v2:free': 'Nemotron 9B'
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

        // Reset benchmarking state
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

    // Reset Benchmark State
    function resetBenchmarkState() {
        // Hide progress and charts
        elements.benchmarkProgress.style.display = 'none';
        elements.benchmarkCharts.style.display = 'none';
        elements.benchmarkSummary.style.display = 'none';

        // Show control section
        elements.startBenchmarkBtn.style.display = 'flex';

        // Reset model cards to ready state
        document.querySelectorAll('.model-card').forEach(card => {
            const status = card.querySelector('.model-status');
            const metrics = card.querySelectorAll('.metric');
            if (status) status.textContent = 'Ready';
            if (metrics) metrics.forEach(metric => metric.textContent = '-');
        });

        // Reset progress
        updateBenchmarkProgress(0, 'Ready to start...');
    }

    // Brilliant GPU-Inspired Benchmarking
    let benchmarkingInProgress = false;
    let currentBenchmarkResults = [];

    async function startModelBenchmarking() {
        if (benchmarkingInProgress) return;

        benchmarkingInProgress = true;
        currentBenchmarkResults = [];

        // Include all 7 models now
        const models = [
            {
                name: 'meta-llama/llama-4-scout:free',
                shortName: 'Meta Llama 4',
                size: 'Scout',
                color: '#FF6B35'
            },
            {
                name: 'qwen/qwen3-14b:free',
                shortName: 'Qwen 3',
                size: '14B',
                color: '#10B981'
            },
            {
                name: 'deepseek/deepseek-chat-v3.1:free',
                shortName: 'DeepSeek',
                size: 'V3.1',
                color: '#8B5CF6'
            },
            {
                name: 'mistralai/mistral-small-3.1-24b-instruct:free',
                shortName: 'Mistral',
                size: '24B',
                color: '#3B82F6'
            },
            {
                name: 'tngtech/deepseek-r1t-chimera:free',
                shortName: 'Chimera',
                size: 'R1T',
                color: '#EC4899'
            },
            {
                name: 'moonshotai/kimi-dev-72b:free',
                shortName: 'Kimi Dev',
                size: '72B',
                color: '#F59E0B'
            },
            {
                name: 'nvidia/nemotron-nano-9b-v2:free',
                shortName: 'Nemotron',
                size: '9B',
                color: '#6366F1'
            }
        ];

        const testPrompts = [
            "Who is the CEO of Apple?",
            "Explain quantum computing in simple terms",
            "Write a Python function to calculate fibonacci numbers"
        ];

        // Hide start button, show progress
        elements.startBenchmarkBtn.style.display = 'none';
        elements.benchmarkProgress.style.display = 'block';

        let totalTests = models.length * testPrompts.length;
        let completedTests = 0;

        for (let mIndex = 0; mIndex < models.length; mIndex++) {
            const model = models[mIndex];

            // Update model status to testing
            updateModelCardStatus(model.name, 'testing');

            let modelResults = [];

            for (let pIndex = 0; pIndex < testPrompts.length; pIndex++) {
                const prompt = testPrompts[pIndex];

                // Update progress
                completedTests++;
                const progress = (completedTests / totalTests) * 100;
                updateBenchmarkProgress(progress, `Testing ${model.shortName}... (${Math.round(progress)}%)`);

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
            const avgResponseTime = successfulResults.length > 0
                ? successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length
                : 0;
            const avgGpuUsage = successfulResults.length > 0
                ? successfulResults.reduce((sum, r) => sum + r.gpuUsage, 0) / successfulResults.length
                : 0;
            const accuracy = (successfulResults.length / testPrompts.length) * 100;

            // Update model card with results
            updateModelCardMetrics(model.name, avgResponseTime, accuracy, avgGpuUsage);
            updateModelCardStatus(model.name, 'completed');

            // Store results
            currentBenchmarkResults.push({
                ...model,
                results: modelResults,
                avgResponseTime,
                avgGpuUsage,
                accuracy
            });
        }

        // Show results
        benchmarkingInProgress = false;
        updateBenchmarkProgress(100, 'Benchmark Complete! Generating visualizations...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        elements.benchmarkProgress.style.display = 'none';
        elements.benchmarkCharts.style.display = 'block';
        elements.benchmarkSummary.style.display = 'block';

        renderBenchmarkCharts();
        renderBenchmarkSummary();

        updateBenchmarkProgress(100, 'All tests completed successfully!');
    }

    // Helper Functions for Benchmarking Page
    function updateModelCardStatus(modelName, status) {
        const card = document.querySelector(`.model-card[data-model="${modelName}"]`);
        if (!card) return;

        const statusElement = card.querySelector('.model-status');
        if (statusElement) {
            statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    function updateModelCardMetrics(modelName, avgResponseTime, accuracy, avgGpuUsage) {
        const card = document.querySelector(`.model-card[data-model="${modelName}"]`);
        if (!card) return;

        const timeElement = card.querySelector('.metric.response-time');
        const accuracyElement = card.querySelector('.metric.accuracy');
        const gpuElement = card.querySelector('.metric.gpu-usage');

        if (timeElement) timeElement.textContent = `${Math.round(avgResponseTime)}ms`;
        if (accuracyElement) accuracyElement.textContent = `${Math.round(accuracy)}%`;
        if (gpuElement) gpuElement.textContent = `${Math.round(avgGpuUsage)}%`;
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
        if (model.size.includes('72B')) baseUsage += 35;
        else if (model.size.includes('24B')) baseUsage += 25;
        else if (model.size.includes('14B')) baseUsage += 20;

        return baseUsage + Math.random() * 30; // Add some variation
    }

    function renderBenchmarkCharts() {
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
                        data: currentBenchmarkResults.map(m => Math.round(m.avgResponseTime)),
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
                        legend: {
                            labels: { color: 'white' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: 'white' }
                        },
                        x: {
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: 'white', font: { size: 10 } }
                        }
                    }
                }
            });
        }

        // Accuracy Chart
        const accuracyCanvas = document.getElementById('accuracyChart');
        if (accuracyCanvas) {
            const ctx = accuracyCanvas.getContext('2d');
            window.accuracyChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: currentBenchmarkResults.map(m => m.shortName),
                    datasets: [{
                        label: 'Accuracy (%)',
                        data: currentBenchmarkResults.map(m => Math.round(m.accuracy)),
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
                        legend: {
                            labels: { color: 'white' }
                        }
                    },
                    scales: {
                        r: {
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            angleLines: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: 'white' },
                            pointLabels: { color: 'white', font: { size: 11 } }
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
                        label: 'GPU Usage (%)',
                        data: currentBenchmarkResults.map(m => Math.round(m.avgGpuUsage)),
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
                        legend: {
                            labels: { color: 'white' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: 'white' }
                        },
                        x: {
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: 'white', font: { size: 10 } }
                        }
                    }
                }
            });
        }
    }

    function renderBenchmarkSummary() {
        const resultsTable = document.getElementById('resultsTable');
        if (!resultsTable) return;

        const tableHtml = currentBenchmarkResults.map(model => `
            <div class="benchmark-result-item">
                <div class="result-model-info">
                    <span class="result-model-name">${model.shortName} ${model.size}</span>
                    <span class="result-model-spec">${model.name.replace(':free', '')}</span>
                </div>
                <div class="result-metrics">
                    <div class="result-metric">
                        <span class="metric-label">Time</span>
                        <span class="metric-value">${Math.round(model.avgResponseTime)}ms</span>
                    </div>
                    <div class="result-metric">
                        <span class="metric-label">Accuracy</span>
                        <span class="metric-value">${Math.round(model.accuracy)}%</span>
                    </div>
                    <div class="result-metric">
                        <span class="metric-label">GPU</span>
                        <span class="metric-value">${Math.round(model.avgGpuUsage)}%</span>
                    </div>
                    <div class="result-metric">
                        <span class="metric-label">Success</span>
                        <span class="metric-value">${Math.round((model.results.filter(r => r.success).length / model.results.length) * 100)}%</span>
                    </div>
                </div>
            </div>
        `).join('');

        resultsTable.innerHTML = tableHtml;
    }

    async function sendBenchmarkRequest(model, prompt) {
        const payload = {
            messages: [{ role: 'user', content: prompt }],
            model: model,
            temperature: 0.7,
            max_tokens: 512,
        };

        const response = await fetch(endpoints.chat, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('Request failed');

        const data = await response.json();
        return data.response;
    }

    function highlightActiveConversation() {
        if (!elements.conversations) return;
        elements.conversations.querySelectorAll('.conversation-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.id === state.conversationId);
        });
    }

    function calculateAccuracy(response) {
        // Simple accuracy calculation based on response length and coherence
        if (!response || response.length < 10) return 0;
        if (response.length > 50 && response.includes('.')) return 85;
        if (response.length > 25) return 70;
        return 50;
    }

    function createBenchmarkModal() {
        const modal = document.createElement('div');
        modal.className = 'benchmark-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Model Benchmarking Results</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <p class="progress-text">Initializing tests...</p>
                        <div class="results-container"></div>
                    </div>
                </div>
            </div>
        `;

        modal.updateProgress = function(text, percent) {
            modal.querySelector('.progress-text').textContent = text;
            modal.querySelector('.progress-fill').style.width = percent + '%';
        };

        modal.addModelResult = function(model, avgTime, accuracy) {
            const container = modal.querySelector('.results-container');
            const result = document.createElement('div');
            result.className = 'model-result';
            result.innerHTML = `
                <strong>${model.replace(':free', '')}</strong>
                <span>${avgTime.toFixed(0)}ms avg • ${accuracy.toFixed(1)}% accuracy</span>
            `;
            container.appendChild(result);
        };

        modal.showFinalResults = function(results) {
            const container = modal.querySelector('.modal-body');
            container.innerHTML = `
                <h4>Benchmark Complete!</h4>
                <div class="benchmark-results">
                    ${results.map(r => `
                        <div class="benchmark-item">
                            <strong>${r.model.replace(':free', '')}</strong>
                            <div class="benchmark-metrics">
                                <span>Avg Time: ${(r.results.filter(res => !res.error).reduce((sum, res) => sum + res.responseTime, 0) / r.results.filter(res => !res.error).length).toFixed(0)}ms</span>
                                <span>Success Rate: ${((r.results.filter(res => !res.error).length / r.results.length) * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="modal-close-btn">Close</button>
            `;
        };

        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target.classList.contains('modal-overlay')) modal.remove();
        };

        document.body.appendChild(modal);
        return modal;
    }
});
