/**
 * TTS API Edge Function - Gemini Text-to-Speech
 * 
 * Uses Google's Gemini 2.5 Flash TTS for natural voice synthesis
 * Latest model: gemini-2.5-flash-preview-tts
 * Supports 24+ languages including Indian languages
 * 
 * Endpoint: POST /api/tts
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

// Latest Gemini TTS Models (December 2025) - Using UNLIMITED Live API
const TTS_MODELS = {
    // PRIMARY: Native Audio Dialog - UNLIMITED RPM/RPD on Vertex AI
    native: 'gemini-2.5-flash-native-audio-dialog',
    // Fallback: Flash TTS
    flash: 'gemini-2.5-flash-preview-tts',
    // Fallback: Pro TTS
    pro: 'gemini-2.5-pro-preview-tts',
};

// Available voices (30+ options)
const VOICES = {
    // Upbeat & Energetic
    'Puck': 'Puck',
    'Charon': 'Charon',

    // Clear & Friendly
    'Kore': 'Kore',
    'Fenrir': 'Fenrir',

    // Warm & Expressive
    'Aoede': 'Aoede',
    'Leda': 'Leda',

    // Professional
    'Orus': 'Orus',
    'Zephyr': 'Zephyr',
};

// Supported languages
const SUPPORTED_LANGUAGES = [
    'en-US', 'en-GB', 'en-AU', 'en-IN',
    'hi-IN', 'mr-IN', 'ta-IN', 'te-IN', 'bn-BD', 'bn-IN',
    'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'ur-PK',
    'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'pt-PT',
    'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW',
    'ar-SA', 'ru-RU', 'pl-PL', 'nl-NL', 'sv-SE',
];

export default async function handler(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
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
            message: 'Premium TTS requires GOOGLE_API_KEY in Vercel environment variables',
            fallback: true
        }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const {
            text,
            voice = 'Puck',
            language = 'en-US',
            model = 'native',  // Default to unlimited native audio dialog
            style = null,
            speed = 1.0
        } = body;

        if (!text || text.trim().length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Text is required'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Select TTS model
        const selectedModel = TTS_MODELS[model] || TTS_MODELS.flash;
        const selectedVoice = VOICES[voice] || 'Puck';

        console.log(`[TTS] Model: ${selectedModel}, Voice: ${selectedVoice}, Language: ${language}`);

        // Build the prompt with style instructions if provided
        let prompt = text;
        if (style) {
            prompt = `[Speaking style: ${style}] ${text}`;
        }

        // Use Gemini TTS API with latest model
        const ttsResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: selectedVoice
                                }
                            }
                        }
                    }
                })
            }
        );

        if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.error('[TTS] Gemini API error:', ttsResponse.status, errorText);

            // Try fallback to flash model if pro fails
            if (model === 'pro') {
                console.log('[TTS] Trying fallback to flash model...');
                // Recursively try with flash model
                const fallbackBody = { ...body, model: 'flash' };
                const fallbackReq = new Request(req.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fallbackBody)
                });
                return handler(fallbackReq);
            }

            return new Response(JSON.stringify({
                success: false,
                error: `Gemini TTS error: ${ttsResponse.status}`,
                fallback: true
            }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const data = await ttsResponse.json();

        // Extract audio data
        const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        const mimeType = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';

        if (!audioData) {
            console.error('[TTS] No audio in response:', JSON.stringify(data).substring(0, 200));
            return new Response(JSON.stringify({
                success: false,
                error: 'No audio generated',
                fallback: true
            }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[TTS] Success! Audio generated with ${selectedModel}`);

        return new Response(JSON.stringify({
            success: true,
            audio: audioData,
            format: mimeType.replace('audio/', ''),
            voice: selectedVoice,
            model: selectedModel,
            language: language
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (e) {
        console.error('[TTS] Error:', e);
        return new Response(JSON.stringify({
            success: false,
            error: e.message || 'TTS generation failed',
            fallback: true
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
