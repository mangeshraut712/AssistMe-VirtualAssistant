/**
 * Gemini Image Generation Status Check
 * 
 * Premium mode uses Gemini's native image generation
 * Standard mode uses Pollinations.ai
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
            message: 'Add GOOGLE_API_KEY to Vercel for Premium image generation',
            standardAvailable: true
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({
        available: true,
        model: 'gemini-2.0-flash-preview-image-generation',
        features: {
            nativeImageGeneration: true,
            free: true,
            provider: 'Google Gemini AI'
        },
        description: 'Premium generates images directly using Google Gemini AI'
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
