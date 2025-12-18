/**
 * Gemini Image Generation Status Check
 * 
 * Checks if GOOGLE_API_KEY is available for premium image generation
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
            message: 'Add GOOGLE_API_KEY to Vercel for premium image generation'
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({
        available: true,
        model: 'gemini-2.0-flash-exp',
        features: {
            imageGeneration: true,
            free: true,
            dailyLimit: 500
        }
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
