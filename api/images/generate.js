/**
 * Image Generation API Edge Function
 * 
 * Dual Provider System:
 * - Standard Mode: OpenRouter (uses OPENROUTER_API_KEY - already configured)
 * - Premium Mode: Google Gemini API (uses GOOGLE_API_KEY)
 * 
 * Available Models via OpenRouter:
 * - google/gemini-2.5-flash-image (Free tier available)
 * - google/gemini-3-pro-image-preview (Premium)
 * 
 * Endpoint: POST /api/images/generate
 * 
 * @version 3.0.0
 * @date December 2025
 */

export const config = {
    runtime: 'edge',
};

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Standard Models (via OpenRouter - Free tier available)
const STANDARD_MODELS = {
    'gemini-flash': {
        id: 'google/gemini-2.5-flash-image',
        name: 'Gemini 2.5 Flash',
        description: 'Fast, free via OpenRouter',
        provider: 'openrouter'
    },
    'gemini-flash-preview': {
        id: 'google/gemini-2.5-flash-image-preview',
        name: 'Gemini Flash Preview',
        description: 'Preview version',
        provider: 'openrouter'
    }
};

// Premium Models (via Google API directly - higher limits)
const PREMIUM_MODELS = {
    'gemini-3-pro': {
        id: 'gemini-3-pro-image-preview',
        name: 'Gemini 3 Pro',
        description: 'Highest quality (Premium)',
        provider: 'google'
    },
    'imagen-4': {
        id: 'imagen-4.0-generate-001',
        name: 'Imagen 4',
        description: 'Google\'s best (Premium)',
        provider: 'google'
    }
};

const ALL_MODELS = { ...STANDARD_MODELS, ...PREMIUM_MODELS };

// Generate via OpenRouter (Standard)
async function generateViaOpenRouter(prompt, modelId, apiKey) {
    console.log('[Image] OpenRouter request with model:', modelId);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://assist-me-virtual-assistant.vercel.app',
            'X-Title': 'AssistMe Imagine'
        },
        body: JSON.stringify({
            model: modelId,
            messages: [{
                role: 'user',
                content: `Generate an image: ${prompt}`
            }],
            modalities: ['text', 'image'],
            max_tokens: 4096
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Image] OpenRouter error:', response.status, errorText);
        throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();

    // Extract image from response
    const content = data?.choices?.[0]?.message?.content;
    const images = [];

    if (Array.isArray(content)) {
        for (const part of content) {
            if (part.type === 'image_url' && part.image_url?.url) {
                images.push({
                    url: part.image_url.url,
                    b64_json: null
                });
            }
        }
    }

    // Also check for inline data
    if (data?.choices?.[0]?.message?.image) {
        images.push({
            url: data.choices[0].message.image,
            b64_json: null
        });
    }

    return images;
}

// Generate via Google API (Premium)
async function generateViaGoogle(prompt, modelId, apiKey) {
    console.log('[Image] Google API request with model:', modelId);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Generate an image: ${prompt}` }]
                }],
                generationConfig: {
                    responseModalities: ['IMAGE', 'TEXT']
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Image] Google API error:', response.status, errorText);
        throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const images = [];

    for (const part of parts) {
        if (part.inlineData?.data) {
            images.push({
                b64_json: part.inlineData.data,
                mimeType: part.inlineData.mimeType || 'image/png',
                url: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
            });
        }
    }

    return images;
}

export default async function handler(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // GET - Return available models
    if (req.method === 'GET') {
        const hasGoogleKey = !!process.env.GOOGLE_API_KEY;

        return new Response(JSON.stringify({
            success: true,
            standard: Object.entries(STANDARD_MODELS).map(([key, m]) => ({ id: key, ...m })),
            premium: hasGoogleKey
                ? Object.entries(PREMIUM_MODELS).map(([key, m]) => ({ id: key, ...m }))
                : [],
            premiumAvailable: hasGoogleKey
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Get API keys
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;

    if (!openrouterKey) {
        return new Response(JSON.stringify({
            success: false,
            error: 'OPENROUTER_API_KEY not configured'
        }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const {
            prompt,
            model = 'gemini-flash',
            style = null,
            mode = 'standard' // 'standard' or 'premium'
        } = body;

        if (!prompt || prompt.trim().length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Prompt is required'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Enhance prompt with style
        let enhancedPrompt = prompt;
        if (style && style !== 'none') {
            enhancedPrompt = `${style} style: ${prompt}`;
        }

        let images = [];
        let usedModel = model;
        let usedProvider = 'openrouter';

        // Check if premium mode requested and Google key available
        if (mode === 'premium' && googleKey && PREMIUM_MODELS[model]) {
            try {
                const modelConfig = PREMIUM_MODELS[model];
                images = await generateViaGoogle(enhancedPrompt, modelConfig.id, googleKey);
                usedProvider = 'google';
                console.log('[Image] Premium generation successful');
            } catch (e) {
                console.log('[Image] Premium failed, falling back to standard:', e.message);
                // Fall back to standard
            }
        }

        // Standard mode or fallback
        if (images.length === 0) {
            const modelConfig = STANDARD_MODELS[model] || STANDARD_MODELS['gemini-flash'];
            usedModel = model;

            try {
                images = await generateViaOpenRouter(enhancedPrompt, modelConfig.id, openrouterKey);
                usedProvider = 'openrouter';
            } catch (e) {
                // Try fallback model
                if (model !== 'gemini-flash') {
                    console.log('[Image] Trying fallback to gemini-flash...');
                    images = await generateViaOpenRouter(
                        enhancedPrompt,
                        STANDARD_MODELS['gemini-flash'].id,
                        openrouterKey
                    );
                    usedModel = 'gemini-flash';
                } else {
                    throw e;
                }
            }
        }

        if (images.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No images generated. Try a different prompt.'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[Image] Success! Generated ${images.length} image(s) via ${usedProvider}`);

        return new Response(JSON.stringify({
            success: true,
            data: images,
            model: usedModel,
            provider: usedProvider,
            prompt: prompt
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (e) {
        console.error('[Image] Error:', e);
        return new Response(JSON.stringify({
            success: false,
            error: e.message || 'Image generation failed'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
