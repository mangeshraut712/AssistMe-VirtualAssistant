/**
 * xAI Grok Voice API Edge Function
 *
 * Endpoint: GET /api/xai/key
 *
 * The key is returned only to allowlisted origins. A wildcard CORS header
 * would let any website read XAI_API_KEY.
 */

import { corsHeaders } from '../cors.js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const { allowedOrigin, headers } = corsHeaders(req, 'GET, OPTIONS');
    const jsonHeaders = { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store, max-age=0' };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: allowedOrigin ? 204 : 403, headers });
    }

    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: jsonHeaders,
        });
    }

    if (req.headers.get('origin') && !allowedOrigin) {
        return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
            status: 403,
            headers: jsonHeaders,
        });
    }

    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({
            error: 'xAI API key not configured',
            message: 'Please add XAI_API_KEY to your environment.',
        }), {
            status: 503,
            headers: jsonHeaders,
        });
    }

    return new Response(JSON.stringify({
        apiKey,
        model: 'grok-voice-alpha',
        modelName: 'Grok Voice Agent',
        endpoint: 'wss://api.x.ai/v1/realtime',
        features: {
            realtimeVoice: true,
            lowLatency: true,
            naturalConversation: true,
            multimodal: true
        },
        docs: 'https://x.ai/news/grok-voice-agent-api'
    }), {
        status: 200,
        headers: jsonHeaders,
    });
}
