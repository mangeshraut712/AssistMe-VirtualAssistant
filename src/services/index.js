/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVICES EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * API service wrappers for backend communication.
 * Centralizes all API calls for better maintainability.
 */

import { createApiClient } from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/constants';

const backendUrl = API_ENDPOINTS.BACKEND_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Chat Service
// ─────────────────────────────────────────────────────────────────────────────
export const chatService = {
    /**
     * Send a chat message with streaming response
     */
    async streamChat({ messages, model, onDelta, onComplete, onError }) {
        const api = createApiClient({ baseUrl: backendUrl });
        try {
            await api.streamChat({
                model,
                messages,
                onDelta,
            });
            onComplete?.();
        } catch (error) {
            onError?.(error);
        }
    },

    /**
     * Send a chat message without streaming
     */
    async sendMessage({ messages, model }) {
        const response = await fetch(`${backendUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, model }),
        });
        return response.json();
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Service (Grokipedia)
// ─────────────────────────────────────────────────────────────────────────────
export const knowledgeService = {
    /**
     * Stream a knowledge article generation
     */
    async streamArticle({ query, searchDepth = 'advanced', onMetadata, onContent, onError }) {
        try {
            const response = await fetch(`${backendUrl}/api/knowledge/grokipedia/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, search_depth: searchDepth }),
            });

            if (!response.ok) throw new Error('Failed to fetch article');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') return;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.type === 'metadata') onMetadata?.(data.sources);
                            else if (data.type === 'content') onContent?.(data.delta);
                            else if (data.type === 'error') throw new Error(data.message);
                        } catch (e) {
                            if (!e.message?.includes('JSON')) throw e;
                        }
                    }
                }
            }
        } catch (error) {
            onError?.(error);
        }
    },

    /**
     * Search knowledge base
     */
    async search({ query, topK = 5, useWebSearch = true }) {
        const response = await fetch(`${backendUrl}/api/knowledge/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, top_k: topK, use_web_search: useWebSearch }),
        });
        return response.json();
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Image Service
// ─────────────────────────────────────────────────────────────────────────────
export const imageService = {
    /**
     * Generate an image from prompt
     */
    async generate({ prompt, model, width = 1024, height = 1024 }) {
        const response = await fetch(`${backendUrl}/api/image/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, model, width, height }),
        });
        return response.json();
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Speech Service (TTS/STT)
// ─────────────────────────────────────────────────────────────────────────────
export const speechService = {
    /**
     * Text to Speech
     */
    async synthesize({ text, voice = 'en-US', speed = 1.0 }) {
        const response = await fetch(`${backendUrl}/api/tts/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice, speed }),
        });
        return response.blob();
    },

    /**
     * Speech to Text
     */
    async transcribe(audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob);

        const response = await fetch(`${backendUrl}/api/stt/transcribe`, {
            method: 'POST',
            body: formData,
        });
        return response.json();
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Speedtest Service
// ─────────────────────────────────────────────────────────────────────────────
export const speedtestService = {
    /**
     * Run speed test
     */
    async run() {
        const response = await fetch(`${backendUrl}/api/speedtest/run`, {
            method: 'POST',
        });
        return response.json();
    },
};
