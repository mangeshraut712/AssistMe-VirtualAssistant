const markedLib = window.marked || null;
const hljsLib = window.hljs || null;
const katexAutoRender = window.renderMathInElement || null;

const STORAGE_KEY = 'assistme.conversations.v2';
const THEME_KEY = 'assistme.theme';
const MODEL_KEY = 'assistme.model';

const API_BASE =
    window.ASSISTME_API_BASE ||
    (location.hostname === 'localhost'
        ? 'http://localhost:8002'
        : 'https://assistme-virtualassistant-production.up.railway.app');

const endpoints = {
    stream: `${API_BASE}/api/chat/stream`,
    chat: `${API_BASE}/api/chat/text`,
    conversations: `${API_BASE}/api/conversations`,
    conversationById: (id) => `${API_BASE}/api/conversations/${id}`,
};

const MODEL_OPTIONS = [
    {
        id: 'google/gemini-2.0-flash-exp:free',
        label: 'Google Gemini 2.0 Flash Experimental',
        hint: 'Google flash tier · multimodal · free',
        context: '1M context',
    },
    {
        id: 'qwen/qwen3-coder:free',
        label: 'Qwen3 Coder 480B A35B',
        hint: 'Alibaba Qwen coder · 480B params',
        context: '262k context',
    },
    {
        id: 'tngtech/deepseek-r1t2-chimera:free',
        label: 'DeepSeek R1T2 Chimera',
        hint: 'TNGTech + DeepSeek hybrid reasoning',
        context: '163k context',
    },
    {
        id: 'microsoft/mai-ds-r1:free',
        label: 'Microsoft MAI DS R1',
        hint: 'Microsoft x DeepSeek research model',
        context: '163k context',
    },
    {
        id: 'openai/gpt-oss-20b:free',
        label: 'OpenAI GPT OSS 20B',
        hint: 'Open-source 20B preview, free tier',
        context: '128k context',
    },
    {
        id: 'z-ai/glm-4.5-air:free',
        label: 'Zhipu GLM 4.5 Air',
        hint: 'Zhipu AI lightweight flagship',
        context: '128k context',
    },
    {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        label: 'Meta Llama 3.3 70B Instruct',
        hint: 'Meta frontier instruct tuning',
        context: '131k context',
    },
    {
        id: 'nvidia/nemotron-nano-9b-v2:free',
        label: 'NVIDIA Nemotron Nano 9B V2',
        hint: 'NVIDIA RAG-ready small model',
        context: '131k context',
    },
    {
        id: 'mistralai/mistral-nemo:free',
        label: 'Mistral Nemo',
        hint: 'Mistral + NVIDIA collaboration',
        context: '128k context',
    },
    {
        id: 'moonshotai/kimi-dev-72b:free',
        label: 'MoonshotAI Kimi Dev 72B',
        hint: 'MoonshotAI developer-tuned',
        context: '128k context',
    },
];

const DEFAULT_MODEL_ID = MODEL_OPTIONS[0]?.id || null;

const elements = {
    app: document.getElementById('app'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    conversationSearch: document.getElementById('conversationSearch'),
    conversations: document.getElementById('conversations'),
    pinnedPrompts: document.getElementById('pinnedPrompts'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    modelSelector: document.getElementById('modelSelector'),
    modelButton: document.getElementById('modelButton'),
    modelDropdown: document.getElementById('modelDropdown'),
    welcomePanel: document.getElementById('welcomePanel'),
    starterGrid: document.getElementById('starterGrid'),
    chatMessages: document.getElementById('chatMessages'),
    chatThread: document.getElementById('chatThread'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),
    inlineSuggestions: document.getElementById('inlineSuggestions'),
    latencyMetric: document.getElementById('latencyMetric'),
    tokenMetric: document.getElementById('tokenMetric'),
    voiceBtn: document.getElementById('voiceBtn'),
    toastContainer: document.getElementById('toastContainer'),
    uploadBtn: document.getElementById('uploadBtn'),
};

const state = {
    conversations: [],
    activeConversation: null,
    currentModel: DEFAULT_MODEL_ID,
    isStreaming: false,
    typingNode: null,
    abortController: null,
    voice: {
        recognition: null,
        listening: false,
        available: false,
    },
};

const ALLOWED_TAGS = new Set([
    'P', 'BR', 'PRE', 'CODE', 'SPAN', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'BLOCKQUOTE',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'
]);

const ALLOWED_ATTRS = {
    A: ['href', 'title', 'target', 'rel'],
    CODE: ['class'],
    PRE: ['class'],
    TH: ['colspan', 'rowspan'],
    TD: ['colspan', 'rowspan'],
};

function sanitizeHtml(html) {
    // First pass: Remove potentially dangerous content
    const sanitizedHtml = html.replace(/<script[^>]*>.*?<\/script>/gi, '')
                               .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
                               .replace(/<object[^>]*>.*?<\/object>/gi, '')
                               .replace(/<embed[^>]*>.*?<\/embed>/gi, '')
                               .replace(/javascript:/gi, '#')
                               .replace(/vbscript:/gi, '#')
                               .replace(/data:(?!image\/(?:png|jpe?g|gif|svg\+xml|webp))(?:[^;]+);/gi, '#');

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHtml, 'text/html');
    if (!doc || !doc.body) {
        return document.createDocumentFragment();
    }

    if (doc.querySelector('parsererror')) {
        return document.createDocumentFragment();
    }

    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
    const toRemove = [];

    while (walker.nextNode()) {
        const element = walker.currentNode;
        const tag = element.tagName;
        if (!ALLOWED_TAGS.has(tag)) {
            toRemove.push(element);
            continue;
        }

        const allowedAttrs = ALLOWED_ATTRS[tag] ?? [];
        Array.from(element.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value;
            const allowed = allowedAttrs.includes(name);
            if (!allowed) {
                element.removeAttribute(attribute.name);
                return;
            }

            if (tag === 'A' && name === 'href') {
                if (!/^https?:/i.test(value)) {
                    element.removeAttribute(attribute.name);
                } else {
                    element.setAttribute('target', '_blank');
                    element.setAttribute('rel', 'noopener noreferrer nofollow');
                }
            }

            if ((tag === 'CODE' || tag === 'PRE') && name === 'class') {
                const languageClasses = value
                    .split(/\s+/)
                    .filter((cls) => cls.startsWith('language-'));
                if (languageClasses.length > 0) {
                    element.className = languageClasses.join(' ');
                } else {
                    element.removeAttribute('class');
                }
            }
        });
    }

    toRemove.forEach((node) => {
        const textNode = doc.createTextNode(node.textContent || '');
        node.replaceWith(textNode);
    });

    const fragment = document.createDocumentFragment();
    while (doc.body.firstChild) {
        fragment.appendChild(doc.body.firstChild);
    }
    return fragment;
}

function renderAssistantContent(target, content) {
    if (!target) return;
    const source = content || '';
    const markdown = markedLib?.parse ? markedLib.parse(source) : source;
    const sanitized = sanitizeHtml(markdown);
    target.replaceChildren();
    target.appendChild(sanitized);

    if (hljsLib?.highlightElement) {
        target.querySelectorAll('pre code').forEach((block) => {
            try {
                hljsLib.highlightElement(block);
            } catch (error) {
                console.warn('Highlighting error', error);
            }
        });
    }

    if (typeof katexAutoRender === 'function') {
        try {
            katexAutoRender(target, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true },
                ],
                throwOnError: false,
            });
        } catch (error) {
            console.warn('Math rendering error', error);
        }
    }
}

function newConversation(modelId = null) {
    const localId = `local-${Date.now()}`;
    return {
        id: localId,
        localId,
        serverId: null,
        title: 'New chat',
        model: modelId ?? state.currentModel ?? null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
    };
}

function saveConversations() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations));
    } catch (error) {
        console.warn('Failed to persist conversations', error);
    }
}

function loadConversations() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (error) {
        console.warn('Failed to load conversations', error);
        return [];
    }
}

function formatRelative(timestamp) {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return Object.prototype.hasOwnProperty.call(map, char) ? map[char] : char;
    });
}

function renderConversations(filterText = '') {
    if (!elements.conversations) return;
    const query = filterText.trim().toLowerCase();
    elements.conversations.replaceChildren();

    const items = state.conversations
        .slice()
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .filter((conversation) => {
            if (!query) return true;
            return conversation.title.toLowerCase().includes(query);
        });

    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'conversation-item';
        empty.textContent = 'No conversations yet. Start a new chat to see history here.';
        empty.style.opacity = '0.65';
        elements.conversations.appendChild(empty);
        return;
    }

    items.forEach((conversation) => {
        const button = document.createElement('button');
        button.className = 'conversation-item';
        if (state.activeConversation && conversation.id === state.activeConversation.id) {
            button.classList.add('active');
        }
        button.dataset.id = conversation.id;

        const title = document.createElement('div');
        title.className = 'conversation-title';
        title.textContent = conversation.title || 'Untitled chat';

        const date = document.createElement('div');
        date.className = 'conversation-date';
        date.textContent = formatRelative(conversation.updatedAt);

        button.appendChild(title);
        button.appendChild(date);
        elements.conversations.appendChild(button);
    });
}

function applyStoredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    syncThemeToggleIcon(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    syncThemeToggleIcon(next);
}

function syncThemeToggleIcon(theme) {
    const icon = elements.themeToggleBtn?.querySelector('i');
    if (!icon) return;
    icon.classList.remove('fa-sun', 'fa-moon');
    icon.classList.add(theme === 'dark' ? 'fa-sun' : 'fa-moon');
}

function resolveModelId(preferredId) {
    if (!preferredId) return DEFAULT_MODEL_ID;
    return MODEL_OPTIONS.some((option) => option.id === preferredId) ? preferredId : DEFAULT_MODEL_ID;
}

function populateModelDropdown() {
    if (!elements.modelDropdown) return;
    elements.modelDropdown.replaceChildren();
    const header = document.createElement('div');
    header.className = 'model-dropdown-header';
    header.textContent = 'Select a model';
    elements.modelDropdown.appendChild(header);

    MODEL_OPTIONS.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'model-option';
        button.type = 'button';
        button.dataset.model = option.id;
        button.setAttribute('role', 'option');
        button.setAttribute('tabindex', '0');
        const isActive = option.id === state.currentModel;
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');

        const title = document.createElement('span');
        title.className = 'model-option-title';
        title.textContent = option.label;

        const desc = document.createElement('span');
        desc.className = 'model-option-desc';
        desc.textContent = option.hint;

        const meta = document.createElement('span');
        meta.className = 'model-option-meta';
        meta.textContent = option.context;

        button.appendChild(title);
        button.appendChild(desc);
        button.appendChild(meta);

        if (isActive) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            setModel(option.id);
            toggleModelDropdown(false);
        });

        elements.modelDropdown.appendChild(button);
    });

    updateModelButton();
    elements.modelDropdown.scrollTop = 0;
}

function updateModelButton() {
    if (!elements.modelButton) return;
    const model = MODEL_OPTIONS.find((entry) => entry.id === state.currentModel) || MODEL_OPTIONS[0];
    const modelName = elements.modelButton.querySelector('.model-name');
    const modelHint = elements.modelButton.querySelector('.model-hint');
    if (modelName) modelName.textContent = model?.label || 'Select a model';
    if (modelHint) modelHint.textContent = model?.hint || 'Pick any model to start chatting';
    if (state.currentModel) {
        localStorage.setItem(MODEL_KEY, state.currentModel);
    }
}

function toggleModelDropdown(forceState) {
    if (!elements.modelDropdown) return;
    const isOpen = typeof forceState === 'boolean'
        ? forceState
        : !elements.modelDropdown.classList.contains('open');
    elements.modelDropdown.classList.toggle('open', isOpen);
    if (elements.modelButton) {
        elements.modelButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    if (isOpen) {
        const targetOption = elements.modelDropdown.querySelector('.model-option.active')
            || elements.modelDropdown.querySelector('.model-option');
        targetOption?.focus();
    } else {
        elements.modelButton?.focus();
    }
}

function setModel(modelId) {
    state.currentModel = resolveModelId(modelId);
    if (state.activeConversation) {
        state.activeConversation.model = state.currentModel;
        if (state.activeConversation.messages.length > 0) {
            persistActiveConversation();
        }
    }
    updateModelButton();
    populateModelDropdown();
    handleInputChange();
}

function handleClickOutside(event) {
    if (elements.modelSelector && !elements.modelSelector.contains(event.target)) {
        toggleModelDropdown(false);
    }
    if (elements.sidebar && !elements.sidebar.contains(event.target) && elements.sidebar.classList.contains('open')) {
        elements.sidebar.classList.remove('open');
    }
}

function ensureConversationVisible() {
    if (elements.welcomePanel) {
        elements.welcomePanel.style.display = 'none';
    }
    if (elements.chatMessages) {
        elements.chatMessages.classList.add('active');
    }
}

function createMessageElement(role) {
    const wrapper = document.createElement('article');
    wrapper.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    const avatarIcon = document.createElement('i');
    avatarIcon.className = role === 'user' ? 'fa-solid fa-user' : 'fa-solid fa-robot';
    avatarIcon.setAttribute('aria-hidden', 'true');
    avatar.appendChild(avatarIcon);

    const content = document.createElement('div');
    content.className = 'message-content';

    const text = document.createElement('div');
    text.className = 'prose';
    content.appendChild(text);

    const metadata = document.createElement('div');
    metadata.className = 'message-metadata';
    metadata.style.display = 'none';
    content.appendChild(metadata);

    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const copyButton = document.createElement('button');
    copyButton.className = 'message-action-btn';
    copyButton.title = 'Copy to clipboard';
    const copyIcon = document.createElement('i');
    copyIcon.className = 'fa-solid fa-copy';
    copyIcon.setAttribute('aria-hidden', 'true');
    copyButton.appendChild(copyIcon);
    copyButton.addEventListener('click', () => {
        navigator.clipboard?.writeText(text.textContent || '')
            .then(() => showToast('Copied to clipboard'))
            .catch(() => showToast('Copy failed', 'error'));
    });
    actions.appendChild(copyButton);

    if (role === 'assistant' && 'speechSynthesis' in window) {
        const speakBtn = document.createElement('button');
        speakBtn.className = 'message-action-btn';
        speakBtn.title = 'Listen to response';
        const speakIcon = document.createElement('i');
        speakIcon.className = 'fa-solid fa-volume-high';
        speakIcon.setAttribute('aria-hidden', 'true');
        speakBtn.appendChild(speakIcon);
        speakBtn.addEventListener('click', () => speakText(text.textContent || ''));
        actions.appendChild(speakBtn);
    }

    content.appendChild(actions);

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);

    elements.chatMessages.appendChild(wrapper);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });

    return { wrapper, text, metadata };
}

function showTypingIndicator() {
    if (!elements.chatMessages) return;
    removeTypingIndicator();

    const container = document.createElement('div');
    container.className = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    const indicatorIcon = document.createElement('i');
    indicatorIcon.className = 'fa-solid fa-robot';
    indicatorIcon.setAttribute('aria-hidden', 'true');
    avatar.appendChild(indicatorIcon);

    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    for (let index = 0; index < 3; index += 1) {
        const dot = document.createElement('span');
        dot.className = 'typing-dot';
        dots.appendChild(dot);
    }

    container.appendChild(avatar);
    container.appendChild(dots);

    elements.chatMessages.appendChild(container);
    container.scrollIntoView({ behavior: 'smooth', block: 'end' });
    state.typingNode = container;
}

function removeTypingIndicator() {
    if (state.typingNode && state.typingNode.parentNode) {
        state.typingNode.parentNode.removeChild(state.typingNode);
    }
    state.typingNode = null;
}

function updateMetrics(latencyMs, tokens) {
    if (elements.latencyMetric) {
        elements.latencyMetric.textContent = latencyMs ? `${Math.round(latencyMs)} ms` : '—';
    }
    if (elements.tokenMetric) {
        elements.tokenMetric.textContent = tokens ? `${tokens} tokens` : '— tokens';
    }
}

function showToast(message, variant = 'info', timeout = 3200) {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${variant}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, timeout);
}

function updateConversationTitle(conversation) {
    if (!conversation) return;
    const firstUser = conversation.messages.find((msg) => msg.role === 'user' && msg.content.trim());
    if (!firstUser) return;
    const text = firstUser.content.trim();
    const normalized = text.replace(/\s+/g, ' ');
    conversation.title = normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
}

function persistActiveConversation() {
    if (!state.activeConversation) return;
    state.activeConversation.updatedAt = Date.now();
    const serialized = JSON.parse(JSON.stringify(state.activeConversation));
    serialized.localId = state.activeConversation.localId || state.activeConversation.id;

    state.conversations = state.conversations.filter((conversation) => {
        if (state.activeConversation.serverId && conversation.serverId === state.activeConversation.serverId) {
            return false;
        }
        if (conversation.id === serialized.id) {
            return false;
        }
        if (serialized.localId && conversation.id === serialized.localId) {
            return false;
        }
        return true;
    });

    state.conversations.unshift(serialized);
    state.conversations = state.conversations.slice(0, 60);
    saveConversations();
    renderConversations(elements.conversationSearch?.value || '');
}

function resetComposer() {
    if (elements.messageInput) {
        elements.messageInput.value = '';
        autoResizeInput();
    }
    if (elements.sendButton) {
        elements.sendButton.classList.add('disabled');
        elements.sendButton.disabled = true;
    }
}

function highlightActiveConversation() {
    if (!elements.conversations) return;
    elements.conversations.querySelectorAll('.conversation-item').forEach((item) => {
        item.classList.toggle('active', state.activeConversation && item.dataset.id === state.activeConversation.id);
    });
}

function setActiveConversation(conversation, { resetView = true } = {}) {
    state.activeConversation = conversation;
    const resolvedModel = resolveModelId(conversation.model || state.currentModel);
    state.currentModel = resolvedModel;
    state.activeConversation.model = resolvedModel;

    if (resetView && elements.chatMessages) {
        elements.chatMessages.replaceChildren();
    }

    removeTypingIndicator();

    if (elements.welcomePanel) {
        elements.welcomePanel.style.display = conversation.messages.length === 0 ? '' : 'none';
    }

    conversation.messages.forEach((message) => {
        const fragment = createMessageElement(message.role);
        if (message.role === 'assistant') {
            renderAssistantContent(fragment.text, message.content);
        } else {
            fragment.text.textContent = message.content;
        }
        if (message.metadata) {
            applyMetadata(fragment.metadata, message.metadata);
        } else {
            fragment.metadata.style.display = 'none';
            fragment.metadata.replaceChildren();
        }
    });

    highlightActiveConversation();
    populateModelDropdown();
    handleInputChange();
}

function applyMetadata(container, metadata) {
    if (!container) return;
    container.replaceChildren();
    const defaults = {
        model: state.currentModel,
        latency: null,
        tokens: null,
    };
    const merged = { ...defaults, ...metadata };
    const entries = [];
    if (merged.model) entries.push({ icon: 'fa-solid fa-robot', text: merged.model });
    if (merged.latency) entries.push({ icon: 'fa-solid fa-gauge-high', text: `${merged.latency} ms` });
    if (merged.tokens) entries.push({ icon: 'fa-solid fa-layer-group', text: `${merged.tokens} tok` });

    if (entries.length === 0) {
        container.style.display = 'none';
        return;
    }

    entries.forEach((entry, index) => {
        if (index > 0) {
            const separator = document.createElement('span');
            separator.className = 'meta-separator';
            separator.textContent = '·';
            container.appendChild(separator);
        }

        const span = document.createElement('span');
        span.className = 'meta-entry';
        const icon = document.createElement('i');
        icon.className = entry.icon;
        icon.setAttribute('aria-hidden', 'true');
        span.appendChild(icon);
        span.appendChild(document.createTextNode(entry.text));
        container.appendChild(span);
    });

    container.style.display = 'flex';
}

function loadConversationFromHistory(conversationId) {
    const target = state.conversations.find((item) => item.id === conversationId);
    if (!target) return;

    if (state.activeConversation && state.activeConversation.messages.length > 0) {
        persistActiveConversation();
    }

    setActiveConversation({ ...target, messages: target.messages.map((msg) => ({ ...msg })) });
}

function autoResizeInput() {
    if (!elements.messageInput) return;
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = `${Math.min(elements.messageInput.scrollHeight, 200)}px`;
}

function handleInputChange() {
    if (!elements.messageInput || !elements.sendButton) return;
    autoResizeInput();
    const hasText = elements.messageInput.value.trim().length > 0;
    const ready = hasText && !state.isStreaming && Boolean(resolveModelId(state.currentModel));
    elements.sendButton.classList.toggle('disabled', !ready);
    elements.sendButton.disabled = !ready;
}

function buildPayloadMessages(conversation, userMessage) {
    if (conversation.serverId) {
        return [userMessage];
    }
    const history = conversation.messages.map((message) => ({
        role: message.role,
        content: message.content,
    }));
    history.push(userMessage);
    return history;
}

async function requestCompletionFallback(userMessage) {
    if (!state.activeConversation) return null;
    state.currentModel = resolveModelId(state.currentModel);

    const payload = {
        messages: buildPayloadMessages(state.activeConversation, userMessage),
        model: state.currentModel,
    };

    if (state.activeConversation.serverId) {
        payload.conversation_id = state.activeConversation.serverId;
    }

    const response = await fetch(endpoints.chat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
    }
    if (data?.error) {
        throw new Error(data.error);
    }
    return data;
}

async function streamAssistantResponse(userMessage) {
    if (!state.activeConversation) return;
    state.currentModel = resolveModelId(state.currentModel);

    const payload = {
        messages: buildPayloadMessages(state.activeConversation, userMessage),
        model: state.currentModel,
    };

    if (state.activeConversation.serverId) {
        payload.conversation_id = state.activeConversation.serverId;
    }

    console.log('Sending request to:', endpoints.stream);
    console.log('Payload:', payload);

    const controller = new AbortController();
    state.abortController = controller;
    state.isStreaming = true;
    handleInputChange();
    showTypingIndicator();

    const assistantMessage = {
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        metadata: { model: state.currentModel },
    };
    state.activeConversation.messages.push(assistantMessage);
    const assistantFragment = createMessageElement('assistant');

    const started = performance.now();
    let tokensUsed = null;

    try {
        const response = await fetch(endpoints.stream, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Streaming not supported in this browser');

        const decoder = new TextDecoder();
        let buffer = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let boundary;
            while ((boundary = buffer.indexOf('\n\n')) >= 0) {
                const rawEvent = buffer.slice(0, boundary);
                buffer = buffer.slice(boundary + 2);
                const parsed = parseSseEvent(rawEvent);
                if (!parsed) continue;

                if (parsed.event === 'delta' && parsed.data?.content) {
                    assistantMessage.content += parsed.data.content;
                    assistantFragment.text.textContent = assistantMessage.content;
                }

                if (parsed.event === 'error') {
                    throw new Error(parsed.data?.message || 'Streaming failed');
                }

                if (parsed.event === 'done') {
                    assistantMessage.content = parsed.data?.response || assistantMessage.content;
                    assistantFragment.text.textContent = assistantMessage.content;
                    tokensUsed = parsed.data?.tokens || null;
                    const conversationId = parsed.data?.conversation_id;
                    if (typeof conversationId === 'number' && conversationId > 0) {
                        state.activeConversation.localId = state.activeConversation.localId || state.activeConversation.id;
                        state.activeConversation.serverId = conversationId;
                        state.activeConversation.id = `server-${conversationId}`;
                    }
                    const providedTitle = parsed.data?.title;
                    if (providedTitle) {
                        state.activeConversation.title = providedTitle;
                    } else {
                        updateConversationTitle(state.activeConversation);
                    }
                }
            }
        }

        const latency = Math.round(performance.now() - started);
        assistantMessage.metadata = {
            model: state.currentModel,
            latency,
            tokens: tokensUsed,
        };

        renderAssistantContent(assistantFragment.text, assistantMessage.content);

        applyMetadata(assistantFragment.metadata, assistantMessage.metadata);
        updateMetrics(latency, tokensUsed);

        ensureConversationVisible();
        removeTypingIndicator();
        state.isStreaming = false;
        handleInputChange();
        persistActiveConversation();
    } catch (error) {
        console.error(error);
        removeTypingIndicator();

        let fallbackData = null;
        try {
            fallbackData = await requestCompletionFallback(userMessage);
        } catch (fallbackError) {
            console.warn('Fallback completion failed', fallbackError);
        }

        if (fallbackData?.response) {
            assistantMessage.content = fallbackData.response;
            assistantFragment.text.textContent = assistantMessage.content;
            tokensUsed = fallbackData?.usage?.tokens || null;
            const conversationId = fallbackData?.conversation_id;
            if (typeof conversationId === 'number' && conversationId > 0) {
                state.activeConversation.localId = state.activeConversation.localId || state.activeConversation.id;
                state.activeConversation.serverId = conversationId;
                state.activeConversation.id = `server-${conversationId}`;
            }
            if (fallbackData?.title) {
                state.activeConversation.title = fallbackData.title;
            } else {
                updateConversationTitle(state.activeConversation);
            }
            const latency = Math.round(performance.now() - started);
            assistantMessage.metadata = {
                model: state.currentModel,
                latency,
                tokens: tokensUsed,
            };
            renderAssistantContent(assistantFragment.text, assistantMessage.content);
            applyMetadata(assistantFragment.metadata, assistantMessage.metadata);
            updateMetrics(latency, tokensUsed);
            ensureConversationVisible();
            state.isStreaming = false;
            handleInputChange();
            persistActiveConversation();
            return;
        }

        state.isStreaming = false;
        handleInputChange();
        assistantMessage.content = 'I hit an error while responding. Please try again.';
        assistantFragment.text.textContent = assistantMessage.content;
        showToast(error.message || 'Something went wrong', 'error');
        updateMetrics(null, null);
        persistActiveConversation();
    }
}

function parseSseEvent(rawEvent) {
    if (!rawEvent) return null;
    const lines = rawEvent.split('\n');
    let eventName = 'message';
    let dataPayload = '';
    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('event:')) {
            eventName = trimmed.slice(6).trim();
        } else if (trimmed.startsWith('data:')) {
            dataPayload += trimmed.slice(5).trim();
        }
    });

    try {
        return { event: eventName, data: dataPayload ? JSON.parse(dataPayload) : null };
    } catch (error) {
        console.warn('Failed to parse SSE payload', dataPayload, error);
        return { event: eventName, data: null };
    }
}

async function handleSend() {
    if (!elements.messageInput || !state.activeConversation || state.isStreaming) return;
    state.currentModel = resolveModelId(state.currentModel);
    const text = elements.messageInput.value.trim();
    if (!text) return;

    ensureConversationVisible();
    resetComposer();

    const userMessage = {
        role: 'user',
        content: text,
        createdAt: Date.now(),
    };

    state.activeConversation.messages.push(userMessage);
    const fragment = createMessageElement('user');
    fragment.text.textContent = text;

    persistActiveConversation();

    await streamAssistantResponse({ role: 'user', content: text });
}

function handleNewChat() {
    if (state.activeConversation && state.activeConversation.messages.length > 0) {
        persistActiveConversation();
    }
    const conversation = newConversation();
    setActiveConversation(conversation);
    highlightActiveConversation();
    resetComposer();
    if (elements.welcomePanel) {
        elements.welcomePanel.style.display = '';
    }
}

function handleConversationClick(event) {
    const button = event.target.closest('.conversation-item');
    if (!button || !button.dataset.id) return;
    if (state.activeConversation && button.dataset.id === state.activeConversation.id) return;
    loadConversationFromHistory(button.dataset.id);
}

function handleSuggestionClick(prompt) {
    if (!elements.messageInput) return;
    elements.messageInput.value = prompt;
    handleInputChange();
    handleSend();
}

function toggleSidebar() {
    if (!elements.sidebar) return;
    elements.sidebar.classList.toggle('open');
}

function initInlineHandlers() {
    elements.newChatBtn?.addEventListener('click', handleNewChat);
    elements.sidebarToggle?.addEventListener('click', toggleSidebar);
    elements.sidebarCloseBtn?.addEventListener('click', toggleSidebar);
    elements.themeToggleBtn?.addEventListener('click', toggleTheme);
    elements.conversationSearch?.addEventListener('input', (event) => {
        renderConversations(event.target.value);
    });

    elements.clearHistoryBtn?.addEventListener('click', () => {
        const confirmClear = window.confirm('Clear all saved conversations from this device?');
        if (!confirmClear) return;
        state.conversations = [];
        saveConversations();
        renderConversations();
        showToast('Conversation history cleared', 'info');
    });

    if (elements.sendButton) {
        elements.sendButton.addEventListener('click', handleSend);
    }

    if (elements.messageInput) {
        elements.messageInput.addEventListener('input', handleInputChange);
        elements.messageInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
            }
        });
    }

    elements.modelButton?.addEventListener('click', () => toggleModelDropdown());
    elements.benchmarkBtn?.addEventListener('click', () => window.open('https://github.com/mangeshraut712/AssistMe-VirtualAssistant/tree/main/docs', '_blank'));
    elements.docsBtn?.addEventListener('click', () => window.open('https://github.com/mangeshraut712/AssistMe-VirtualAssistant', '_blank'));

    elements.conversations?.addEventListener('click', handleConversationClick);

    elements.inlineSuggestions?.addEventListener('click', (event) => {
        const pill = event.target.closest('.suggestion-pill');
        if (!pill?.dataset.prompt) return;
        handleSuggestionClick(pill.dataset.prompt);
    });

    elements.starterGrid?.addEventListener('click', (event) => {
        const card = event.target.closest('.welcome-card');
        if (!card?.dataset.prompt) return;
        handleSuggestionClick(card.dataset.prompt);
    });

    elements.pinnedPrompts?.addEventListener('click', (event) => {
        const pin = event.target.closest('.pinned-item');
        if (!pin?.dataset.prompt) return;
        handleSuggestionClick(pin.dataset.prompt);
    });

    elements.voiceBtn?.addEventListener('click', toggleVoiceInput);
    elements.uploadBtn?.addEventListener('click', () => showToast('File uploads are coming soon.', 'info'));

    document.addEventListener('click', handleClickOutside);
}

function initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !elements.voiceBtn) {
        if (elements.voiceBtn) {
            elements.voiceBtn.disabled = true;
            elements.voiceBtn.title = 'Voice input not supported by this browser';
        }
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener('start', () => {
        state.voice.listening = true;
        elements.voiceBtn?.classList.add('listening');
        showToast('Listening...', 'info', 2000);
    });

    recognition.addEventListener('end', () => {
        state.voice.listening = false;
        elements.voiceBtn?.classList.remove('listening');
    });

    recognition.addEventListener('result', (event) => {
        const transcript = Array.from(event.results)
            .map((result) => result[0]?.transcript || '')
            .join(' ')
            .trim();
        if (!transcript) return;
        elements.messageInput.value = transcript;
        handleInputChange();
    });

    recognition.addEventListener('error', (event) => {
        state.voice.listening = false;
        elements.voiceBtn?.classList.remove('listening');
        showToast(`Voice input error: ${event.error}`, 'error');
    });

    state.voice.recognition = recognition;
    state.voice.available = true;
}

function toggleVoiceInput() {
    if (!state.voice.available || !state.voice.recognition) return;
    if (state.voice.listening) {
        state.voice.recognition.stop();
    } else {
        try {
            state.voice.recognition.start();
        } catch (error) {
            console.warn('Voice recognition error', error);
        }
    }
}

function speakText(text) {
    if (!text || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function restoreInitialState() {
    applyStoredTheme();
    const storedModel = localStorage.getItem(MODEL_KEY);

    // Clear any invalid models from cache (force refresh of model selection)
    const validModels = MODEL_OPTIONS.map(m => m.id);
    if (storedModel && !validModels.includes(storedModel)) {
        console.log('Clearing invalid cached model:', storedModel);
        localStorage.removeItem(MODEL_KEY);
    }

    state.currentModel = resolveModelId(storedModel);

    populateModelDropdown();

    state.conversations = loadConversations().map((conversation) => {
        const localId = conversation.localId
            || (conversation.serverId ? `server-${conversation.serverId}` : conversation.id);
        return {
            ...conversation,
            localId,
            model: resolveModelId(conversation.model),
            messages: Array.isArray(conversation.messages)
                ? conversation.messages
                : [],
        };
    });
    renderConversations();

    const freshConversation = newConversation(state.currentModel);
    setActiveConversation(freshConversation);
    updateMetrics(null, null);
    handleInputChange();
}

async function bootstrap() {
    restoreInitialState();
    initInlineHandlers();
    initVoice();
    await preloadServerConversations();
}

async function preloadServerConversations() {
    try {
        const response = await fetch(endpoints.conversations, { method: 'GET' });
        if (!response.ok) return;
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) return;

        const serverConvos = await Promise.all(
            data.slice(0, 10).map(async (conversation) => {
                if (!conversation?.id) return null;
                try {
                    const detailRes = await fetch(endpoints.conversationById(conversation.id));
                    if (!detailRes.ok) return null;
                    const detail = await detailRes.json();
                    return {
                        id: `server-${conversation.id}`,
                        serverId: conversation.id,
                        title: conversation.title || 'Untitled chat',
                        model: state.currentModel,
                        createdAt: new Date(conversation.created_at).getTime(),
                        updatedAt: new Date(conversation.created_at).getTime(),
                        messages: (detail.messages || []).map((message) => ({
                            role: message.role,
                            content: message.content,
                            createdAt: new Date(message.created_at).getTime(),
                        })),
                    };
                } catch (error) {
                    console.warn('Failed to load conversation', conversation.id, error);
                    return null;
                }
            })
        );

        const filtered = serverConvos.filter(Boolean);
        if (filtered.length > 0) {
            const localIds = new Set(state.conversations.map((item) => item.id));
            filtered.forEach((conversation) => {
                if (!localIds.has(conversation.id)) {
                    state.conversations.push(conversation);
                }
            });
            renderConversations(elements.conversationSearch?.value || '');
            saveConversations();
        }
    } catch (error) {
        console.warn('Conversation preload failed', error);
    }
}

bootstrap();

if (markedLib && typeof markedLib.setOptions === 'function') {
    markedLib.setOptions({
        gfm: true,
        breaks: true,
        mangle: false,
        headerIds: false,
        highlight(code, lang) {
            if (hljsLib?.getLanguage && lang && hljsLib.getLanguage(lang)) {
                return hljsLib.highlight(code, { language: lang }).value;
            }
            if (hljsLib?.highlightAuto) {
                try {
                    return hljsLib.highlightAuto(code).value;
                } catch (error) {
                    console.warn('Highlight failed', error);
                }
            }
            return code;
        },
    });
}
