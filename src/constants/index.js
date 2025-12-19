/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APPLICATION CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Central place for all app-wide constants.
 * Import from '@/constants' for cleaner imports.
 */

// ─────────────────────────────────────────────────────────────────────────────
// App Information
// ─────────────────────────────────────────────────────────────────────────────
export const APP_NAME = 'AssistMe';
export const APP_VERSION = '2.0.0';
export const APP_DESCRIPTION = 'AI Virtual Assistant with Chat, Voice, Images & Multilingual Support';

// ─────────────────────────────────────────────────────────────────────────────
// API Configuration
// ─────────────────────────────────────────────────────────────────────────────
export const API_ENDPOINTS = {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
    CHAT: '/api/chat',
    CHAT_STREAM: '/api/chat/stream',
    IMAGE_GENERATE: '/api/image/generate',
    KNOWLEDGE: '/api/knowledge',
    SPEEDTEST: '/api/speedtest',
    TTS: '/api/tts',
    STT: '/api/stt',
};

// ─────────────────────────────────────────────────────────────────────────────
// AI Models
// ─────────────────────────────────────────────────────────────────────────────
export const AI_MODELS = {
    // Chat Models
    GEMINI_FLASH: {
        id: 'google/gemini-2.5-flash-preview-05-20',
        name: 'Gemini 2.5 Flash',
        provider: 'Google',
        description: 'Fast and efficient for most tasks',
        isDefault: true,
    },
    GEMINI_PRO: {
        id: 'google/gemini-2.5-pro-exp-03-25:free',
        name: 'Gemini 2.5 Pro',
        provider: 'Google',
        description: 'Most capable for complex reasoning',
    },
    LLAMA_MAVERICK: {
        id: 'meta-llama/llama-4-maverick:free',
        name: 'Llama 4 Maverick',
        provider: 'Meta',
        description: 'Open-source powerhouse',
    },
    GROK: {
        id: 'x-ai/grok-3-fast-beta',
        name: 'Grok 3 Fast',
        provider: 'xAI',
        description: 'Fast responses with humor',
    },

    // Image Models
    FLUX_PRO: {
        id: 'black-forest-labs/flux-1.1-pro',
        name: 'FLUX 1.1 Pro',
        provider: 'Black Forest Labs',
        description: 'Premium image generation',
    },

    // Knowledge Model
    KNOWLEDGE: {
        id: 'google/gemini-2.5-flash-preview-05-20',
        name: 'Gemini 2.5 Flash',
        provider: 'Google',
        description: 'Optimized for deep research articles',
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature Navigation
// ─────────────────────────────────────────────────────────────────────────────
export const FEATURES = {
    CHAT: { id: 'chat', name: 'Chat', path: '/chat', icon: 'MessageSquare' },
    VOICE: { id: 'voice', name: 'Voice', path: '/voice', icon: 'Mic' },
    IMAGINE: { id: 'imagine', name: 'Imagine', path: '/imagine', icon: 'Image' },
    KNOWLEDGE: { id: 'knowledge', name: 'Knowledge', path: '/grokipedia', icon: 'BookOpen' },
    SPEEDTEST: { id: 'speedtest', name: 'Speedtest', path: '/speedtest', icon: 'Zap' },
    TOOLS: { id: 'tools', name: 'Tools', path: '/tools', icon: 'Wrench' },
};

// ─────────────────────────────────────────────────────────────────────────────
// UI Constants
// ─────────────────────────────────────────────────────────────────────────────
export const BREAKPOINTS = {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    XXL: 1536,
};

export const ANIMATION_DURATION = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
};

export const Z_INDEX = {
    DROPDOWN: 50,
    MODAL: 100,
    TOOLTIP: 150,
    OVERLAY: 200,
    MAX: 9999,
};

// ─────────────────────────────────────────────────────────────────────────────
// Voice Configuration
// ─────────────────────────────────────────────────────────────────────────────
export const VOICE_CONFIG = {
    SAMPLE_RATE: 16000,
    SILENCE_THRESHOLD: 0.01,
    SILENCE_DURATION: 1500,
    MAX_RECORDING_TIME: 60000,
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
    THEME: 'assistme-theme',
    LANGUAGE: 'assistme-language',
    CHAT_HISTORY: 'assistme-chat-history',
    SELECTED_MODEL: 'assistme-selected-model',
    VOICE_ENABLED: 'assistme-voice-enabled',
    USER_PREFERENCES: 'assistme-preferences',
};
