/**
 * Health Check API Edge Function
 * Returns service status and configuration
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }

    // Check API key configuration
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
    const isApiKeyConfigured = Boolean(
        (openRouterKey && openRouterKey.trim().length > 0) ||
        (aiGatewayKey && aiGatewayKey.trim().length > 0)
    );

    const provider = aiGatewayKey ? 'vercel-ai-gateway' : (openRouterKey ? 'openrouter' : 'none');

    const healthStatus = {
        status: isApiKeyConfigured ? 'healthy' : 'degraded',
        service: 'assistme-api',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        components: {
            edge_runtime: {
                status: 'available',
            },
            chat_client: {
                status: isApiKeyConfigured ? 'available' : 'unavailable',
                provider: provider,
                api_key_configured: isApiKeyConfigured,
            },
        },
        environment: {
            vercel: Boolean(process.env.VERCEL),
            region: process.env.VERCEL_REGION || 'unknown',
            node_env: process.env.NODE_ENV || 'production',
        },
        endpoints: {
            chat_stream: '/api/chat/stream',
            chat_text: '/api/chat/text',
            health: '/health',
        },
    };

    // If degraded, add help message
    if (!isApiKeyConfigured) {
        healthStatus.help = 'Set OPENROUTER_API_KEY or AI_GATEWAY_API_KEY in Vercel Environment Variables';
    }

    return new Response(JSON.stringify(healthStatus, null, 2), {
        status: isApiKeyConfigured ? 200 : 503,
        headers: corsHeaders,
    });
}
