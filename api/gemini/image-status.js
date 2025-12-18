/**
 * Gemini Image Enhancement Status Check
 * 
 * Premium mode uses Gemini AI for intelligent prompt enhancement
 * Both Premium and Standard generate images via Pollinations (FREE)
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
            message: 'Add GOOGLE_API_KEY to Vercel for Premium AI prompt enhancement',
            standardAvailable: true,
            standardNote: 'Standard mode works without API key'
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({
        available: true,
        model: 'gemini-2.0-flash-exp',
        features: {
            promptEnhancement: true,
            imageGeneration: 'pollinations', // Pollinations for actual generation
            free: true,
            unlimited: true
        },
        description: 'Premium uses Gemini AI for intelligent prompt enhancement'
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
