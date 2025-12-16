export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({
            error: 'Gemini API key not configured in Vercel. Please add GOOGLE_API_KEY to Environment Variables.'
        }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ apiKey }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
