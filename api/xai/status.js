/**
 * xAI Status Check Edge Function
 * 
 * Checks if xAI Grok Voice API is available and configured
 * 
 * Endpoint: GET /api/xai/status
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, max-age=0',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({
            available: false,
            reason: 'API key not configured',
            message: 'Please add XAI_API_KEY to Vercel Environment Variables'
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({
        available: true,
        model: 'grok-voice-alpha',
        features: {
            realtimeVoice: true,
            lowLatency: true,
            naturalConversation: true
        }
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
