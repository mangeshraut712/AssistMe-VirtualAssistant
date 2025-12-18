/**
 * Vercel Edge Function: Gemini Status Check
 * 
 * Checks if the Gemini API is available and configured.
 * 
 * Endpoint: GET /api/gemini/status
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

    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({
            available: false,
            reason: 'API key not configured',
            message: 'Please add GOOGLE_API_KEY to Vercel Environment Variables'
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Quick validation check - API key exists
    return new Response(JSON.stringify({
        available: true,
        model: 'gemini-2.5-flash-native-audio-dialog',
        features: {
            liveAPI: true,
            nativeAudio: true,
            bidirectional: true
        }
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
