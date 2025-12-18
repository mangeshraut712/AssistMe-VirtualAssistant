/**
 * Image Generation Status Check
 * 
 * Checks if GOOGLE_API_KEY is available for Premium mode
 * Premium = Gemini AI prompt enhancement (better images)
 * Standard = Direct generation (basic)
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
            message: 'Add GOOGLE_API_KEY to Vercel for Premium AI image generation',
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
            aiEnhancement: true,
            betterPrompts: true,
            betterImages: true,
            free: true
        },
        description: 'Premium uses Gemini AI to create detailed prompts for much better images'
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
