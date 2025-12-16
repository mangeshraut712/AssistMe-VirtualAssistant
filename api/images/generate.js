/**
 * Image Generation API Edge Function
 * 
 * FREE Image Generation using Pollinations.ai
 * No API key required! Completely free unlimited usage.
 * 
 * Endpoint: POST /api/images/generate
 * 
 * @version 4.0.0
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

// Available Models (via Pollinations.ai - ALL FREE!)
const MODELS = {
    'flux': {
        id: 'flux',
        name: 'Flux',
        description: 'High quality, fast (default)',
        free: true
    },
    'flux-realism': {
        id: 'flux-realism',
        name: 'Flux Realism',
        description: 'Photorealistic images',
        free: true
    },
    'flux-anime': {
        id: 'flux-anime',
        name: 'Flux Anime',
        description: 'Anime style images',
        free: true
    },
    'flux-3d': {
        id: 'flux-3d',
        name: 'Flux 3D',
        description: '3D rendered images',
        free: true
    },
    'turbo': {
        id: 'turbo',
        name: 'Turbo',
        description: 'Ultra fast generation',
        free: true
    }
};

// Size mappings
const SIZE_MAP = {
    '1024x1024': { width: 1024, height: 1024 },
    '1792x1024': { width: 1792, height: 1024 },
    '1024x1792': { width: 1024, height: 1792 },
    '1536x1152': { width: 1536, height: 1152 },
    '512x512': { width: 512, height: 512 }
};

export default async function handler(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // GET - Return available models
    if (req.method === 'GET') {
        return new Response(JSON.stringify({
            success: true,
            provider: 'pollinations.ai',
            note: 'Completely FREE - No API key required!',
            models: Object.entries(MODELS).map(([key, m]) => ({ id: key, ...m }))
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

    try {
        const body = await req.json();
        const {
            prompt,
            model = 'flux',
            size = '1024x1024',
            style = null
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

        // Enhance prompt with Gemini if API key is present
        let enhancedPrompt = prompt;
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (apiKey) {
            try {
                const enhanceRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://assistme.app"
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.0-flash-exp:free",
                        messages: [{
                            role: "user",
                            content: `Refine this image prompt to be more descriptive and artistic for an AI image generator. concise, high quality. Prompt: '${prompt}'. Output ONLY the improved prompt text.`
                        }]
                    })
                });

                if (enhanceRes.ok) {
                    const enhanceData = await enhanceRes.json();
                    const newPrompt = enhanceData.choices[0]?.message?.content?.trim();
                    if (newPrompt) {
                        console.log(`[Image] Enhanced prompt: '${prompt}' -> '${newPrompt}'`);
                        enhancedPrompt = newPrompt.replace(/^["']|["']$/g, ''); // Remove quotes
                    }
                }
            } catch (e) {
                console.warn("[Image] Prompt enhancement failed, using original:", e);
            }
        }

        // Get dimensions
        const dimensions = SIZE_MAP[size] || SIZE_MAP['1024x1024'];

        // Append style
        let finalPrompt = enhancedPrompt;
        if (style && style !== 'none') {
            const styleMap = {
                'photorealistic': 'photorealistic, highly detailed, 8k',
                'digital-art': 'digital art, vibrant colors, detailed',
                'anime': 'anime style, japanese animation, colorful',
                'oil-painting': 'oil painting, classical art, brushstrokes',
                '3d-render': '3D render, octane render, volumetric lighting',
                'watercolor': 'watercolor painting, soft colors, artistic',
                'minimalist': 'minimalist, clean, simple, modern design'
            };
            const styleCheck = styleMap[style] || style;
            finalPrompt = `${finalPrompt}, ${styleCheck}`;
        }

        // Use model-specific enhancements
        const modelConfig = MODELS[model] || MODELS['flux'];
        let modelParam = '';
        if (model === 'flux-realism') {
            modelParam = '&model=flux-realism';
        } else if (model === 'flux-anime') {
            modelParam = '&model=flux-anime';
            finalPrompt = `${finalPrompt}, anime style`;
        } else if (model === 'flux-3d') {
            modelParam = '&model=flux-3d';
            finalPrompt = `${finalPrompt}, 3D render`;
        } else if (model === 'turbo') {
            modelParam = '&model=turbo';
        }

        // Encode prompt for URL
        const encodedPrompt = encodeURIComponent(finalPrompt);

        // Generate unique seed for variety
        const seed = Math.floor(Math.random() * 1000000);

        // Build Pollinations URL
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dimensions.width}&height=${dimensions.height}&seed=${seed}&nologo=true${modelParam}`;

        console.log(`[Image] Pollinations URL: ${imageUrl.substring(0, 100)}...`);

        // Skip HEAD check to avoid timeouts - Pollinations usually works
        // The frontend will handle load errors

        return new Response(JSON.stringify({
            success: true,
            data: [{
                url: imageUrl,
                width: dimensions.width,
                height: dimensions.height
            }],
            model: modelConfig.name,
            provider: 'pollinations.ai',
            prompt: finalPrompt
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
