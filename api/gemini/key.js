/**
 * Vercel Edge Function: Gemini API Key
 * 
 * Securely serves the GOOGLE_API_KEY to the frontend for
 * WebSocket connections to Gemini Live API.
 * 
 * Endpoint: GET /api/gemini/key
 * 
 * Security Notes:
 * - In production, consider implementing:
 *   - Rate limiting
 *   - Short-lived tokens
 *   - Origin validation
 *   - Server-side WebSocket proxy
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // CORS headers for cross-origin requests
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store, max-age=0',
    };

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({
            error: 'Method not allowed'
        }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({
            error: 'Gemini API key not configured',
            message: 'Please add GOOGLE_API_KEY to your Vercel Environment Variables.',
            docs: 'https://vercel.com/docs/environment-variables'
        }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Return the API key
    return new Response(JSON.stringify({
        apiKey,
        model: 'models/gemini-2.0-flash-exp',
        endpoint: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent'
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
