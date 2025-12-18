/**
 * Premium Image Generation API using Google Gemini
 * 
 * FREE TIER: 500 images/day via Gemini 2.5 Flash Image
 * Uses Gemini's native image generation capability
 * 
 * Premium Mode: Gemini 2.5 Flash Image (FREE)
 * Standard Mode: Pollinations.ai (FREE)
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const { prompt, model = 'flux', size = '1024x1024', style, usePremium = false } = await req.json();

        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Prompt required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // PREMIUM MODE: Use Gemini 2.5 Flash Image (FREE)
        if (usePremium) {
            const geminiKey = process.env.GOOGLE_API_KEY;

            if (!geminiKey) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Premium mode requires GOOGLE_API_KEY. Please add it to your Vercel environment variables.',
                    fallbackToStandard: true
                }), {
                    status: 503,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            try {
                // Build enhanced prompt with style
                let finalPrompt = prompt;
                if (style && style !== 'none') {
                    finalPrompt = `${prompt}, ${style} style`;
                }

                // Call Gemini API for image generation
                // Model: gemini-2.5-flash (supports IMAGE response modality)
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: `Generate a high-quality image: ${finalPrompt}`
                                }]
                            }],
                            generationConfig: {
                                temperature: 1,
                                responseModalities: ['IMAGE'],  // Request image output
                            }
                        })
                    }
                );

                if (!geminiResponse.ok) {
                    const errorData = await geminiResponse.json();
                    throw new Error(errorData.error?.message || 'Gemini API error');
                }

                const geminiData = await geminiResponse.json();

                // Extract image data
                const imageData = geminiData.candidates?.[0]?.content?.parts?.[0];

                if (imageData && imageData.inlineData) {
                    // Convert base64 to data URL
                    const imageUrl = `data:${imageData.inlineData.mimeType};base64,${imageData.inlineData.data}`;

                    return new Response(JSON.stringify({
                        success: true,
                        data: [{
                            url: imageUrl,
                            prompt: finalPrompt,
                            originalPrompt: prompt,
                            enhanced: true,
                            model: 'Gemini 2.0 Flash',
                            provider: 'Google Gemini',
                            free: true
                        }]
                    }), {
                        status: 200,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                } else {
                    throw new Error('No image data in Gemini response');
                }

            } catch (error) {
                console.error('[Imagine Premium] Gemini error:', error);
                // Fall back to standard mode
                return new Response(JSON.stringify({
                    success: false,
                    error: `Gemini error: ${error.message}. Falling back to standard mode.`,
                    fallbackToStandard: true
                }), {
                    status: 503,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // STANDARD MODE: Use Pollinations.ai (FREE)
        let finalPrompt = prompt;
        if (style && style !== 'none') {
            finalPrompt = `${prompt}, ${style} style`;
        }

        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?model=${model}&width=${size.split('x')[0]}&height=${size.split('x')[1]}&nologo=true&enhance=true`;

        return new Response(JSON.stringify({
            success: true,
            data: [{
                url: imageUrl,
                prompt: finalPrompt,
                originalPrompt: prompt,
                enhanced: false,
                model: model,
                provider: 'Pollinations.ai',
                free: true
            }]
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[Imagine] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Image generation failed'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
