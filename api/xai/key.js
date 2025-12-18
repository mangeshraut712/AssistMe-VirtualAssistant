/**
 * xAI Grok Voice API Edge Function
 * 
 * Provides access to xAI's Grok Voice Agent API
 * Supports real-time voice conversations with Grok
 * 
 * Endpoint: GET /api/xai/key
 * 
 * @see https://docs.x.ai/docs/guides/voice
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store, max-age=0',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    if (req.method !== 'GET') {
        return new Response(JSON.stringify({
            error: 'Method not allowed'
        }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({
            error: 'xAI API key not configured',
            message: 'Please add XAI_API_KEY to your Vercel Environment Variables.',
            docs: 'https://docs.x.ai/docs/guides/voice'
        }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Return API key and configuration
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
