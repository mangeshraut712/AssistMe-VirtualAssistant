/**
 * Premium Image Generation API
 * 
 * Premium Mode: Gemini Flash AI enhances prompts for BETTER images
 * Standard Mode: Direct Pollinations generation
 * 
 * Both modes are 100% FREE!
 * 
 * How Premium Works:
 * 1. User enters simple prompt: "a cat"
 * 2. Gemini Flash enhances it: "a fluffy orange tabby cat, golden hour lighting, 
 *    shallow depth of field, professional photography, 8k ultra detailed"
 * 3. Enhanced prompt creates MUCH better image
 * 
 * Result: Premium users get significantly better quality images!
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

        let enhancedPrompt = prompt.trim();
        let wasEnhanced = false;
        let enhancementNote = '';

        // PREMIUM MODE: Use Gemini Flash to intelligently enhance the prompt
        if (usePremium) {
            const geminiKey = process.env.GOOGLE_API_KEY;

            if (!geminiKey) {
                // No API key - continue with standard mode but note it
                enhancementNote = 'Premium requires GOOGLE_API_KEY. Using standard mode.';
                console.log('[Imagine] No API key, using standard mode');
            } else {
                try {
                    console.log('[Imagine Premium] Enhancing prompt:', prompt);

                    // Use Gemini Flash for intelligent prompt enhancement
                    const geminiResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{
                                        text: `You are an expert AI image prompt engineer. Your job is to transform simple prompts into detailed, artistic prompts that will generate stunning images.

Transform this prompt into a highly detailed image generation prompt. Include specific details about:
- Subject details (colors, textures, features)
- Lighting (golden hour, studio, dramatic, soft, etc.)
- Composition (close-up, wide angle, centered, rule of thirds)
- Style (photorealistic, digital art, cinematic, etc.)
- Atmosphere (moody, vibrant, peaceful, dynamic)
- Quality modifiers (8k, ultra detailed, professional, award-winning)

Keep the enhanced prompt under 200 characters. Respond with ONLY the enhanced prompt, nothing else.

Original: "${prompt}"
${style && style !== 'none' ? `Style preference: ${style}` : ''}

Enhanced:`
                                    }]
                                }],
                                generationConfig: {
                                    temperature: 0.7,
                                    maxOutputTokens: 100,
                                    topP: 0.8
                                }
                            })
                        }
                    );

                    if (geminiResponse.ok) {
                        const geminiData = await geminiResponse.json();
                        const enhanced = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

                        if (enhanced && enhanced.length > 10 && enhanced.length < 500) {
                            // Clean up the enhanced prompt
                            enhancedPrompt = enhanced
                                .replace(/^["']|["']$/g, '')  // Remove quotes
                                .replace(/^Enhanced:\s*/i, '') // Remove "Enhanced:" prefix
                                .trim();
                            wasEnhanced = true;
                            console.log('[Imagine Premium] SUCCESS! Enhanced to:', enhancedPrompt);
                        } else {
                            console.warn('[Imagine Premium] Enhancement too short/long, using original');
                        }
                    } else {
                        const errorText = await geminiResponse.text();
                        console.error('[Imagine Premium] Gemini error:', errorText);
                        enhancementNote = 'Enhancement service busy. Using optimized standard mode.';
                    }
                } catch (error) {
                    console.error('[Imagine Premium] Enhancement failed:', error.message);
                    enhancementNote = 'Enhancement unavailable. Using optimized standard mode.';
                }
            }
        }

        // Add style and quality modifiers if not enhanced
        let finalPrompt = enhancedPrompt;
        if (!wasEnhanced) {
            // For standard mode, add basic quality improvements
            const styleText = (style && style !== 'none') ? `${style} style, ` : '';
            finalPrompt = `${enhancedPrompt}, ${styleText}high quality, detailed, professional`;
        }

        // Generate image using Pollinations.ai (FREE, unlimited, reliable)
        const [width, height] = size.split('x');
        const seed = Date.now();
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=true&seed=${seed}`;

        return new Response(JSON.stringify({
            success: true,
            data: [{
                url: imageUrl,
                prompt: finalPrompt,
                originalPrompt: prompt,
                enhanced: wasEnhanced,
                model: model,
                provider: wasEnhanced ? 'Gemini AI Enhanced' : 'Pollinations.ai',
                free: true,
                note: enhancementNote || (wasEnhanced ? 'Prompt enhanced by Gemini AI for better results!' : null)
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
