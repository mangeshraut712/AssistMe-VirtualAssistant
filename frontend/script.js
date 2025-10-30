const markedLib = window.marked || null;
const hljsLib = window.hljs || null;
const katexAutoRender = window.renderMathInElement || null;
const dompurifyLib = window.DOMPurify || null;

const STORAGE_KEY = 'assistme.conversations.v2';
const THEME_KEY = 'assistme.theme';
const MODEL_KEY = 'assistme.model';
const PREFS_KEY = 'assistme.preferences.v1';
const RAG_KEY = 'assistme.rag.enabled';

function loadJsonFromStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
        return fallback;
    } catch (error) {
        console.warn(`Failed to parse storage key ${key}`, error);
        return fallback;
    }
}

function saveJsonToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to persist storage key ${key}`, error);
    }
}

const initialPreferences = loadJsonFromStorage(PREFS_KEY, {
    style: 'Concise, code-heavy answers',
    language: 'en',
    voice: 'alloy',
    persona: 'Mangesh-mode: precise, pragmatic, engineer-friendly.',
});

function loadRagPreference() {
    const stored = localStorage.getItem(RAG_KEY);
    if (stored === null) {
        return true;
    }
    return stored === 'true';
}

// Device detection
const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Suppress browser extension errors in console
window.addEventListener('error', function(e) {
    // Ignore chrome extension errors
    if (e.filename && e.filename.includes('chrome-extension://')) {
        e.preventDefault();
        return false;
    }
    // Ignore QuillBot extension errors
    if (e.filename && e.filename.includes('quillbot-content.js')) {
        e.preventDefault();
        return false;
    }
    // Ignore other extension errors
    if (e.message && (e.message.includes('extension') || e.message.includes('contentScript'))) {
        e.preventDefault();
        return false;
    }
}, true);

// Suppress unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && e.reason.message && 
        (e.reason.message.includes('extension') || 
         e.reason.message.includes('No resume URL') ||
         e.reason.message.includes('chrome-extension'))) {
        e.preventDefault();
        return false;
    }
});

function resolveApiBase() {
    // Always prefer localhost when detected
    const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname);
    if (isLocalHost) {
        return 'http://localhost:8001';
    }

    // Check if explicitly set via window
    if (window.ASSISTME_API_BASE) {
        return window.ASSISTME_API_BASE;
    }

    // Try meta tag
    const meta = document.querySelector('meta[name="assistme-api-base"]');
    const metaContent = meta?.content?.trim();
    if (metaContent) {
        return metaContent;
    }

    return 'https://assistme-virtualassistant-production.up.railway.app';
}

const API_BASE = resolveApiBase();

function getNow() {
    return Date.now();
}

function updateSendButtonState() {
    if (!elements.sendButton) return;

    const resolvedModel = resolveModelId(state.currentModel);
    if (resolvedModel !== state.currentModel) {
        state.currentModel = resolvedModel;
    }
    const hasModel = Boolean(resolvedModel);
    const now = getNow();

    if (!state.composer.focusLock && state.composer.focusLockGrace !== null && now > state.composer.focusLockGrace) {
        state.composer.focusLockGrace = null;
    }

    // Keep the send button active during brief focus transitions (dropdowns, clicks, etc.)
    const focusGraceActive = state.composer.focusLock
        || (state.composer.focusLockGrace !== null && now < state.composer.focusLockGrace);

    const composerActive = state.composer.focused || focusGraceActive;
    const canSend = hasModel && state.composer.hasText && !state.isStreaming && composerActive;

    if (state.composer.canSend === canSend && elements.sendButton.disabled === !canSend) {
        return;
    }

    state.composer.canSend = canSend;
    elements.sendButton.disabled = !canSend;
    elements.sendButton.classList.toggle('disabled', !canSend);
    elements.sendButton.setAttribute('aria-disabled', canSend ? 'false' : 'true');
}

const endpoints = {
    stream: `${API_BASE}/api/chat/stream`,
    chat: `${API_BASE}/api/chat/text`,
    uploads: `${API_BASE}/api/files/upload`,
    conversations: `${API_BASE}/api/conversations`,
    conversationById: (id) => `${API_BASE}/api/conversations/${id}`,
    agentPlan: `${API_BASE}/api/agent/plan`,
    multimodal: `${API_BASE}/api/multimodal/generate`,
    ragQuery: `${API_BASE}/api/rag/query`,
    contextCompress: `${API_BASE}/api/context/compress`,
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
    {
        id: 'minimax/minimax-m2',
        label: 'MiniMax M2',
        hint: 'MiniMax M2 · voice-optimized',
        context: 'Unlimited context',
    },
];

const BENCHMARK_SCENARIOS = {
    general: {
        label: 'General Q&A',
        description: 'Balanced prompts covering product questions, support triage, and structured summaries. Measures first-token latency and sustained throughput across 256-token completions.',
        command: 'assistme-bench run --scenario general --output logs/general.json',
        accelerators: [
            '1 × NVIDIA A100 80GB · 75% GPU util · 175 tok/s sustained',
            '1 × NVIDIA H100 80GB · 85% GPU util · 215 tok/s sustained',
            '2 × RTX 4090 · tensor parallel · 160 tok/s sustained'
        ],
        models: [
            {
                id: 'google/gemini-2.0-flash-exp:free',
                latency: '0.82 s',
                throughput: '180 tok/s',
                context: '1M tokens',
                bestFor: 'Multimodal answers & snippets',
                accelerator: 'A100 80GB'
            },
            {
                id: 'meta-llama/llama-3.3-70b-instruct:free',
                latency: '1.14 s',
                throughput: '142 tok/s',
                context: '131k tokens',
                bestFor: 'Structured responses',
                accelerator: 'H100 80GB'
            },
            {
                id: 'z-ai/glm-4.5-air:free',
                latency: '0.96 s',
                throughput: '128 tok/s',
                context: '128k tokens',
                bestFor: 'Low-cost multilingual',
                accelerator: 'RTX 4090'
            }
        ]
    },
    coding: {
        label: 'Coding & reasoning',
        description: 'Stress test long-reasoning traces, code review, and unit test generation. Includes adversarial math + tool-use prompts.',
        command: 'assistme-bench run --scenario coding --trace --compare --accelerator H100',
        accelerators: [
            '1 × NVIDIA H100 80GB · bf16 · 185 tok/s with streaming',
            '1 × NVIDIA A100 40GB · fp16 · 128 tok/s',
            '2 × NVIDIA L40S · tensor parallel · 150 tok/s'
        ],
        models: [
            {
                id: 'qwen/qwen3-coder:free',
                latency: '1.06 s',
                throughput: '168 tok/s',
                context: '262k tokens',
                bestFor: 'Code generation & debug',
                accelerator: 'H100 80GB'
            },
            {
                id: 'tngtech/deepseek-r1t2-chimera:free',
                latency: '1.22 s',
                throughput: '150 tok/s',
                context: '163k tokens',
                bestFor: 'Chain-of-thought reasoning',
                accelerator: 'A100 80GB'
            },
            {
                id: 'openai/gpt-oss-20b:free',
                latency: '0.94 s',
                throughput: '132 tok/s',
                context: '128k tokens',
                bestFor: 'Lightweight OSS baseline',
                accelerator: 'L40S'
            }
        ]
    },
    creative: {
        label: 'Creative writing',
        description: 'Evaluates story continuity, tone matching, and multilingual output with 512-token completions.',
        command: 'assistme-bench run --scenario creative --duration 300 --accelerator A100',
        accelerators: [
            '1 × NVIDIA A100 80GB · fp16 · 140 tok/s',
            '1 × NVIDIA H100 80GB · fp8 · 195 tok/s',
            '1 × RTX 6000 Ada · fp16 · 110 tok/s'
        ],
        models: [
            {
                id: 'moonshotai/kimi-dev-72b:free',
                latency: '1.35 s',
                throughput: '138 tok/s',
                context: '128k tokens',
                bestFor: 'Narrative tone & long form',
                accelerator: 'A100 80GB'
            },
            {
                id: 'mistralai/mistral-nemo:free',
                latency: '1.02 s',
                throughput: '152 tok/s',
                context: '128k tokens',
                bestFor: 'Creative ideation',
                accelerator: 'L40S'
            },
            {
                id: 'google/gemini-2.0-flash-exp:free',
                latency: '0.88 s',
                throughput: '176 tok/s',
                context: '1M tokens',
                bestFor: 'Storyboarding & imagery cues',
                accelerator: 'H100 80GB'
            }
        ]
    }
};

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
    workspace: document.getElementById('workspace'),
    assistantStatus: document.getElementById('assistantStatus'),
    statusDot: document.querySelector('#assistantStatus .status-dot'),
    statusText: document.querySelector('#assistantStatus span:nth-of-type(2)'),
    messageInput: document.getElementById('messageInput'),
    composer: document.getElementById('composer'),
    sendButton: document.getElementById('sendButton'),
    composerQuick: document.getElementById('composerQuick'),
    benchmarkBtn: document.getElementById('benchmarkBtn'),
    benchmarkModal: document.getElementById('benchmarkModal'),
    benchmarkBackdrop: document.getElementById('benchmarkBackdrop'),
    benchmarkClose: document.getElementById('benchmarkClose'),
    benchmarkTabs: document.getElementById('benchmarkTabs'),
    benchmarkTableBody: document.getElementById('benchmarkTableBody'),
    benchmarkDescription: document.getElementById('benchmarkDescription'),
    benchmarkCommand: document.getElementById('benchmarkCommand'),
    benchmarkCopy: document.getElementById('benchmarkCopy'),
    benchmarkAccelerators: document.getElementById('benchmarkAccelerators'),
    inlineSuggestions: document.getElementById('inlineSuggestions'),
    latencyMetric: document.getElementById('latencyMetric'),
    tokenMetric: document.getElementById('tokenMetric'),
    voiceBtn: document.getElementById('voiceBtn'),
    voiceModeBtn: document.getElementById('voiceModeBtn'),
    toastContainer: document.getElementById('toastContainer'),
    uploadBtn: document.getElementById('uploadBtn'),
    uploadInput: null,
    connectionStatus: document.getElementById('connectionStatus'),
    connectionStatusText: document.getElementById('connectionStatusText'),
    agentPlanBtn: document.getElementById('agentPlanBtn'),
    ragToggle: document.getElementById('ragToggle'),
    ragCheckbox: document.getElementById('ragCheckbox'),
    agentPanel: document.getElementById('agentPanel'),
    settingsModal: document.getElementById('settingsModal'),
    settingsBackdrop: document.getElementById('settingsBackdrop'),
    settingsClose: document.getElementById('settingsClose'),
    preferenceForm: document.getElementById('preferenceForm'),
    preferenceLanguage: document.getElementById('preferenceLanguage'),
    preferenceStyle: document.getElementById('preferenceStyle'),
    preferenceVoice: document.getElementById('preferenceVoice'),
    preferencePersona: document.getElementById('preferencePersona'),
    preferenceSave: document.getElementById('preferenceSave'),
};

// Connection status helper
function showConnectionStatus(status, message) {
    if (!elements.connectionStatus || !elements.connectionStatusText) return;
    
    elements.connectionStatus.className = 'connection-status show ' + status;
    elements.connectionStatusText.textContent = message;
    
    // Auto-hide after 3 seconds for success messages
    if (status === 'connected') {
        setTimeout(() => {
            elements.connectionStatus.classList.remove('show');
        }, 3000);
    }
}

const state = {
    conversations: [],
    activeConversation: null,
    currentModel: DEFAULT_MODEL_ID,
    backendHealthy: null,
    isStreaming: false,
    typingNode: null,
    abortController: null,
    useRag: loadRagPreference(),
    preferences: { ...initialPreferences },
    lastAgentPlan: null,
    voice: {
        recognition: null,
        listening: false,
        available: false,
        configured: true,
        lastNotice: null,
    },
    pendingUploads: [],
    inputHistory: {
        items: [],
        index: -1,
    },
    activeBenchmarkScenario: 'general',
    composer: {
        focused: false,
        hasText: false,
        lastValue: '',
        trimmedValue: '',
        canSend: false,
        focusLock: false,
        focusLockGrace: null,
        isComposing: false,
    },
};

function savePreferences() {
    saveJsonToStorage(PREFS_KEY, state.preferences);
}

function applyPreferencesToUI() {
    if (elements.preferenceLanguage) {
        elements.preferenceLanguage.value = state.preferences.language || '';
    }
    if (elements.preferenceStyle) {
        elements.preferenceStyle.value = state.preferences.style || '';
    }
    if (elements.preferenceVoice) {
        elements.preferenceVoice.value = state.preferences.voice || '';
    }
    if (elements.preferencePersona) {
        elements.preferencePersona.value = state.preferences.persona || '';
    }
    if (elements.ragCheckbox) {
        elements.ragCheckbox.checked = !!state.useRag;
    }
}

function mergePreferences(preferences = {}) {
    if (!preferences || typeof preferences !== 'object') return;
    const merged = { ...state.preferences };
    const safeKeys = ['style', 'language', 'voice', 'persona', 'custom'];
    safeKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(preferences, key)) {
            const value = preferences[key];
            if (typeof value !== 'undefined') {
                merged[key] = value;
            }
        }
    });
    state.preferences = merged;
    savePreferences();
    applyPreferencesToUI();
}

function updateRagPreference(enabled) {
    state.useRag = Boolean(enabled);
    localStorage.setItem(RAG_KEY, state.useRag ? 'true' : 'false');
    if (elements.ragCheckbox) {
        elements.ragCheckbox.checked = state.useRag;
    }
    showToast(state.useRag ? 'Grounding enabled with Grokipedia' : 'Grounding disabled', 'info', 2400);
}

function getLastUserPrompt() {
    if (!state.activeConversation) return '';
    const history = [...state.activeConversation.messages].reverse();
    const last = history.find((message) => message.role === 'user' && message.content?.trim());
    return last ? last.content.trim() : '';
}

function applyPayloadPreferences(payload) {
    payload.use_rag = Boolean(state.useRag);
    if (state.preferences && Object.keys(state.preferences).length > 0) {
        payload.user_preferences = { ...state.preferences };
    }
}

function detectComposerCommand(text) {
    if (!text) return null;
    const trimmed = text.trim();
    if (trimmed.startsWith('/image ')) {
        return { type: 'image', prompt: trimmed.slice(7).trim() };
    }
    if (trimmed.startsWith('/video ')) {
        return { type: 'video', prompt: trimmed.slice(7).trim() };
    }
    if (trimmed.startsWith('/speech ')) {
        return { type: 'speech', prompt: trimmed.slice(8).trim() };
    }
    if (trimmed === '/compress') {
        return { type: 'compress', prompt: '' };
    }
    if (trimmed.startsWith('/compress ')) {
        return { type: 'compress', prompt: trimmed.slice(10).trim() };
    }
    if (trimmed === '/plan') {
        return { type: 'plan' };
    }
    if (trimmed.startsWith('/plan ')) {
        return { type: 'plan', prompt: trimmed.slice(6).trim() };
    }
    return null;
}

const ALLOWED_TAGS = new Set([
    'P', 'BR', 'PRE', 'CODE', 'SPAN', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'BLOCKQUOTE',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'
]);

const EMPTY_ATTRS = Object.freeze([]);
const ANCHOR_ATTRS = Object.freeze(['href', 'title', 'target', 'rel']);
const CODE_ATTRS = Object.freeze(['class']);
const TABLE_HEADER_ATTRS = Object.freeze(['colspan', 'rowspan']);
const TABLE_CELL_ATTRS = Object.freeze(['colspan', 'rowspan']);
const HEALTH_POLL_INTERVAL_MS = 30000;
let healthPollTimer = null;
let composerAutofocusInitialized = false;

const backendHealth = {
    setStatus(isHealthy, message) {
        const healthy = Boolean(isHealthy);
        state.backendHealthy = healthy;

        if (!healthy) {
            disableVoiceModeUi('Backend offline');
        }

        const statusContainer = elements.assistantStatus;
        const statusDot = elements.statusDot;
        const statusText = elements.statusText;

        statusContainer?.classList.toggle('status-online', healthy);
        statusContainer?.classList.toggle('status-offline', !healthy);

        statusDot?.classList.toggle('online', healthy);
        statusDot?.classList.toggle('offline', !healthy);

        if (statusText) {
            const fallback = healthy ? 'Online' : 'Offline';
            statusText.textContent = (typeof message === 'string' && message.trim())
                ? message.trim()
                : fallback;
        }

        // Show connection status
        if (healthy) {
            showConnectionStatus('connected', '✓ Connected to backend');
        } else {
            showConnectionStatus('error', '✗ Backend offline');
        }
    },
    async check() {
        showConnectionStatus('connecting', 'Connecting to backend...');
        
        try {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeoutId = controller ? window.setTimeout(() => controller.abort(), 5000) : null;

            const response = await fetch(`${API_BASE}/health`, {
                method: 'GET',
                headers: { Accept: 'application/json' },
                signal: controller?.signal,
            });

            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json().catch(() => ({}));
            const healthy = (data?.status || '').toLowerCase() === 'ok';
            const message = healthy ? 'Online' : (data?.message || 'Unavailable');
            this.setStatus(healthy, message);
            return healthy;
        } catch (error) {
            console.warn('Health check failed', error);
            this.setStatus(false, 'Offline');
            return false;
        }
    },
};

const composerAutofocus = {
    init() {
        if (composerAutofocusInitialized || !elements.messageInput) return;

        const applyFocus = () => {
            focusMessageInput();
            updateSendButtonState();
        };

        if (document.hasFocus()) {
            applyFocus();
        } else {
            const handleWindowFocus = () => {
                applyFocus();
            };
            const handleVisibility = () => {
                if (document.visibilityState === 'visible') {
                    applyFocus();
                }
            };
            window.addEventListener('focus', handleWindowFocus, { once: true });
            document.addEventListener('visibilitychange', handleVisibility, { once: true });
        }

        composerAutofocusInitialized = true;
    },
};


function getAllowedAttributes(tag) {
    switch (tag) {
        case 'A':
            return ANCHOR_ATTRS;
        case 'CODE':
        case 'PRE':
            return CODE_ATTRS;
        case 'TH':
            return TABLE_HEADER_ATTRS;
        case 'TD':
            return TABLE_CELL_ATTRS;
        default:
            return EMPTY_ATTRS;
    }
}

function sanitizeHtml(html) {
    if (typeof html !== 'string' || html.trim() === '') {
        return document.createDocumentFragment();
    }

    // Use DOMPurify if available, fallback to basic parser-based sanitization
    if (dompurifyLib?.sanitize) {
        // Validate and sanitize the HTML content with strict options
        const sanitized = dompurifyLib.sanitize(html, {
            ALLOWED_TAGS: Array.from(ALLOWED_TAGS),
            ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'colspan', 'rowspan'],
            ALLOW_DATA_ATTR: false,
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style', 'link'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'oninput', 'onchange'],
            SANITIZE_DOM: false,
            RETURN_DOM_FRAGMENT: true,
            IN_PLACE: false,
        });
        return sanitized;
    }

    // Fallback implementation if DOMPurify is not available
    const sanitizedInput = html.replace(/<(\/?)(script|iframe|object|embed|style|link)\b[^>]*>/gi, '');
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedInput, 'text/html');
    if (!doc?.body || doc.querySelector('parsererror')) {
        return document.createDocumentFragment();
    }

    // Remove explicitly dangerous nodes up-front
    doc.querySelectorAll('script, iframe, object, embed, style, link').forEach((node) => node.remove());

    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
    const nodesToStrip = [];

    while (walker.nextNode()) {
        const element = walker.currentNode;
        const tag = element.tagName;
        if (!ALLOWED_TAGS.has(tag)) {
            nodesToStrip.push(element);
            continue;
        }

        const allowedAttrs = getAllowedAttributes(tag);
        Array.from(element.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value || '';
            const allowed = allowedAttrs.includes(name);
            if (!allowed) {
                element.removeAttribute(attribute.name);
                return;
            }

            if (tag === 'A' && name === 'href') {
                if (!/^(https?:|mailto:|tel:)/i.test(value)) {
                    element.removeAttribute(attribute.name);
                    return;
                }
                element.setAttribute('target', '_blank');
                element.setAttribute('rel', 'noopener noreferrer nofollow');
            }

            if (tag === 'A' && name === 'target' && value !== '_blank') {
                element.setAttribute('target', '_blank');
            }

            if (tag === 'A' && name === 'rel') {
                element.setAttribute('rel', 'noopener noreferrer nofollow');
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

    nodesToStrip.forEach((node) => {
        const textNode = doc.createTextNode(node.textContent || '');
        node.replaceWith(textNode);
    });

    const fragment = document.createDocumentFragment();
    while (doc.body.firstChild) {
        fragment.appendChild(doc.body.firstChild);
    }
    return fragment;
}

function getSafeArrayItem(list, index) {
    if (!Array.isArray(list)) {
        return undefined;
    }
    if (!Number.isInteger(index)) {
        return undefined;
    }
    if (index < 0 || index >= list.length) {
        return undefined;
    }
    // Defensive copy/array access pattern to avoid prototype pollution
    return list.slice(index, index + 1)[0];
}

function focusMessageInput() {
    if (!elements.messageInput) return;
    requestAnimationFrame(() => {
        if (!elements.messageInput) return;
        elements.messageInput.focus({ preventScroll: true });
        try {
            const length = elements.messageInput.value.length;
            elements.messageInput.setSelectionRange(length, length);
        } catch {
            // setSelectionRange may fail on some platforms; safe to ignore
        }
    });
}



function ensureHealthMonitoring() {
    if (healthPollTimer !== null) {
        return;
    }
    healthPollTimer = window.setInterval(() => {
        // Ignore result; status updates handled inside backendHealth.check
        backendHealth.check().catch(() => {});
    }, HEALTH_POLL_INTERVAL_MS);
}

function generateOfflineResponse(prompt) {
    const text = (prompt || '').trim();
    if (!text) {
        const fallback = "I'm in offline preview mode right now. Once the AssistMe backend reconnects I'll be able to fetch live answers again.";
        return { response: fallback, tokens: fallback.split(/\s+/).length };
    }

    const lower = text.toLowerCase();
    let response;

    if (lower.includes('hello') || lower.includes('hi')) {
        response = "Hello there! I'm running in offline preview mode, so this response is simulated. Try again soon for a live answer.";
    } else if (lower.includes('code') || lower.includes('python') || lower.includes('bug')) {
        response = "I'm currently offline, but here’s a quick tip: break the problem down, add logging, and once the backend is back you'll get full diagnostic help.";
    } else if (lower.includes('help') || lower.includes('support')) {
        response = "I've noted your request. While I'm offline you'll see a concise preview reply, and when AssistMe reconnects you'll receive a detailed answer.";
    } else {
        response = `I'm offline right now, so this is a lightweight preview response. Once AssistMe reconnects, I'll provide a complete answer to: "${text}".`;
    }

    return {
        response,
        tokens: response.split(/\s+/).length,
    };
}

function pushInputHistory(value) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const history = state.inputHistory;
    if (history.items[0] === trimmed) {
        history.index = -1;
        return;
    }
    history.items.unshift(trimmed);
    if (history.items.length > 50) {
        history.items.pop();
    }
    history.index = -1;
}

function recallHistory(direction) {
    if (!elements.messageInput) return;
    const history = state.inputHistory;
    const items = history.items;
    if (!Array.isArray(items) || items.length === 0) return;

    if (direction === 'up') {
        const nextIndex = history.index + 1;
        const candidate = getSafeArrayItem(items, nextIndex);
        if (typeof candidate === 'undefined') return;
        history.index = nextIndex;
        elements.messageInput.value = String(candidate ?? '');
    } else {
        if (history.index <= 0) {
            history.index = -1;
            elements.messageInput.value = '';
        } else {
            history.index -= 1;
            const candidate = getSafeArrayItem(items, history.index);
            elements.messageInput.value = String(candidate ?? '');
        }
    }
    autoResizeInput();
    handleInputChange();
    focusMessageInput();
}

function wrapSelection(textarea, prefix, suffix, placeholder = '') {
    const { selectionStart, selectionEnd, value } = textarea;
    const hasSelection = selectionStart !== selectionEnd;
    const selected = value.slice(selectionStart, selectionEnd);
    const content = hasSelection ? selected : placeholder;
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    const newValue = `${before}${prefix}${content}${suffix}${after}`;
    const cursorStart = before.length + prefix.length;
    const cursorEnd = cursorStart + content.length;
    textarea.value = newValue;
    textarea.setSelectionRange(cursorStart, cursorEnd);
}

function applyFormatAction(format) {
    if (!elements.messageInput) return;
    const textarea = elements.messageInput;

    if (format === 'clear') {
        textarea.value = '';
        state.inputHistory.index = -1;
        handleInputChange();
        focusMessageInput();
        return;
    }

    if (format === 'bold') {
        wrapSelection(textarea, '**', '**', 'bold text');
    } else if (format === 'italic') {
        wrapSelection(textarea, '_', '_', 'italic text');
    } else if (format === 'code') {
        const { selectionStart, selectionEnd, value } = textarea;
        const selected = value.slice(selectionStart, selectionEnd);
        if (selected.includes('\n')) {
            wrapSelection(textarea, '```\n', '\n```', selected || 'code block');
        } else {
            wrapSelection(textarea, '`', '`', selected || 'code');
        }
    }

    handleInputChange();
    focusMessageInput();
}

function getModelLabel(modelId) {
    const match = MODEL_OPTIONS.find((model) => model.id === modelId);
    return match ? match.label : modelId;
}

function getBenchmarkScenario(key) {
    if (typeof key !== 'string' || !key) return null;
    const scenarioEntry = Object.entries(BENCHMARK_SCENARIOS).find(([id]) => id === key);
    return scenarioEntry ? scenarioEntry[1] : null;
}

function renderBenchmarkScenario(scenarioKey) {
    const scenario = getBenchmarkScenario(scenarioKey);
    if (!scenario || !elements.benchmarkTableBody) return;

    const safeKey = String(scenarioKey);
    state.activeBenchmarkScenario = safeKey;

    if (elements.benchmarkTabs) {
        elements.benchmarkTabs.querySelectorAll('.benchmark-tab').forEach((tab) => {
            const isActive = tab.dataset.scenario === safeKey;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    if (elements.benchmarkDescription) {
        elements.benchmarkDescription.textContent = scenario.description;
    }

    elements.benchmarkTableBody.replaceChildren();
    scenario.models.forEach((entry, index) => {
        const row = document.createElement('tr');
        if (index === 0) {
            row.classList.add('top-performer');
        }

        // Safe DOM creation to avoid XSS
        const modelNameCell = document.createElement('td');
        modelNameCell.className = 'model-name';
        modelNameCell.textContent = getModelLabel(entry.id);

        const latencyCell = document.createElement('td');
        latencyCell.textContent = entry.latency;

        const throughputCell = document.createElement('td');
        throughputCell.textContent = entry.throughput;

        const contextCell = document.createElement('td');
        contextCell.textContent = entry.context;

        const bestForCell = document.createElement('td');
        bestForCell.textContent = entry.bestFor;

        const acceleratorCell = document.createElement('td');
        acceleratorCell.textContent = entry.accelerator;

        row.appendChild(modelNameCell);
        row.appendChild(latencyCell);
        row.appendChild(throughputCell);
        row.appendChild(contextCell);
        row.appendChild(bestForCell);
        row.appendChild(acceleratorCell);

        elements.benchmarkTableBody.appendChild(row);
    });

    if (elements.benchmarkCommand) {
        elements.benchmarkCommand.textContent = scenario.command;
    }

    if (elements.benchmarkAccelerators) {
        elements.benchmarkAccelerators.replaceChildren();
        scenario.accelerators.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item;
            elements.benchmarkAccelerators.appendChild(li);
        });
    }
}

function openBenchmarkModal() {
    if (!elements.benchmarkModal) return;
    elements.benchmarkModal.classList.add('open');
    elements.benchmarkModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    renderBenchmarkScenario(state.activeBenchmarkScenario || 'general');
    const focusTarget = elements.benchmarkClose || elements.benchmarkModal.querySelector('button');
    focusTarget?.focus({ preventScroll: true });
}

function closeBenchmarkModal() {
    if (!elements.benchmarkModal) return;
    elements.benchmarkModal.classList.remove('open');
    elements.benchmarkModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    elements.benchmarkBtn?.focus({ preventScroll: true });
}

function handleBenchmarkScenarioClick(event) {
    const button = event.target.closest('.benchmark-tab');
    if (!button?.dataset.scenario) return;
    if (button.dataset.scenario === state.activeBenchmarkScenario) return;
    renderBenchmarkScenario(button.dataset.scenario);
}

async function copyBenchmarkCommand() {
    if (!elements.benchmarkCommand) return;
    const command = elements.benchmarkCommand.textContent || '';
    if (!command.trim()) return;
    try {
        await navigator.clipboard?.writeText(command.trim());
        showToast('Benchmark command copied to clipboard', 'success');
    } catch (error) {
        console.warn('Clipboard copy failed', error);
        showToast('Unable to copy command. Press ⌘/Ctrl + C instead.', 'error');
    }
}

function isBenchmarkModalOpen() {
    return Boolean(elements.benchmarkModal?.classList.contains('open'));
}

function handleGlobalKeydown(event) {
    if (event.key === 'Escape' && isBenchmarkModalOpen()) {
        event.preventDefault();
        closeBenchmarkModal();
    }
    if (event.key === 'Escape' && elements.settingsModal?.classList.contains('open')) {
        event.preventDefault();
        closeSettingsModal();
    }
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

function attachRagReferences(wrapper, documents) {
    if (!wrapper || !Array.isArray(documents) || documents.length === 0) return;
    const existing = wrapper.querySelector('.rag-context');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.className = 'rag-context';

    const title = document.createElement('strong');
    title.textContent = 'Grounded context';
    container.appendChild(title);

    const list = document.createElement('ol');
    list.className = 'rag-list';
    documents.forEach((doc) => {
        const item = document.createElement('li');
        const heading = document.createElement('span');
        heading.className = 'rag-heading';
        heading.textContent = doc.title || 'Context snippet';

        const summary = document.createElement('small');
        summary.textContent = doc.summary || doc.content?.slice(0, 160) || '';

        item.appendChild(heading);
        if (summary.textContent) {
            item.appendChild(document.createElement('br'));
            item.appendChild(summary);
        }
        list.appendChild(item);
    });

    container.appendChild(list);
    wrapper.appendChild(container);
}

function attachMediaContent(wrapper, media) {
    if (!wrapper || !media) return;
    const mediaItems = Array.isArray(media) ? media : [media];
    if (mediaItems.length === 0) return;

    let container = wrapper.querySelector('.message-media');
    if (!container) {
        container = document.createElement('div');
        container.className = 'message-media';
        wrapper.appendChild(container);
    }

    container.replaceChildren();

    mediaItems.forEach((item) => {
        if (!item || !item.type) return;
        if (item.type === 'image' && item.b64) {
            const img = document.createElement('img');
            img.src = `data:image/${item.format || 'png'};base64,${item.b64}`;
            img.alt = item.prompt || 'Generated image';
            img.loading = 'lazy';
            container.appendChild(img);
        } else if (item.type === 'speech' && item.b64) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = `data:audio/${item.format || 'mp3'};base64,${item.b64}`;
            container.appendChild(audio);
        } else if (item.type === 'video') {
            const info = document.createElement('div');
            info.className = 'media-status';
            info.textContent = `Video request queued (id: ${item.id || 'pending'})`;
            container.appendChild(info);
        }
    });
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

// eslint-disable-next-line no-unused-vars
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => {
        switch (char) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            case "'":
                return '&#39;';
            default:
                return char;
        }
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
        focusMessageInput();
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
    focusMessageInput();
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

function ensureUploadInput() {
    if (elements.uploadInput) {
        return elements.uploadInput;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '';
    input.style.display = 'none';

    input.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        await handleFileUpload(files);
        input.value = '';
    });

    document.body.appendChild(input);
    elements.uploadInput = input;
    return input;
}

function describeUploadSummary(summary) {
    const parts = [summary.filename];
    if (summary.sizeLabel) parts.push(summary.sizeLabel);
    if (summary.contentType) parts.push(summary.contentType);
    return parts.join(' · ');
}

function prefabUploadMessage(summaries) {
    const lines = summaries.map((item, index) => `${index + 1}. ${describeUploadSummary(item)}`);
    return `📎 Uploaded files:\n${lines.join('\n')}`;
}

function renderUploadedMedia(container, mediaItems) {
    if (!mediaItems || !mediaItems.length) return;
    const messageMedia = container.querySelector('.message-media') || (() => {
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'message-media';
        container.appendChild(mediaDiv);
        return mediaDiv;
    })();

    mediaItems.forEach((media) => {
        if (!media || !media.type) return;

        if (media.type === 'image' && media.b64) {
            const img = document.createElement('img');
            img.src = `data:image/${media.format || 'png'};base64,${media.b64}`;
            img.alt = media.filename || 'Uploaded image';
            img.loading = 'lazy';
            messageMedia.appendChild(img);
        } else if (media.type === 'speech' && media.b64) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = `data:audio/${media.format || 'mp3'};base64,${media.b64}`;
            messageMedia.appendChild(audio);
        } else {
            const linkContainer = document.createElement('div');
            linkContainer.className = 'uploaded-file-link';
            const link = document.createElement('a');
            link.textContent = media.filename || 'Download file';
            link.href = media.url || '#';
            link.target = '_blank';
            link.rel = 'noopener';
            linkContainer.appendChild(link);
            if (media.note) {
                const note = document.createElement('div');
                note.className = 'upload-note';
                note.textContent = media.note;
                linkContainer.appendChild(note);
            }
            messageMedia.appendChild(linkContainer);
        }
    });
}

async function handleFileUpload(files) {
    if (!files || !files.length) return;
    if (state.isStreaming) {
        showToast('Please wait for the current response to finish before uploading.', 'warning');
        return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    showToast(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`, 'info', 2000);

    let responsePayload = null;
    try {
        const response = await fetch(endpoints.uploads, {
            method: 'POST',
            body: formData,
        });
        responsePayload = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(responsePayload?.detail || responsePayload?.error || `HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('File upload failed:', error);
        showToast(error.message || 'File upload failed', 'error');
        return;
    }

    const summaries = responsePayload?.attachments || [];
    const mediaItems = responsePayload?.media || [];
    const acknowledgement = responsePayload?.message || prefabUploadMessage(summaries);

    const userFragment = createMessageElement('user');
    userFragment.text.textContent = prefabUploadMessage(summaries);
    state.activeConversation = state.activeConversation || newConversation(state.currentModel);
    state.activeConversation.messages.push({
        role: 'user',
        content: prefabUploadMessage(summaries),
        createdAt: Date.now(),
        metadata: { upload: true, attachments: summaries },
    });

    const assistantFragment = createMessageElement('assistant');
    renderAssistantContent(assistantFragment.text, acknowledgement);
    if (mediaItems.length) {
        renderUploadedMedia(assistantFragment.text, mediaItems);
    }

    const responseMetadata = {
        model: responsePayload?.model || 'minimax/minimax-m2',
        attachments: summaries,
        media: mediaItems,
    };
    applyMetadata(assistantFragment.metadata, responseMetadata);

    state.activeConversation.messages.push({
        role: 'assistant',
        content: acknowledgement,
        createdAt: Date.now(),
        metadata: responseMetadata,
    });

    persistActiveConversation();
    ensureConversationVisible();
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    showToast('Upload complete!', 'success');
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
    state.inputHistory.index = -1;
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
            if (message.metadata?.ragDocuments) {
                attachRagReferences(fragment.text, message.metadata.ragDocuments);
            }
            if (message.metadata?.media) {
                attachMediaContent(fragment.text, message.metadata.media);
            }
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
    focusMessageInput();
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
    if (typeof merged.confidence === 'number') {
        const pct = Math.round(merged.confidence * 100);
        entries.push({ icon: 'fa-solid fa-wave-square', text: `${pct}% confidence` });
    }
    if (merged.voice) {
        entries.push({ icon: 'fa-solid fa-microphone-lines', text: merged.voice });
    }
    if (merged.compression) entries.push({ icon: 'fa-solid fa-file-zipper', text: String(merged.compression) });
    if (Array.isArray(merged.ragDocuments) && merged.ragDocuments.length > 0) {
        entries.push({ icon: 'fa-solid fa-bookmark', text: `RAG ×${merged.ragDocuments.length}` });
    }
    if (merged.agent) {
        entries.push({ icon: 'fa-solid fa-list-check', text: 'Agent plan' });
    }
    if (merged.media) {
        const mediaItems = Array.isArray(merged.media) ? merged.media : [merged.media];
        const summary = mediaItems.map((item) => item.type).filter(Boolean).join(', ');
        if (summary) {
            entries.push({ icon: 'fa-solid fa-photo-film', text: summary });
        }
    }

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
    if (!elements.messageInput || !elements.sendButton) {
        console.warn('messageInput or sendButton not found');
        return;
    }

    autoResizeInput();

    // Ensure textarea is editable and visible
    elements.messageInput.disabled = false;
    elements.messageInput.style.pointerEvents = 'auto';
    elements.messageInput.style.opacity = '1';
    elements.messageInput.style.display = 'block';
    elements.messageInput.removeAttribute('readonly');

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

function resolveActiveModel() {
    const conversationModel = state.activeConversation?.model;
    const resolved = resolveModelId(conversationModel || state.currentModel);
    state.currentModel = resolved;
    if (state.activeConversation) {
        state.activeConversation.model = resolved;
    }
    return resolved;
}

async function requestCompletionFallback(userMessage) {
    if (!state.activeConversation) return null;
    const modelId = resolveActiveModel();

    const payload = {
        messages: buildPayloadMessages(state.activeConversation, userMessage),
        model: modelId,
    };

    if (state.activeConversation.serverId) {
        payload.conversation_id = state.activeConversation.serverId;
    }

    applyPayloadPreferences(payload);

    applyPayloadPreferences(payload);

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
    backendHealth.setStatus(true);
    return data;
}

async function streamAssistantResponse(userMessage) {
    if (!state.activeConversation) return;
    const modelId = resolveActiveModel();

    const payload = {
        messages: buildPayloadMessages(state.activeConversation, userMessage),
        model: modelId,
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
        metadata: { model: modelId },
    };
    state.activeConversation.messages.push(assistantMessage);
    const assistantFragment = createMessageElement('assistant');

    const started = performance.now();
    let tokensUsed = null;
    let effectiveModel = modelId;
    let ragDocs = null;
    let preferenceSnapshot = null;

    if (state.backendHealthy === false) {
        const recovered = await backendHealth.check();
        if (recovered) {
            state.backendHealthy = true;
        }
    }

    if (state.backendHealthy === false) {
        const offline = generateOfflineResponse(userMessage.content);
        assistantMessage.content = offline.response;
        assistantFragment.text.textContent = assistantMessage.content;
        const latency = Math.round(performance.now() - started);
        assistantMessage.metadata = {
            model: `${modelId || 'offline/mock'}`,
            latency,
            tokens: offline.tokens,
        };
        applyMetadata(assistantFragment.metadata, assistantMessage.metadata);
        updateMetrics(latency, offline.tokens);
        ensureConversationVisible();
        removeTypingIndicator();
        state.isStreaming = false;
        handleInputChange();
        persistActiveConversation();
        focusMessageInput();
        return;
    }

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

        backendHealth.setStatus(true);

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Streaming not supported in this browser');

        const decoder = new TextDecoder();
        let buffer = '';

        const processBuffer = () => {
            let boundaryIndex = buffer.indexOf('\n\n');
            let boundaryLength = 2;

            if (boundaryIndex < 0) {
                boundaryIndex = buffer.indexOf('\r\n\r\n');
                boundaryLength = 4;
            }

            while (boundaryIndex >= 0) {
                const rawEvent = buffer.slice(0, boundaryIndex);
                buffer = buffer.slice(boundaryIndex + boundaryLength);
                console.log('Raw SSE event:', rawEvent); // Debug SSE events
                const parsed = parseSseEvent(rawEvent);
                if (parsed) {
                    if (parsed.event === 'delta' && parsed.data?.content) {
                        assistantMessage.content += parsed.data.content;
                        // Batch DOM updates for better performance (update every 50ms)
                        if (!assistantFragment.updateTimer) {
                            assistantFragment.updateTimer = setTimeout(() => {
                                assistantFragment.text.textContent = assistantMessage.content;
                                assistantFragment.updateTimer = null;
                            }, 50);
                        }
                    }

                    if (parsed.event === 'error') {
                        throw new Error(parsed.data?.message || 'Streaming failed');
                    }

                    if (parsed.event === 'done') {
                        console.log('Stream done, final data:', parsed.data); // Debug final data
                        assistantMessage.content = parsed.data?.response || assistantMessage.content;
                        assistantFragment.text.textContent = assistantMessage.content;
                        tokensUsed = parsed.data?.tokens || null;
                        if (parsed.data?.model) {
                            effectiveModel = parsed.data.model;
                        }
                        if (parsed.data?.notice) {
                            showToast(parsed.data.notice, 'info');
                        }
                        if (parsed.data?.rag?.documents) {
                            ragDocs = parsed.data.rag.documents;
                        }
                        if (parsed.data?.preferences) {
                            preferenceSnapshot = parsed.data.preferences;
                        }
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

                boundaryIndex = buffer.indexOf('\n\n');
                boundaryLength = 2;
                if (boundaryIndex < 0) {
                    boundaryIndex = buffer.indexOf('\r\n\r\n');
                    boundaryLength = 4;
                }
            }
        };

        let streamComplete = false;
        while (!streamComplete) {
            const { value, done } = await reader.read();
            if (done) {
                streamComplete = true;
            } else if (value) {
                buffer += decoder.decode(value, { stream: true });
            }
            processBuffer();
        }

        buffer += decoder.decode();
        processBuffer();

        if (buffer.trim()) {
            const parsed = parseSseEvent(buffer);
            if (parsed?.event === 'delta' && parsed.data?.content) {
                assistantMessage.content += parsed.data.content;
                assistantFragment.text.textContent = assistantMessage.content;
            } else if (parsed?.event === 'done') {
                assistantMessage.content = parsed.data?.response || assistantMessage.content;
                assistantFragment.text.textContent = assistantMessage.content;
                tokensUsed = parsed.data?.tokens || null;
                if (parsed.data?.model) {
                    effectiveModel = parsed.data.model;
                }
                if (parsed.data?.notice) {
                    showToast(parsed.data.notice, 'info');
                }
                if (parsed.data?.rag?.documents) {
                    ragDocs = parsed.data.rag.documents;
                }
                if (parsed.data?.preferences) {
                    preferenceSnapshot = parsed.data.preferences;
                }
            }
            buffer = '';
        }

        const latency = Math.round(performance.now() - started);
        assistantMessage.metadata = {
            model: effectiveModel,
            latency,
            tokens: tokensUsed,
        };
        if (ragDocs && ragDocs.length) {
            assistantMessage.metadata.ragDocuments = ragDocs;
        }

        if (preferenceSnapshot) {
            mergePreferences(preferenceSnapshot);
        }

        // Ensure content is displayed even if empty
        if (!assistantMessage.content || assistantMessage.content.trim() === '') {
            assistantMessage.content = '(No response generated - please try again)';
            console.warn('Empty response received from model:', effectiveModel);
        }

        renderAssistantContent(assistantFragment.text, assistantMessage.content);

        if (assistantMessage.metadata.ragDocuments) {
            attachRagReferences(assistantFragment.text, assistantMessage.metadata.ragDocuments);
        }

        if (assistantMessage.metadata.media) {
            attachMediaContent(assistantFragment.text, assistantMessage.metadata.media);
        }

        applyMetadata(assistantFragment.metadata, assistantMessage.metadata);
        updateMetrics(latency, tokensUsed);

        ensureConversationVisible();
        removeTypingIndicator();
        state.isStreaming = false;
        handleInputChange();
        persistActiveConversation();
        focusMessageInput();
    } catch (error) {
        console.error('Streaming error:', error);
        removeTypingIndicator();
        state.isStreaming = false;
        handleInputChange();

        if (error.name === 'AbortError') {
            console.log('Streaming aborted by user');
            // If we have partial content, keep it
            if (assistantMessage.content && assistantMessage.content.trim()) {
                console.log('Keeping partial response:', assistantMessage.content);
                renderAssistantContent(assistantFragment.text, assistantMessage.content);
                const latency = Math.round(performance.now() - started);
                assistantMessage.metadata = {
                    model: effectiveModel,
                    latency,
                    tokens: tokensUsed,
                };
                applyMetadata(assistantFragment.metadata, assistantMessage.metadata);
                updateMetrics(latency, tokensUsed);
                persistActiveConversation();
            }
            return;
        }

        backendHealth.setStatus(false, 'AssistMe backend is unreachable. Using preview responses.');

        // If we have partial content from before error, show it with error note
        if (assistantMessage.content && assistantMessage.content.trim()) {
            assistantMessage.content += `\n\n⚠️ (Stream interrupted: ${error.message || 'Unknown error'})`;
            renderAssistantContent(assistantFragment.text, assistantMessage.content);
            const latency = Math.round(performance.now() - started);
            assistantMessage.metadata = {
                model: effectiveModel,
                latency,
                tokens: tokensUsed,
            };
            applyMetadata(assistantFragment.metadata, assistantMessage.metadata);
            updateMetrics(latency, tokensUsed);
            persistActiveConversation();
            focusMessageInput();
            return;
        }

        // Try fallback
        let fallbackData = null;
        try {
            fallbackData = await requestCompletionFallback(userMessage);
        } catch (fallbackError) {
            console.warn('Fallback completion failed', fallbackError);
        }

        if (fallbackData?.response) {
            assistantMessage.content = fallbackData.response;
            renderAssistantContent(assistantFragment.text, assistantMessage.content);
            tokensUsed = fallbackData?.usage?.tokens || null;
            if (fallbackData?.notice) {
                showToast(fallbackData.notice, 'info');
            }
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
                model: fallbackData?.model || modelId,
                latency,
                tokens: tokensUsed,
            };
            if (fallbackData?.rag?.documents) {
                assistantMessage.metadata.ragDocuments = fallbackData.rag.documents;
            }
            if (fallbackData?.preferences) {
                mergePreferences(fallbackData.preferences);
            }
            if (assistantMessage.metadata.ragDocuments) {
                attachRagReferences(assistantFragment.text, assistantMessage.metadata.ragDocuments);
            }
            applyMetadata(assistantFragment.metadata, assistantMessage.metadata);
            updateMetrics(latency, tokensUsed);
            ensureConversationVisible();
            persistActiveConversation();
            focusMessageInput();
            return;
        }

        // Final fallback to offline response
        assistantMessage.content = `⚠️ Error: ${error.message || 'Unknown error'}`;
        renderAssistantContent(assistantFragment.text, assistantMessage.content);
        
        const latency = Math.round(performance.now() - started);
        assistantMessage.metadata = {
            model: effectiveModel,
            latency,
            tokens: tokensUsed,
        };
        applyMetadata(assistantFragment.metadata, assistantMessage.metadata);
        updateMetrics(latency, tokensUsed);
        persistActiveConversation();
        focusMessageInput();
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
    const rawValue = elements.messageInput.value;
    const text = rawValue.trim();
    if (!text) return;

    pushInputHistory(rawValue);
    ensureConversationVisible();
    resetComposer();
    focusMessageInput();

    const userMessage = {
        role: 'user',
        content: text,
        createdAt: Date.now(),
    };

    state.activeConversation.messages.push(userMessage);
    const fragment = createMessageElement('user');
    fragment.text.textContent = text;

    persistActiveConversation();

    const command = detectComposerCommand(text);
    if (command) {
        await handleComposerCommand(command, userMessage);
        return;
    }

    await streamAssistantResponse({ role: 'user', content: text });
}

async function handleComposerCommand(command, userMessage) {
    if (!state.activeConversation) return;
    if (['image', 'video', 'speech'].includes(command.type)) {
        await handleMultimodalCommand(command);
        return;
    }
    if (command.type === 'compress') {
        await handleCompressCommand(command.prompt);
        return;
    }
    if (command.type === 'plan') {
        await triggerAgentPlan(command.prompt || '', { fromCommand: true });
        return;
    }
    await streamAssistantResponse(userMessage);
}

async function handleMultimodalCommand(command) {
    if (!state.activeConversation) return;
    const prompt = command.prompt || getLastUserPrompt();
    if (!prompt) {
        showToast('Provide a prompt for multimodal generation.', 'info');
        return;
    }

    const started = performance.now();
    state.isStreaming = true;
    handleInputChange();
    showTypingIndicator();

    const assistantMessage = {
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        metadata: { model: 'MiniMax multimodal', media: [] },
    };
    state.activeConversation.messages.push(assistantMessage);
    const fragment = createMessageElement('assistant');

    try {
        const payload = {
            type: command.type,
            prompt,
            text: prompt,
            options: {},
        };
        const response = await fetch(endpoints.multimodal, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.detail || data?.error || `HTTP ${response.status}`);
        }

        let mediaMeta = null;
        let summary = '';

        if (command.type === 'image') {
            summary = `Generated image with ${data.model || 'MiniMax Image-01'} (${data.size || '1024x1024'}).`;
            mediaMeta = {
                type: 'image',
                b64: data.b64,
                format: (data.size && data.size.includes('512')) ? 'png' : 'png',
                prompt,
            };
            assistantMessage.metadata.model = data.model || 'MiniMax/Image-01';
        } else if (command.type === 'video') {
            summary = `Video request queued (${data.id || 'pending'}). Status: ${data.status || 'queued'}.`;
            mediaMeta = {
                type: 'video',
                id: data.id,
                status: data.status,
                prompt,
            };
            assistantMessage.metadata.model = data.model || 'MiniMax/Hailuo-02';
        } else if (command.type === 'speech') {
            summary = 'Speech synthesis ready below. Use the audio player to preview.';
            mediaMeta = {
                type: 'speech',
                b64: data.b64,
                format: data.format || 'mp3',
                prompt,
            };
            assistantMessage.metadata.model = data.voice || 'MiniMax/Speech-02';
        }

        assistantMessage.content = summary || 'Multimodal response ready.';
        if (mediaMeta) {
            assistantMessage.metadata.media = mediaMeta;
        }
        renderAssistantContent(fragment.text, assistantMessage.content);
        if (assistantMessage.metadata.media) {
            attachMediaContent(fragment.text, assistantMessage.metadata.media);
        }

        const latency = Math.round(performance.now() - started);
        assistantMessage.metadata.latency = latency;
        applyMetadata(fragment.metadata, assistantMessage.metadata);
        showToast('Multimodal request completed', 'success');
    } catch (error) {
        assistantMessage.content = `⚠️ Multimodal request failed: ${error.message || 'Unknown error'}`;
        renderAssistantContent(fragment.text, assistantMessage.content);
        assistantMessage.metadata.model = 'multimodal/error';
        applyMetadata(fragment.metadata, assistantMessage.metadata);
        showToast(error.message || 'Multimodal request failed', 'error');
    } finally {
        removeTypingIndicator();
        state.isStreaming = false;
        handleInputChange();
        persistActiveConversation();
    }
}

async function handleCompressCommand(textPayload) {
    if (!state.activeConversation) return;
    const explicitText = (textPayload || '').trim();
    const sourceText = explicitText || getLastUserPrompt();
    if (!sourceText) {
        showToast('Provide text after /compress or send a message to compress.', 'info');
        return;
    }

    const started = performance.now();
    state.isStreaming = true;
    handleInputChange();
    showTypingIndicator();

    const assistantMessage = {
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        metadata: { model: 'context-compression' },
    };
    state.activeConversation.messages.push(assistantMessage);
    const fragment = createMessageElement('assistant');

    try {
        const payload = {
            text: sourceText,
        };

        const response = await fetch(endpoints.contextCompress, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.detail || data?.error || `HTTP ${response.status}`);
        }

        const pages = Array.isArray(data.pages) ? data.pages : [];
        const pageCount = pages.length;
        const summary = pageCount > 0
            ? `Compressed ${sourceText.length.toLocaleString()} characters into ${pageCount} page${pageCount === 1 ? '' : 's'} for vision models.`
            : 'No pages were generated for the provided text.';

        assistantMessage.content = summary;
        assistantMessage.metadata = {
            model: 'context-compression',
            latency: Math.round(performance.now() - started),
            compression: pageCount ? `${pageCount} page${pageCount === 1 ? '' : 's'}` : 'no pages',
            media: pages.map((page, index) => ({
                type: 'image',
                b64: page.image_b64,
                format: 'png',
                prompt: `Compressed page ${index + 1}`,
                width: page.width,
                height: page.height,
            })),
            originalChars: sourceText.length,
        };

        renderAssistantContent(fragment.text, assistantMessage.content);
        if (assistantMessage.metadata.media) {
            attachMediaContent(fragment.text, assistantMessage.metadata.media);
        }
        applyMetadata(fragment.metadata, assistantMessage.metadata);
        showToast('Context compressed into image pages.', 'success', 2600);
    } catch (error) {
        assistantMessage.content = `⚠️ Compression failed: ${error.message || 'Unknown error'}`;
        assistantMessage.metadata = {
            model: 'context-compression',
        };
        renderAssistantContent(fragment.text, assistantMessage.content);
        applyMetadata(fragment.metadata, assistantMessage.metadata);
        showToast(error.message || 'Compression failed', 'error');
    } finally {
        removeTypingIndicator();
        state.isStreaming = false;
        handleInputChange();
        persistActiveConversation();
    }
}

function formatAgentPlanMarkdown(result) {
    const sections = [];
    if (result?.output) {
        sections.push(result.output.trim());
    }
    if (Array.isArray(result?.intermediate_steps) && result.intermediate_steps.length > 0) {
        const steps = result.intermediate_steps
            .map((entry, index) => {
                const [action, observation] = entry;
                const tool = action?.tool ? ` (${action.tool})` : '';
                const input = typeof action?.tool_input === 'string' ? action.tool_input : JSON.stringify(action?.tool_input);
                return `${index + 1}. **${action?.log || 'Action'}${tool}:** ${input}\n   → ${observation || 'No observation recorded.'}`;
            })
            .join('\n');
        sections.push(`#### Agent trace\n${steps}`);
    }
    return `### Planner Output\n${sections.join('\n\n')}`;
}

function renderAgentPanel(result) {
    if (!elements.agentPanel) return;
    if (!result) {
        elements.agentPanel.replaceChildren();
        return;
    }
    const container = document.createElement('div');
    container.className = 'agent-plan-card';
    const heading = document.createElement('strong');
    heading.textContent = 'Latest plan';
    container.appendChild(heading);

    const summary = document.createElement('p');
    summary.textContent = (result.output || '').split('\n')[0] || 'No plan generated yet.';
    container.appendChild(summary);

    if (Array.isArray(result.intermediate_steps) && result.intermediate_steps.length > 0) {
        const footnote = document.createElement('small');
        footnote.textContent = `${result.intermediate_steps.length} tool calls in trace`;
        container.appendChild(footnote);
    }

    elements.agentPanel.replaceChildren(container);
}

async function triggerAgentPlan(promptOverride, options = {}) {
    if (!state.activeConversation) {
        showToast('Start a conversation before requesting a plan.', 'info');
        return;
    }

    const basePrompt = promptOverride || elements.messageInput?.value || getLastUserPrompt();
    const prompt = (basePrompt || '').trim();
    if (!prompt) {
        showToast('Provide a prompt for the agent to plan.', 'info');
        return;
    }

    const started = performance.now();
    elements.agentPlanBtn?.classList.add('loading');
    state.isStreaming = true;
    handleInputChange();

    const payload = {
        prompt,
        context: state.preferences?.persona,
        metadata: {
            rag_enabled: state.useRag,
            conversation_id: state.activeConversation.serverId || null,
        },
        extra: {
            model: state.currentModel,
        },
    };

    try {
        const response = await fetch(endpoints.agentPlan, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.detail || data?.error || `HTTP ${response.status}`);
        }

        state.lastAgentPlan = data;
        renderAgentPanel(data);

        const assistantMessage = {
            role: 'assistant',
            content: formatAgentPlanMarkdown(data),
            createdAt: Date.now(),
            metadata: {
                model: 'minimax/minimax-m2',
                agent: true,
                latency: Math.round(performance.now() - started),
            },
        };

        state.activeConversation.messages.push(assistantMessage);
        const fragment = createMessageElement('assistant');
        renderAssistantContent(fragment.text, assistantMessage.content);
        applyMetadata(fragment.metadata, assistantMessage.metadata);
        persistActiveConversation();
        showToast('Planner ready', 'success');
    } catch (error) {
        console.error('Agent plan failed', error);
        showToast(error.message || 'Agent plan failed', 'error');
    } finally {
        elements.agentPlanBtn?.classList.remove('loading');
        state.isStreaming = false;
        handleInputChange();
    }

    if (options.fromCommand) {
        elements.messageInput.value = '';
        handleInputChange();
    }
}

function openSettingsModal() {
    if (!elements.settingsModal) return;
    elements.settingsModal.classList.add('open');
    elements.settingsModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    applyPreferencesToUI();
    elements.preferenceLanguage?.focus();
}

function closeSettingsModal() {
    if (!elements.settingsModal) return;
    elements.settingsModal.classList.remove('open');
    elements.settingsModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    elements.settingsBtn?.focus({ preventScroll: true });
}

function handlePreferenceSubmit(event) {
    event.preventDefault();
    const language = elements.preferenceLanguage?.value?.trim();
    const style = elements.preferenceStyle?.value?.trim();
    const voice = elements.preferenceVoice?.value?.trim();
    const persona = elements.preferencePersona?.value?.trim();

    mergePreferences({ language, style, voice, persona });
    showToast('Preferences updated', 'success');
    closeSettingsModal();
}

function handleNewChat() {
    if (state.activeConversation && state.activeConversation.messages.length > 0) {
        persistActiveConversation();
    }
    const conversation = newConversation();
    setActiveConversation(conversation);
    highlightActiveConversation();
    resetComposer();
    renderAgentPanel(null);
    focusMessageInput();
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
            const textarea = elements.messageInput;
            const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
            const modifier = isMac ? event.metaKey : event.ctrlKey;
            const selectionStart = textarea.selectionStart;
            const selectionEnd = textarea.selectionEnd;
            const selectionCollapsed = selectionStart === selectionEnd;

            if (modifier) {
                const key = event.key.toLowerCase();
                let formatAction = null;
                if (key === 'b') {
                    formatAction = 'bold';
                } else if (key === 'i') {
                    formatAction = 'italic';
                } else if (key === 'e') {
                    formatAction = 'code';
                }
                if (formatAction) {
                    event.preventDefault();
                    applyFormatAction(formatAction);
                    return;
                }
            }

            if (event.key === 'Enter' && !event.shiftKey && !modifier) {
                event.preventDefault();
                handleSend();
                return;
            }

            if (event.key === 'ArrowUp' && !event.shiftKey && selectionCollapsed && selectionStart === 0) {
                event.preventDefault();
                recallHistory('up');
                return;
            }

            if (event.key === 'ArrowDown' && !event.shiftKey && selectionCollapsed && selectionEnd === textarea.value.length) {
                event.preventDefault();
                recallHistory('down');
                return;
            }

            if (event.key === 'Tab') {
                event.preventDefault();
                const value = textarea.value;
                if (event.shiftKey) {
                    const before = value.slice(0, selectionStart);
                    const after = value.slice(selectionEnd);
                    const match = before.match(/(?:\n|^)([ \t]{1,4})$/);
                    if (match) {
                        const removeLength = match[1].length;
                        const newStart = selectionStart - removeLength;
                        textarea.value = before.slice(0, before.length - removeLength) + after;
                        textarea.setSelectionRange(newStart, newStart);
                    }
                } else {
                    const insert = '    ';
                    textarea.value = `${value.slice(0, selectionStart)}${insert}${value.slice(selectionEnd)}`;
                    const cursor = selectionStart + insert.length;
                    textarea.setSelectionRange(cursor, cursor);
                }
                autoResizeInput();
                handleInputChange();
                return;
            }
        });
    }

    if (elements.composerQuick) {
        elements.composerQuick.querySelectorAll('.quick-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const format = button.dataset.format;
                if (format) {
                    applyFormatAction(format);
                }
            });
        });
    }

    elements.modelButton?.addEventListener('click', () => toggleModelDropdown());
    elements.benchmarkBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        openBenchmarkModal();
    });
    elements.benchmarkClose?.addEventListener('click', closeBenchmarkModal);
    elements.benchmarkBackdrop?.addEventListener('click', closeBenchmarkModal);
    elements.benchmarkTabs?.addEventListener('click', handleBenchmarkScenarioClick);
    elements.benchmarkCopy?.addEventListener('click', copyBenchmarkCommand);
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
    elements.voiceModeBtn?.addEventListener('click', toggleVoiceMode);
    elements.uploadBtn?.addEventListener('click', () => {
        const input = ensureUploadInput();
        input.click();
    });
    elements.settingsBtn?.addEventListener('click', openSettingsModal);
    elements.settingsClose?.addEventListener('click', closeSettingsModal);
    elements.settingsBackdrop?.addEventListener('click', closeSettingsModal);
    elements.preferenceForm?.addEventListener('submit', handlePreferenceSubmit);
    elements.ragCheckbox?.addEventListener('change', (event) => {
        updateRagPreference(event.target.checked);
    });
    elements.agentPlanBtn?.addEventListener('click', () => triggerAgentPlan());
}

// ====================
// Voice Controls & Rich Content Components
// ====================



let interimTranscriptContainer = null;
let interimTranscriptHideTimer = null;

// Voice WebSocket client
let voiceWebsocket = null;
let isVoiceModeActive = false;
let mediaRecorder = null;
let audioStream = null;
let voiceFeatureAvailable = true;

function teardownVoiceWebsocket() {
    if (voiceWebsocket) {
        try {
            voiceWebsocket.close();
        } catch (err) {
            console.warn('Error closing voice websocket', err);
        }
    }
    voiceWebsocket = null;
}

function disableVoiceModeUi(reason) {
    voiceFeatureAvailable = false;
    state.voice.available = false;
    state.voice.configured = false;
    isVoiceModeActive = false;

    teardownVoiceWebsocket();
    showVoiceDebugPanel(false);

    const panel = document.getElementById('voiceDebugPanel');
    if (panel) {
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
        panel.classList.add('hidden');
    }

    if (elements.voiceModeBtn) {
        elements.voiceModeBtn.disabled = true;
        elements.voiceModeBtn.classList.remove('active');
        elements.voiceModeBtn.innerHTML = '<i class="fa-solid fa-podcast" aria-hidden="true"></i>';
        elements.voiceModeBtn.title = reason || 'Voice mode unavailable';
    }

    if (reason && state.voice.lastNotice !== reason) {
        showToast(reason, 'warning', 3500);
        state.voice.lastNotice = reason;
    }
}

// Initialize voice controls
function initializeVoiceControls() {
    // Create voice UI elements
    createVoiceUI();

    if (voiceFeatureAvailable) {
        initializeVoiceWebSocket();
    } else {
        disableVoiceModeUi('Voice mode unavailable');
    }

    setupVoiceEventListeners();
}

function createVoiceUI() {
    if (interimTranscriptContainer) return;

    interimTranscriptContainer = document.createElement('div');
    interimTranscriptContainer.id = 'interimTranscript';
    interimTranscriptContainer.className = 'interim-transcript';
    interimTranscriptContainer.setAttribute('aria-live', 'polite');
    interimTranscriptContainer.textContent = '';
    interimTranscriptContainer.classList.remove('visible');

    const anchor = elements.composer?.parentElement || document.body;
    anchor.appendChild(interimTranscriptContainer);

    // Create Voice Mode Debug Panel
    createVoiceDebugPanel();
}

function createVoiceDebugPanel() {
    if (document.getElementById('voiceDebugPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'voiceDebugPanel';
    panel.className = 'voice-debug-panel hidden';
    panel.innerHTML = `
        <div class="voice-debug-header">
            <h4><i class="fa-solid fa-microphone-lines"></i> Voice Mode Debug</h4>
            <button class="voice-debug-toggle" id="voiceDebugToggle" title="Toggle debug panel">
                <i class="fa-solid fa-chevron-up"></i>
            </button>
            <button class="voice-debug-clear" id="voiceDebugClear" title="Clear debug logs">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        <div class="voice-debug-content">
            <div class="voice-debug-section">
                <h5><i class="fa-solid fa-wave-square"></i> Real-time Transcripts</h5>
                <div class="voice-debug-transcripts" id="voiceDebugTranscripts">
                    <div class="voice-debug-placeholder">Voice mode not active</div>
                </div>
            </div>
            <div class="voice-debug-section">
                <h5><i class="fa-solid fa-robot"></i> AI Responses</h5>
                <div class="voice-debug-responses" id="voiceDebugResponses">
                    <div class="voice-debug-placeholder">No AI responses yet</div>
                </div>
            </div>
            <div class="voice-debug-section">
                <h5><i class="fa-solid fa-chart-line"></i> System Status</h5>
                <div class="voice-debug-status" id="voiceDebugStatus">
                    <div class="status-item">
                        <span class="status-label">WebSocket:</span>
                        <span class="status-value status-disconnected" id="wsStatus">Disconnected</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Recording:</span>
                        <span class="status-value" id="recordingStatus">Stopped</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">STT Model:</span>
                        <span class="status-value" id="sttModel">MiniMax</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">LLM Model:</span>
                        <span class="status-value" id="llmModel">${state.currentModel || 'Unknown'}</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Session ID:</span>
                        <span class="status-value" id="sessionId">None</span>
                    </div>
                </div>
            </div>
            <div class="voice-debug-section">
                <h5><i class="fa-solid fa-bug"></i> Error Logs</h5>
                <div class="voice-debug-errors" id="voiceDebugErrors">
                    <div class="voice-debug-placeholder">No errors</div>
                </div>
            </div>
        </div>
    `;

    // Position the panel to the right side - initially hidden
    Object.assign(panel.style, {
        position: 'fixed',
        top: '80px',
        right: '20px',
        width: '350px',
        maxHeight: '70vh',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: '1000',
        fontSize: '12px',
        overflow: 'hidden',
        opacity: '0',
        pointerEvents: 'none',
        transform: 'translateX(100px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    // Add header styling
    const header = panel.querySelector('.voice-debug-header');
    if (header) {
        Object.assign(header.style, {
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '600'
        });

        const headerIcon = header.querySelector('h4 i');
        if (headerIcon) {
            Object.assign(headerIcon.style, {
                marginRight: '8px',
                color: 'var(--accent-color)'
            });
        }
    }

    // Style the buttons
    const toggleBtn = header?.querySelector('.voice-debug-toggle');
    const clearBtn = header?.querySelector('.voice-debug-clear');
    if (toggleBtn) {
        Object.assign(toggleBtn.style, {
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            padding: '4px 8px',
            cursor: 'pointer',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            transition: 'color 0.2s'
        });
        toggleBtn.onmouseover = () => toggleBtn.style.color = 'var(--text-primary)';
        toggleBtn.onmouseout = () => toggleBtn.style.color = 'var(--text-secondary)';
    }
    if (clearBtn) {
        Object.assign(clearBtn.style, {
            background: 'none',
            border: 'none',
            padding: '4px 8px',
            cursor: 'pointer',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            transition: 'color 0.2s'
        });
        clearBtn.onmouseover = () => clearBtn.style.color = 'var(--error)';
        clearBtn.onmouseout = () => clearBtn.style.color = 'var(--text-secondary)';
    }

    // Style the content sections
    const sections = panel.querySelectorAll('.voice-debug-section');
    sections.forEach(section => {
        Object.assign(section.style, {
            borderBottom: '1px solid var(--border-color)',
            padding: '12px 16px'
        });

        const header = section.querySelector('h5');
        if (header) {
            Object.assign(header.style, {
                margin: '0 0 8px 0',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            });

            const icon = header.querySelector('i');
            if (icon) {
                header.insertBefore(icon, header.firstChild);
            }
        }

        const list = section.querySelector('.status-item, .voice-debug-entry, .voice-debug-placeholder');
        if (list) {
            Object.assign(list.style, {
                fontSize: '11px',
                lineHeight: '1.4'
            });
        }
    });

    // Create voice debug panel structure safely
    const headerDiv = document.createElement('div');
    headerDiv.className = 'voice-debug-header';

    const titleH4 = document.createElement('h4');
    const titleIcon = document.createElement('i');
    titleIcon.className = 'fa-solid fa-microphone-lines';
    titleH4.appendChild(titleIcon);
    titleH4.appendChild(document.createTextNode(' Voice Mode Debug'));
    headerDiv.appendChild(titleH4);

    toggleBtn = document.createElement('button');
    toggleBtn.className = 'voice-debug-toggle';
    toggleBtn.id = 'voiceDebugToggle';
    toggleBtn.title = 'Toggle debug panel';
    const toggleIcon = document.createElement('i');
    toggleIcon.className = 'fa-solid fa-chevron-up';
    toggleBtn.appendChild(toggleIcon);
    headerDiv.appendChild(toggleBtn);

    clearBtn = document.createElement('button');
    clearBtn.className = 'voice-debug-clear';
    clearBtn.id = 'voiceDebugClear';
    clearBtn.title = 'Clear debug logs';
    const clearIcon = document.createElement('i');
    clearIcon.className = 'fa-solid fa-trash';
    clearBtn.appendChild(clearIcon);
    headerDiv.appendChild(clearBtn);

    panel.appendChild(headerDiv);

    // Create content area
    const contentDiv = document.createElement('div');
    contentDiv.className = 'voice-debug-content';

    // Create sections
    const sectionsData = [
        { icon: 'fa-wave-square', title: 'Real-time Transcripts', id: 'voiceDebugTranscripts' },
        { icon: 'fa-robot', title: 'AI Responses', id: 'voiceDebugResponses' },
        { icon: 'fa-bug', title: 'Error Logs', id: 'voiceDebugErrors' }
    ];

    sectionsData.forEach(section => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'voice-debug-section';

        const headerH5 = document.createElement('h5');
        const headerIcon = document.createElement('i');
        headerIcon.className = `fa-solid ${section.icon}`;
        headerH5.appendChild(headerIcon);
        headerH5.appendChild(document.createTextNode(` ${section.title}`));
        sectionDiv.appendChild(headerH5);

        const contentContainer = document.createElement('div');
        contentContainer.id = section.id;

        const placeholder = document.createElement('div');
        placeholder.className = 'voice-debug-placeholder';
        const placeholderText = section.id === 'voiceDebugTranscripts' ? 'Voice mode not active' :
                               section.id === 'voiceDebugResponses' ? 'No AI responses yet' : 'No errors';
        placeholder.textContent = placeholderText;
        contentContainer.appendChild(placeholder);

        sectionDiv.appendChild(contentContainer);
        contentDiv.appendChild(sectionDiv);
    });

    // Create system status section
    const statusSection = document.createElement('div');
    statusSection.className = 'voice-debug-section';

    const statusHeader = document.createElement('h5');
    const statusIcon = document.createElement('i');
    statusIcon.className = 'fa-solid fa-chart-line';
    statusHeader.appendChild(statusIcon);
    statusHeader.appendChild(document.createTextNode(' System Status'));
    statusSection.appendChild(statusHeader);

    const statusContainer = document.createElement('div');
    statusContainer.className = 'voice-debug-status';
    statusContainer.id = 'voiceDebugStatus';

    const statusItems = [
        { label: 'WebSocket:', value: 'Disconnected', id: 'wsStatus', extraClass: 'status-disconnected' },
        { label: 'Recording:', value: 'Stopped', id: 'recordingStatus' },
        { label: 'STT Model:', value: 'MiniMax', id: 'sttModel' },
        { label: 'LLM Model:', value: 'Unknown', id: 'llmModel' },
        { label: 'Session ID:', value: 'None', id: 'sessionId' }
    ];

    statusItems.forEach(item => {
        const statusItem = document.createElement('div');
        statusItem.className = 'status-item';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'status-label';
        labelSpan.textContent = item.label;
        statusItem.appendChild(labelSpan);

        const valueSpan = document.createElement('span');
        valueSpan.className = `status-value${item.extraClass ? ` ${item.extraClass}` : ''}`;
        valueSpan.id = item.id;
        valueSpan.textContent = item.label === 'LLM Model:' ? (state.currentModel || 'Unknown') : item.value;
        statusItem.appendChild(valueSpan);

        statusContainer.appendChild(statusItem);
    });

    statusSection.appendChild(statusContainer);
    contentDiv.appendChild(statusSection);

    panel.appendChild(contentDiv);

    const anchor = elements.composer?.parentElement || document.body;
    anchor.appendChild(panel);

    // Add event listeners
    toggleBtn.addEventListener('click', () => {
        const isCollapsed = panel.classList.contains('collapsed');

        if (isCollapsed) {
            contentDiv.style.display = 'block';
            panel.classList.remove('collapsed');
            toggleIcon.className = 'fa-solid fa-chevron-up';
        } else {
            contentDiv.style.display = 'none';
            panel.classList.add('collapsed');
            toggleIcon.className = 'fa-solid fa-chevron-down';
        }
    });

    clearBtn.addEventListener('click', () => {
        clearVoiceDebugLogs();
    });

    // Panel should start completely hidden and only show when voice mode is activated
    showVoiceDebugPanel(false);
}

function clearVoiceDebugLogs() {
    const transcriptsDiv = document.getElementById('voiceDebugTranscripts');
    const responsesDiv = document.getElementById('voiceDebugResponses');
    const errorsDiv = document.getElementById('voiceDebugErrors');

    if (transcriptsDiv) transcriptsDiv.innerHTML = '<div class="voice-debug-placeholder">Logs cleared</div>';
    if (responsesDiv) responsesDiv.innerHTML = '<div class="voice-debug-placeholder">Logs cleared</div>';
    if (errorsDiv) errorsDiv.innerHTML = '<div class="voice-debug-placeholder">Logs cleared</div>';

    console.log('Voice debug logs cleared');
}

function updateVoiceDebugPanelVisibility() {
    const panel = document.getElementById('voiceDebugPanel');
    if (!panel) return;

    if (isVoiceModeActive) {
        showVoiceDebugPanel(true);
        // Only update status when voice mode is actually active
        updateVoiceDebugStatus({
            recording: 'Recording',
            sttModel: 'MiniMax',
            llmModel: state.currentModel,
            sessionId: 'Active'
        });
    } else {
        showVoiceDebugPanel(false);
        // Reset to initial disconnected state
        updateVoiceDebugStatus({
            ws: 'Disconnected',
            recording: 'Stopped',
            sttModel: 'MiniMax',
            llmModel: state.currentModel,
            sessionId: 'None'
        });
    }
}

function showVoiceDebugPanel(show) {
    const panel = document.getElementById('voiceDebugPanel');
    if (!panel) return;

    if (show) {
        // Make visible with smooth animation
        panel.style.opacity = '1';
        panel.style.pointerEvents = 'auto';
        panel.style.transform = 'translateX(0)';
        panel.classList.add('visible');
    } else {
        // Hide with animation
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
        panel.style.transform = 'translateX(100px)';
        panel.classList.remove('visible');
    }
}

function logVoiceTranscript(text, confidence, isFinal = false) {
    const transcriptsDiv = document.getElementById('voiceDebugTranscripts');
    if (!transcriptsDiv) return;

    const timestamp = new Date().toLocaleTimeString();
    const confidenceStr = typeof confidence === 'number' ? `${(confidence * 100).toFixed(0)}%` : 'N/A';

    // Check if this is new or updating an existing entry
    const existingEntries = transcriptsDiv.querySelectorAll('.voice-debug-entry');
    const lastEntry = existingEntries[existingEntries.length - 1];

    if (lastEntry && !isFinal && !lastEntry.classList.contains('final')) {
        // Update existing interim entry - use textContent for safety
        const safeText = (text || '...').replace(/[<>]/g, '').substring(0, 200);
        const metaDiv = lastEntry.querySelector('.voice-debug-meta');
        if (metaDiv) {
            const timeSpan = metaDiv.querySelector('.voice-debug-time');
            const confidenceSpan = metaDiv.querySelector('.voice-debug-confidence');
            if (timeSpan) timeSpan.textContent = timestamp;
            if (confidenceSpan) confidenceSpan.textContent = confidenceStr;
        }
        const contentDiv = lastEntry.querySelector('.voice-debug-content');
        if (contentDiv) contentDiv.textContent = safeText;
    } else {
        // Add new entry - create elements safely without innerHTML
        const entry = document.createElement('div');
        entry.className = `voice-debug-entry ${isFinal ? 'final' : 'interim'}`;

        const safeText = (text || '...').replace(/[<>]/g, '').substring(0, 200);

        // Build elements safely without innerHTML
        const metaDiv = document.createElement('div');
        metaDiv.className = 'voice-debug-meta';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'voice-debug-time';
        timeSpan.textContent = timestamp;

        const confidenceSpan = document.createElement('span');
        confidenceSpan.className = 'voice-debug-confidence';
        confidenceSpan.textContent = confidenceStr;

        const typeSpan = document.createElement('span');
        typeSpan.className = `voice-debug-type ${isFinal ? 'final' : 'interim'}`;
        typeSpan.textContent = isFinal ? 'Final' : 'Interim';

        metaDiv.appendChild(timeSpan);
        metaDiv.appendChild(confidenceSpan);
        metaDiv.appendChild(typeSpan);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'voice-debug-content';
        contentDiv.textContent = safeText;

        entry.appendChild(metaDiv);
        entry.appendChild(contentDiv);

        // Remove placeholder if exists
        const placeholder = transcriptsDiv.querySelector('.voice-debug-placeholder');
        if (placeholder) placeholder.remove();

        transcriptsDiv.appendChild(entry);

        // Keep only last 10 entries
        const entries = transcriptsDiv.querySelectorAll('.voice-debug-entry');
        if (entries.length > 10) {
            entries[0].remove();
        }

        // Scroll to bottom
        transcriptsDiv.scrollTop = transcriptsDiv.scrollHeight;
    }

    console.log(`Voice transcript ${isFinal ? 'final' : 'interim'}:`, text, `(${confidenceStr})`);
}

function logVoiceAiResponse(text, model, latency, tokens) {
    const responsesDiv = document.getElementById('voiceDebugResponses');
    if (!responsesDiv) return;

    const timestamp = new Date().toLocaleTimeString();

    const entry = document.createElement('div');
    entry.className = 'voice-debug-entry response';

    // Create elements safely without innerHTML
    const metaDiv = document.createElement('div');
    metaDiv.className = 'voice-debug-meta';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'voice-debug-time';
    timeSpan.textContent = timestamp;

    const modelSpan = document.createElement('span');
    modelSpan.className = 'voice-debug-model';
    modelSpan.textContent = model || 'Unknown';

    const latencySpan = document.createElement('span');
    latencySpan.className = 'voice-debug-latency';
    latencySpan.textContent = `${latency || 0}ms`;

    const tokenSpan = document.createElement('span');
    tokenSpan.className = 'voice-debug-tokens';
    tokenSpan.textContent = `${tokens || 0} tokens`;

    metaDiv.appendChild(timeSpan);
    metaDiv.appendChild(modelSpan);
    metaDiv.appendChild(latencySpan);
    metaDiv.appendChild(tokenSpan);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'voice-debug-content';
    contentDiv.textContent = text || 'No response';

    entry.appendChild(metaDiv);
    entry.appendChild(contentDiv);

    // Remove placeholder if exists
    const placeholder = responsesDiv.querySelector('.voice-debug-placeholder');
    if (placeholder) placeholder.remove();

    responsesDiv.appendChild(entry);

    // Keep only last 10 entries
    const entries = responsesDiv.querySelectorAll('.voice-debug-entry');
    if (entries.length > 10) {
        entries[0].remove();
    }

    // Scroll to bottom
    responsesDiv.scrollTop = responsesDiv.scrollHeight;

    console.log('Voice AI response:', { text, model, latency, tokens });
}

function logVoiceError(message, type = 'error') {
    const errorsDiv = document.getElementById('voiceDebugErrors');
    if (!errorsDiv) return;

    const timestamp = new Date().toLocaleTimeString();

    const entry = document.createElement('div');
    entry.className = `voice-debug-entry ${type}`;

    // Create elements safely without innerHTML
    const metaDiv = document.createElement('div');
    metaDiv.className = 'voice-debug-meta';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'voice-debug-time';
    timeSpan.textContent = timestamp;

    const typeSpan = document.createElement('span');
    typeSpan.className = 'voice-debug-type error';
    typeSpan.textContent = 'Error';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'voice-debug-content';
    contentDiv.textContent = message || 'Unknown error';

    metaDiv.appendChild(timeSpan);
    metaDiv.appendChild(typeSpan);
    entry.appendChild(metaDiv);
    entry.appendChild(contentDiv);

    // Remove placeholder if exists
    const placeholder = errorsDiv.querySelector('.voice-debug-placeholder');
    if (placeholder) placeholder.remove();

    errorsDiv.appendChild(entry);

    // Keep only last 10 entries
    const entries = errorsDiv.querySelectorAll('.voice-debug-entry');
    if (entries.length > 10) {
        entries[0].remove();
    }

    // Scroll to bottom
    errorsDiv.scrollTop = errorsDiv.scrollHeight;

    console.error('Voice error logged:', message);
}

function updateVoiceDebugStatus(updates) {
    // Update individual status items
    Object.entries(updates).forEach(([key, value]) => {
        const element = document.getElementById(`${key}Status`);
        if (element) {
            element.textContent = value;

            // Update status classes
            element.classList.remove('status-connected', 'status-disconnected', 'status-recording', 'status-stopped');
            if (key === 'ws') {
                element.classList.add(value.toLowerCase() === 'connected' ? 'status-connected' : 'status-disconnected');
            } else if (key === 'recording') {
                element.classList.add(value.toLowerCase() === 'recording' ? 'status-recording' : 'status-stopped');
            }
        }
    });

    const panel = document.getElementById('voiceDebugPanel');
    if (panel) {
        const wsElement = document.getElementById('wsStatus');
        const currentWsValue = updates.ws || wsElement?.textContent || '';
        const normalised = currentWsValue.trim().toLowerCase();

        if (normalised === 'connected') {
            panel.style.boxShadow = '0 8px 24px rgba(34, 197, 94, 0.2)';
        } else {
            panel.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
        }
    }

    console.log('Voice status updated:', updates);
}

function setInterimTranscript(message, confidence) {
    if (!interimTranscriptContainer) return;

    if (!message) {
        if (interimTranscriptHideTimer) {
            clearTimeout(interimTranscriptHideTimer);
            interimTranscriptHideTimer = null;
        }
        interimTranscriptContainer.classList.remove('visible');
        interimTranscriptContainer.textContent = '';
        return;
    }

    const confidenceSuffix = typeof confidence === 'number'
        ? ` · ${(confidence * 100).toFixed(0)}%`
        : '';
    interimTranscriptContainer.textContent = `${message}${confidenceSuffix}`;
    interimTranscriptContainer.classList.add('visible');

    if (interimTranscriptHideTimer) {
        clearTimeout(interimTranscriptHideTimer);
    }
    interimTranscriptHideTimer = setTimeout(() => {
        if (interimTranscriptContainer) {
            interimTranscriptContainer.classList.remove('visible');
            interimTranscriptContainer.textContent = '';
        }
        interimTranscriptHideTimer = null;
    }, 4000);
}

function toggleVoiceMode() {
    // Initialize WebSocket if not connected
    if (!voiceWebsocket || voiceWebsocket.readyState !== WebSocket.OPEN) {
        initializeVoiceWebSocket();
        // Wait a bit for connection
        setTimeout(() => {
            if (voiceWebsocket && voiceWebsocket.readyState === WebSocket.OPEN) {
                activateVoiceMode();
                updateVoiceDebugStatus({ ws: 'Connected' });
            } else {
                showToast('Connecting to voice system...', 'info');
                updateVoiceDebugStatus({ ws: 'Connecting...' });
            }
        }, 500);
        return;
    }

    if (isVoiceModeActive) {
        deactivateVoiceMode();
    } else {
        activateVoiceMode();
        updateVoiceDebugStatus({ ws: 'Connected' });
    }
}

function activateVoiceMode() {
    isVoiceModeActive = true;

    // Update debug panel visibility
    updateVoiceDebugPanelVisibility();

    // Auto-select best model for voice mode (MiniMax M2 - optimized for voice conversations)
    const previousModel = state.currentModel;
    state.currentModel = 'minimax/minimax-m2';
    updateModelButton();
    localStorage.setItem(MODEL_KEY, state.currentModel);

    // Store previous model to restore later if needed
    state.voiceModeOriginalModel = previousModel;

    // Update debug status
    updateVoiceDebugStatus({
        recording: 'Starting...',
        sttModel: 'MiniMax',
        llmModel: state.currentModel,
        sessionId: 'Initializing...'
    });

    // Update UI with stop icon
    if (elements.voiceModeBtn) {
        elements.voiceModeBtn.classList.add('active');
        elements.voiceModeBtn.innerHTML = '<i class="fa-solid fa-stop" aria-hidden="true"></i>';
        elements.voiceModeBtn.title = 'Stop voice conversation';
    }

    // Start recording
    startVoiceRecording();

    // Send command to backend
    if (voiceWebsocket && voiceWebsocket.readyState === WebSocket.OPEN) {
        voiceWebsocket.send(JSON.stringify({ type: 'start_recording' }));
    }

    showToast('🎙️ Voice mode active (using MiniMax M2)', 'success');
}

function deactivateVoiceMode() {
    isVoiceModeActive = false;

    // Hide debug panel
    updateVoiceDebugPanelVisibility();

    // Update UI back to podcast icon
    if (elements.voiceModeBtn) {
        elements.voiceModeBtn.classList.remove('active');
        elements.voiceModeBtn.innerHTML = '<i class="fa-solid fa-podcast" aria-hidden="true"></i>';
        elements.voiceModeBtn.title = 'Voice conversation mode (like ChatGPT/Gemini Live)';
    }

    // Stop recording
    stopVoiceRecording();

    // Send command to backend
    if (voiceWebsocket && voiceWebsocket.readyState === WebSocket.OPEN) {
        voiceWebsocket.send(JSON.stringify({ type: 'stop_recording' }));
    }

    // Update debug status
    updateVoiceDebugStatus({ recording: 'Stopped', sessionId: 'None' });

    showToast('Voice mode stopped', 'info');
}

async function startVoiceRecording() {
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && voiceWebsocket?.readyState === WebSocket.OPEN) {
                // Send audio chunk to WebSocket
                event.data.arrayBuffer().then(buffer => {
                    voiceWebsocket.send(new Uint8Array(buffer));
                });
            }
        };

        mediaRecorder.onerror = (error) => {
            console.error('MediaRecorder error:', error);
            showToast('Recording error occurred', 'error');
            deactivateVoiceMode();
        };

        mediaRecorder.start(100); // Collect data every 100ms
        console.log('Voice recording started');
        
        setInterimTranscript('Listening...', null);
    } catch (error) {
        console.error('Error starting voice recording:', error);
        showToast('Microphone access denied. Please allow microphone access.', 'error');
        deactivateVoiceMode();
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }

    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }

    setInterimTranscript('', null);

    console.log('Voice recording stopped');
}


function initializeVoiceWebSocket() {
    const voiceWsUrl = API_BASE.replace(/^http/, 'ws') + '/voice/stream/user_' + Date.now();

    voiceWebsocket = new WebSocket(voiceWsUrl);

    voiceWebsocket.onopen = () => {
        console.log('Voice WebSocket connected');
        updateVoiceStatus(true);
    };

    voiceWebsocket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data?.type === 'error' && (data.error === 'voice_unavailable' || data.error === 'voice_unconfigured')) {
                console.warn('Voice mode disabled by server:', data.message);
                voiceFeatureAvailable = false;
                disableVoiceModeUi(data.message || 'Voice mode unavailable');
                teardownVoiceWebsocket();
                return;
            }
            handleVoiceMessage(data);
        } catch (error) {
            console.error('Error parsing voice message:', error);
        }
    };

    voiceWebsocket.onerror = (error) => {
        console.error('Voice WebSocket error:', error);
        updateVoiceStatus(false);
    };

    voiceWebsocket.onclose = () => {
        console.log('Voice WebSocket closed');
        updateVoiceStatus(false);
    };
}

function updateVoiceStatus(connected) {
    // Update voice mode button availability
    if (elements.voiceModeBtn) {
        elements.voiceModeBtn.disabled = !connected;
        if (!connected) {
            elements.voiceModeBtn.title = 'Voice system offline - reconnecting...';
        } else {
            elements.voiceModeBtn.title = 'Voice mode (like ChatGPT/Gemini Live)';
        }
    }
    
    console.log('Voice WebSocket status:', connected ? 'connected' : 'disconnected');
}

function handleVoiceMessage(data) {
    console.log('Received voice message:', data);

    switch (data.type) {
        case 'welcome':
            if (typeof data.voice_available === 'boolean') {
                voiceFeatureAvailable = data.voice_available;
                if (!voiceFeatureAvailable) {
                    disableVoiceModeUi(data.message || 'Voice mode unavailable');
                    return;
                }
            }
            state.voice.available = true;
            state.voice.configured = true;
            console.log('Voice session started');
            updateVoiceDebugStatus({ sessionId: data.session_id || 'Active' });
            break;

        case 'recording_started':
            console.log('Recording started on server');
            updateVoiceDebugStatus({ recording: 'Recording' });
            break;

        case 'recording_stopped':
            console.log('Recording stopped on server');
            updateVoiceDebugStatus({ recording: 'Processing...' });
            break;

        case 'interim_transcript':
            showInterimTranscript(data.transcript, data.confidence);
            logVoiceTranscript(data.transcript, data.confidence, false);
            break;

        case 'voice_response':
            handleVoiceResponse(data);
            break;

        case 'error':
            showToast(`Voice error: ${data.message}`, 'error');
            deactivateVoiceMode();
            logVoiceError(data.message);
            break;

        case 'ping':
            // Keepalive ping, no action needed
            break;

        default:
            console.log('Unhandled voice message type:', data.type);
    }
}

function showInterimTranscript(transcript, confidence) {
    if (transcript) {
        setInterimTranscript(transcript, confidence);
    } else {
        setInterimTranscript('Listening...', null);
    }
}

// Track last rendered response to prevent duplicates
let lastVoiceResponseId = null;

function handleVoiceResponse(data) {
    const responseId = data.timestamp || `${data.session_id}-${Date.now()}`;
    if (responseId === lastVoiceResponseId) {
        console.log('Skipping duplicate voice response');
        return;
    }
    lastVoiceResponseId = responseId;

    setInterimTranscript('', null);

    if (!state.activeConversation) {
        state.activeConversation = newConversation();
        setActiveConversation(state.activeConversation);
    }

    ensureConversationVisible();

    const transcriptText = (data.transcript?.full_transcript || data.transcript?.transcript || '').trim();
    if (transcriptText) {
        const lastMessage = state.activeConversation.messages[state.activeConversation.messages.length - 1];
        const alreadyLogged = lastMessage
            && lastMessage.role === 'user'
            && (lastMessage.content || '').trim().toLowerCase() === transcriptText.toLowerCase();

        if (!alreadyLogged) {
            const userMessage = {
                role: 'user',
                content: transcriptText,
                createdAt: Date.now(),
                metadata: { voice: true },
            };
            state.activeConversation.messages.push(userMessage);
            const fragment = createMessageElement('user');
            fragment.text.textContent = transcriptText;
        }
        lastVoiceTranscript = transcriptText;
    }

    if (data.response) {
        renderVoiceResponse(data);
    }

    persistActiveConversation();
    state.isStreaming = false;
    handleInputChange();
}

function renderVoiceResponse(payload) {
    const response = payload.response || {};
    console.log('Rendering voice response:', response);

    const assistantContent = response.text || 'Voice processing complete';
    const shouldRenderRichContent = voiceFeatureAvailable && response.richContent;

    const assistantMessage = {
        role: 'assistant',
        content: assistantContent,
        createdAt: Date.now(),
        metadata: {
            model: response.model || state.currentModel,
            tokens: response.tokens,
            confidence: typeof response.confidence === 'number'
                ? response.confidence
                : payload.transcript?.confidence,
            voice: payload.ttsAudio ? 'MiniMax TTS' : null,
            latency: response.latency,
        },
    };

    // Log AI response for debugging
    logVoiceAiResponse(
        assistantContent,
        response.model || state.currentModel,
        response.latency,
        response.tokens
    );

    state.activeConversation.messages.push(assistantMessage);
    const messageElement = createMessageElement('assistant');
    renderAssistantContent(messageElement.text, assistantContent);

    if (shouldRenderRichContent) {
        const richElement = createRichContentElement(response.richContent);
        if (richElement) {
            messageElement.text.appendChild(richElement);
        }
    }

    if (payload.ttsAudio) {
        const audioWrapper = document.createElement('div');
        audioWrapper.className = 'message-audio';
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = `data:audio/mp3;base64,${payload.ttsAudio}`;
        audioWrapper.appendChild(audio);
        messageElement.text.appendChild(audioWrapper);
    }

    applyMetadata(messageElement.metadata, assistantMessage.metadata);

    if (elements.chatMessages) {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }
}

function createRichContentElement(richContent) {
    if (!voiceFeatureAvailable || !richContent || typeof richContent !== 'object') {
        return null;
    }

    switch (richContent.type) {
        case 'weather':
            return createWeatherCard(richContent.data);
        case 'map':
            return createMapCard(richContent.data);
        default:
            console.log('Unknown rich content type:', richContent.type);
            return null;
    }
}

function createWeatherCard(weatherData = {}) {
    const card = document.createElement('div');
    card.className = 'rich-content-card weather-card';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'rich-card-header';
    const icon = document.createElement('i');
    icon.className = 'fas fa-cloud-sun';
    const textDiv = document.createElement('div');
    textDiv.className = 'rich-card-text';

    // Create strong element and text nodes safely
    const strongEl = document.createElement('strong');
    strongEl.textContent = weatherData.city || 'Current location';
    const br = document.createElement('br');
    const remainingText = document.createTextNode(`${weatherData.condition || 'Mixed conditions'} · ${weatherData.temperature || '--°C'}`);

    textDiv.appendChild(strongEl);
    textDiv.appendChild(br);
    textDiv.appendChild(remainingText);

    headerDiv.appendChild(icon);
    headerDiv.appendChild(textDiv);

    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'rich-card-metrics';

    // Create metrics without innerHTML
    const humidityDiv = document.createElement('div');
    const humiditySpan = document.createElement('span');
    humiditySpan.textContent = 'Humidity';
    const humidityStrong = document.createElement('strong');
    humidityStrong.textContent = weatherData.humidity || '--';

    const windDiv = document.createElement('div');
    const windSpan = document.createElement('span');
    windSpan.textContent = 'Wind';
    const windStrong = document.createElement('strong');
    windStrong.textContent = weatherData.wind_speed || '--';

    humidityDiv.appendChild(humiditySpan);
    humidityDiv.appendChild(humidityStrong);
    windDiv.appendChild(windSpan);
    windDiv.appendChild(windStrong);

    metricsDiv.appendChild(humidityDiv);
    metricsDiv.appendChild(windDiv);

    const forecastList = document.createElement('ul');
    forecastList.className = 'rich-card-forecast';
    (weatherData.forecast || []).slice(0, 3).forEach((day) => {
        const item = document.createElement('li');
        // Create forecast entry without innerHTML
        const daySpan = document.createElement('span');
        daySpan.textContent = day.day || 'Day';
        const detailsSpan = document.createElement('span');
        detailsSpan.textContent = `${day.high || '--'} / ${day.low || '--'} · ${day.condition || '--'}`;

        item.appendChild(daySpan);
        item.appendChild(detailsSpan);
        forecastList.appendChild(item);
    });

    card.appendChild(headerDiv);
    card.appendChild(metricsDiv);
    if (forecastList.children.length > 0) {
        card.appendChild(forecastList);
    }

    return card;
}

function createMapCard(mapData = {}) {
    const card = document.createElement('div');
    card.className = 'rich-content-card map-card';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'rich-card-header';
    const icon = document.createElement('i');
    icon.className = 'fas fa-location-dot';
    const textDiv = document.createElement('div');
    textDiv.className = 'rich-card-text';

    // Create header text safely without innerHTML
    const strongEl = document.createElement('strong');
    strongEl.textContent = mapData.location?.label || 'Location';
    const br = document.createElement('br');
    const addressText = document.createTextNode(mapData.address || 'Tap to open in maps');

    textDiv.appendChild(strongEl);
    textDiv.appendChild(br);
    textDiv.appendChild(addressText);

    headerDiv.appendChild(icon);
    headerDiv.appendChild(textDiv);

    const preview = document.createElement('div');
    preview.className = 'rich-map-preview';

    // Create preview content without innerHTML
    const previewIcon = document.createElement('i');
    previewIcon.className = 'fas fa-map';
    const previewText = document.createElement('div');
    previewText.textContent = 'Interactive map preview';
    const coordinatesDiv = document.createElement('div');
    coordinatesDiv.className = 'rich-map-coordinates';
    coordinatesDiv.textContent = `Coordinates: ${(mapData.location?.lat)?.toFixed(4) || '--'}, ${(mapData.location?.lng)?.toFixed(4) || '--'}`;

    preview.appendChild(previewIcon);
    preview.appendChild(previewText);
    preview.appendChild(coordinatesDiv);

    const link = document.createElement('a');
    link.className = 'rich-map-link';
    link.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapData.address || 'Pune, India');
    link.target = '_blank';
    link.rel = 'noopener';

    // Create link content without innerHTML
    const linkIcon = document.createElement('i');
    linkIcon.className = 'fas fa-external-link-alt';
    const linkText = document.createTextNode(' Open in Google Maps');
    link.appendChild(linkIcon);
    link.appendChild(linkText);

    card.appendChild(headerDiv);
    card.appendChild(preview);
    card.appendChild(link);

    return card;
}



function setupVoiceEventListeners() {
    // Add keyboard shortcuts for voice mode
    document.addEventListener('keydown', (event) => {
        // Alt+V for voice mode toggle
        if (event.key === 'v' && event.altKey && !event.shiftKey) {
            event.preventDefault();
            toggleVoiceMode();
        }
    });
}

// Initialize voice controls when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeVoiceControls();
});

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
    applyPreferencesToUI();
    if (elements.ragCheckbox) {
        elements.ragCheckbox.checked = state.useRag;
    }
    handleInputChange();
}

async function bootstrap() {
    restoreInitialState();
    initInlineHandlers();
    renderAgentPanel(state.lastAgentPlan);
    initMobileOptimizations();
    composerAutofocus.init();
    initVoice();
    backendHealth.setStatus(true);
    await backendHealth.check();
    ensureHealthMonitoring();
    await preloadServerConversations();
    focusMessageInput();
}

function initMobileOptimizations() {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('ServiceWorker registered:', registration.scope);
                })
                .catch((error) => {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }

    // Add device class to body for CSS targeting
    if (isMobile) document.body.classList.add('mobile-device');
    if (isIOS) document.body.classList.add('ios-device');
    if (isAndroid) document.body.classList.add('android-device');
    if (isTouchDevice) document.body.classList.add('touch-device');

    // Prevent zoom on iOS when focusing inputs
    if (isIOS && elements.messageInput) {
        elements.messageInput.addEventListener('touchstart', function() {
            const fontSize = window.getComputedStyle(this).fontSize;
            if (parseInt(fontSize) < 16) {
                this.style.fontSize = '16px';
            }
        });
    }

    // Handle viewport height changes on mobile (keyboard appearance)
    if (isMobile) {
        let lastHeight = window.innerHeight;
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            if (currentHeight < lastHeight) {
                // Keyboard likely opened
                document.body.classList.add('keyboard-open');
            } else {
                // Keyboard likely closed
                document.body.classList.remove('keyboard-open');
            }
            lastHeight = currentHeight;
        });
    }

    // Improve scrolling on mobile
    if (isMobile && elements.chatMessages) {
        elements.chatMessages.addEventListener('touchmove', function(e) {
            e.stopPropagation();
        }, { passive: true });
    }

    // Prevent pull-to-refresh on mobile browsers
    document.body.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1 || window.scrollY > 0) return;
        e.preventDefault();
    }, { passive: false });

    // Add active state for touch devices
    if (isTouchDevice) {
        document.addEventListener('touchstart', function() {}, { passive: true });
    }

    // Fix for iOS Safari bottom bar
    if (isIOS) {
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', setVH);
    }
}

async function preloadServerConversations() {
    if (state.backendHealthy === false) {
        console.info('Skipping server conversation preload: backend offline');
        return;
    }
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
        backendHealth.setStatus(false, 'AssistMe backend is unreachable. Using preview responses.');
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

document.addEventListener('keydown', handleGlobalKeydown);
