/**
 * Premium Image Generation API using Google Gemini
 * 
 * Premium Mode: Uses Gemini's native image generation (FREE)
 * Standard Mode: Uses Pollinations.ai (FREE)
 * 
 * Both modes are 100% FREE!
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

        if (!prompt || !prompt.trim()) {
            return new Response(JSON.stringify({ error: 'Prompt required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Build the final prompt with style
        let finalPrompt = prompt.trim();
        if (style && style !== 'none') {
            finalPrompt = `${finalPrompt}, ${style} style, high quality, detailed`;
        }

        // PREMIUM MODE: Use Gemini's native image generation
        if (usePremium) {
            const geminiKey = process.env.GOOGLE_API_KEY;

            if (!geminiKey) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Premium requires GOOGLE_API_KEY. Add it to Vercel Environment Variables.',
                    fallbackToStandard: true
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            try {
                console.log('[Imagine Premium] Generating with Gemini:', finalPrompt);

                // Use Gemini 2.0 Flash with native image generation
                // Model: gemini-2.0-flash-preview-image-generation
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: `Generate an image: ${finalPrompt}`
                                }]
                            }],
                            generationConfig: {
                                responseModalities: ["IMAGE", "TEXT"],
                                temperature: 1.0
                            }
                        })
                    }
                );

                if (!geminiResponse.ok) {
                    const errorData = await geminiResponse.json().catch(() => ({}));
                    console.error('[Imagine Premium] Gemini error:', errorData);
                    throw new Error(errorData.error?.message || `Gemini API error: ${geminiResponse.status}`);
                }

                const geminiData = await geminiResponse.json();
                console.log('[Imagine Premium] Response received');

                // Extract image from response
                const parts = geminiData.candidates?.[0]?.content?.parts || [];
                let imageData = null;
                let textResponse = '';

                for (const part of parts) {
                    if (part.inlineData && part.inlineData.data) {
                        imageData = part.inlineData;
                    }
                    if (part.text) {
                        textResponse = part.text;
                    }
                }

                if (imageData) {
                    // Return base64 image as data URL
                    const mimeType = imageData.mimeType || 'image/png';
                    const imageUrl = `data:${mimeType};base64,${imageData.data}`;

                    console.log('[Imagine Premium] SUCCESS! Image generated');

                    return new Response(JSON.stringify({
                        success: true,
                        data: [{
                            url: imageUrl,
                            prompt: finalPrompt,
                            originalPrompt: prompt,
                            enhanced: false,
                            model: 'Gemini 2.0 Flash',
                            provider: 'Google Gemini AI',
                            free: true,
                            isBase64: true
                        }]
                    }), {
                        status: 200,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                } else {
                    console.warn('[Imagine Premium] No image in response, text:', textResponse);
                    throw new Error('Gemini did not return an image. Try a different prompt.');
                }

            } catch (error) {
                console.error('[Imagine Premium] Error:', error.message);
                return new Response(JSON.stringify({
                    success: false,
                    error: `Gemini error: ${error.message}. Falling back to standard mode.`,
                    fallbackToStandard: true
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // STANDARD MODE: Use Pollinations.ai (FREE, unlimited)
        const [width, height] = size.split('x');
        const seed = Date.now();
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=true&seed=${seed}`;

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
