/**
 * Premium Image Generation API
 * 
 * Premium Mode: Gemini AI enhances prompts for better results + Pollinations generation
 * Standard Mode: Direct Pollinations generation
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

        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Prompt required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        let enhancedPrompt = prompt;
        let wasEnhanced = false;

        // PREMIUM MODE: Use Gemini to enhance the prompt for better image generation
        if (usePremium) {
            const geminiKey = process.env.GOOGLE_API_KEY;

            if (geminiKey) {
                try {
                    // Use Gemini to create a better, more detailed prompt
                    const geminiResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{
                                        text: `You are an expert AI image prompt engineer. Transform this simple prompt into a highly detailed, artistic prompt for AI image generation. Include specific details about:
- Lighting (golden hour, studio lighting, dramatic shadows, etc.)
- Composition (rule of thirds, centered, wide angle, macro, etc.)
- Style (photorealistic, digital art, oil painting, etc.)
- Atmosphere (moody, vibrant, serene, dynamic, etc.)
- Technical quality (8k, ultra detailed, professional, etc.)

Keep the enhanced prompt under 250 characters. Respond with ONLY the enhanced prompt, no explanations.

Original prompt: "${prompt}"
${style && style !== 'none' ? `Desired style: ${style}` : ''}

Enhanced prompt:`
                                    }]
                                }],
                                generationConfig: {
                                    temperature: 0.8,
                                    maxOutputTokens: 100
                                }
                            })
                        }
                    );

                    if (geminiResponse.ok) {
                        const geminiData = await geminiResponse.json();
                        const enhanced = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                        if (enhanced && enhanced.length > 10) {
                            enhancedPrompt = enhanced.replace(/^["']|["']$/g, ''); // Remove quotes
                            wasEnhanced = true;
                            console.log('[Imagine Premium] Enhanced prompt:', enhancedPrompt);
                        }
                    }
                } catch (error) {
                    console.warn('[Imagine] Gemini enhancement failed:', error.message);
                    // Continue with original prompt
                }
            }
        }

        // Add style to prompt if not already enhanced with style
        let finalPrompt = enhancedPrompt;
        if (style && style !== 'none' && !wasEnhanced) {
            finalPrompt = `${enhancedPrompt}, ${style} style, high quality, detailed`;
        }

        // Generate image using Pollinations.ai (FREE, unlimited)
        const [width, height] = size.split('x');
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=true&seed=${Date.now()}`;

        return new Response(JSON.stringify({
            success: true,
            data: [{
                url: imageUrl,
                prompt: finalPrompt,
                originalPrompt: prompt,
                enhanced: wasEnhanced,
                model: model,
                provider: wasEnhanced ? 'Gemini AI + Pollinations' : 'Pollinations.ai',
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
