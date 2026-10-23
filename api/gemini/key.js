/**
 * Vercel Edge Function: Gemini API Key
 *
 * Serves GOOGLE_API_KEY only to allowlisted browser origins so a third-party
 * site cannot read the key. Same-origin requests omit Origin and still work.
 *
 * Endpoint: GET /api/gemini/key
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

    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({
            error: 'Gemini API key not configured',
            message: 'Please add GOOGLE_API_KEY to your environment.',
        }), {
            status: 503,
            headers: jsonHeaders,
        });
    }

    return new Response(JSON.stringify({
        apiKey,
        model: 'models/gemini-2.5-flash-native-audio-dialog',
        modelName: 'gemini-2.5-flash-native-audio-dialog',
        endpoint: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent',
        features: {
            liveAPI: true,
            unlimitedRPM: true,
            unlimitedRPD: true,
            nativeAudio: true,
            bidirectional: true
        }
    }), {
        status: 200,
        headers: jsonHeaders,
    });
}
