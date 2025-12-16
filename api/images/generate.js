/**
 * Image Generation API Edge Function
 * 
 * Uses Google's Gemini & Imagen models for AI image generation
 * 
 * Available Models (December 2025):
 * - gemini-2.0-flash-exp-image-generation (Experimental, Free)
 * - gemini-2.5-flash-image (Free tier: 500/day)
 * - gemini-3-pro-image-preview (Higher quality)
 * - imagen-4.0-generate-001 (Premium)
 * 
 * Endpoint: POST /api/images/generate
 * 
 * @version 2.0.0
 * @date December 2025
 */

export const config = {
    runtime: 'edge',
};

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Available Image Generation Models
const IMAGE_MODELS = {
    // Free tier models
    'gemini-flash': {
        id: 'gemini-2.0-flash-exp-image-generation',
        name: 'Gemini Flash (Free)',
        description: 'Fast, experimental image generation',
        free: true
    },
    'gemini-2.5-flash': {
        id: 'gemini-2.5-flash-image',
        name: 'Gemini 2.5 Flash',
        description: 'High quality, 500 images/day free',
        free: true
    },
    'gemini-3-pro': {
        id: 'gemini-3-pro-image-preview',
        name: 'Gemini 3 Pro',
        description: 'Highest quality Gemini model',
        free: true
    },
    // Premium models (Imagen 4)
    'imagen-4': {
        id: 'imagen-4.0-generate-001',
        name: 'Imagen 4',
        description: 'Google\'s premium image model',
        free: false
    },
    'imagen-4-fast': {
        id: 'imagen-4.0-fast-generate-001',
        name: 'Imagen 4 Fast',
        description: 'Fast premium generation',
        free: false
    },
    'imagen-4-ultra': {
        id: 'imagen-4.0-ultra-generate-001',
        name: 'Imagen 4 Ultra',
        description: 'Ultra quality premium',
        free: false
    }
};

export default async function handler(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    // GET /api/images/generate - Return available models
    if (req.method === 'GET') {
        return new Response(JSON.stringify({
            success: true,
            models: Object.entries(IMAGE_MODELS).map(([key, model]) => ({
                id: key,
                ...model
            }))
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
        }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({
            success: false,
            error: 'GOOGLE_API_KEY not configured',
            message: 'Image generation requires GOOGLE_API_KEY in environment variables'
        }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const {
            prompt,
            model = 'gemini-2.5-flash',
            size = '1024x1024',
            num_images = 1,
            style = null,
            negative_prompt = null
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

        // Get model config
        const modelConfig = IMAGE_MODELS[model] || IMAGE_MODELS['gemini-2.5-flash'];
        const modelId = modelConfig.id;

        console.log(`[Image] Model: ${modelId}, Prompt: ${prompt.substring(0, 50)}...`);

        // Build enhanced prompt
        let enhancedPrompt = prompt;
        if (style) {
            enhancedPrompt = `${style} style: ${prompt}`;
        }
        if (negative_prompt) {
            enhancedPrompt += `. Avoid: ${negative_prompt}`;
        }

        // Use Gemini API for image generation
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `Generate an image: ${enhancedPrompt}` }]
                    }],
                    generationConfig: {
                        responseModalities: ["IMAGE", "TEXT"],
                        candidateCount: 1
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Image] API error:', response.status, errorText);

            // Try fallback to experimental model
            if (model !== 'gemini-flash') {
                console.log('[Image] Trying fallback to gemini-flash...');
                return handler(new Request(req.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...body, model: 'gemini-flash' })
                }));
            }

            return new Response(JSON.stringify({
                success: false,
                error: `Image generation failed: ${response.status}`,
                details: errorText.substring(0, 200)
            }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const data = await response.json();

        // Extract image data from response
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

        if (images.length === 0) {
            console.error('[Image] No images in response:', JSON.stringify(data).substring(0, 300));
            return new Response(JSON.stringify({
                success: false,
                error: 'No images generated',
                response: data
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[Image] Success! Generated ${images.length} image(s)`);

        return new Response(JSON.stringify({
            success: true,
            data: images,
            model: modelId,
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
