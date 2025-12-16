/**
 * TTS API Edge Function - Gemini Text-to-Speech
 * 
 * Uses Google's Gemini 2.5 Flash TTS for natural voice synthesis
 * Supports 24+ languages including Indian languages
 * 
 * Endpoint: POST /api/tts
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

// Available voices
const VOICES = {
    'Puck': 'Puck',      // Upbeat, energetic
    'Charon': 'Charon',  // Deep, calm
    'Kore': 'Kore',      // Clear, friendly
    'Fenrir': 'Fenrir',  // Strong, confident
    'Aoede': 'Aoede',    // Warm, expressive
};

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
            message: 'Premium TTS requires GOOGLE_API_KEY in Vercel environment variables'
        }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const { text, voice = 'Puck', language } = body;

        if (!text || text.trim().length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Text is required'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Use Gemini TTS API
        const ttsResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `Speak the following text naturally: "${text}"` }]
                    }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: VOICES[voice] || 'Puck'
                                }
                            }
                        }
                    }
                })
            }
        );

        if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.error('[TTS] Gemini API error:', errorText);

            // If Gemini TTS fails, return a message that browser TTS should be used
            return new Response(JSON.stringify({
                success: false,
                error: 'Gemini TTS unavailable',
                fallback: true
            }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const data = await ttsResponse.json();

        // Check if we got audio data
        const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!audioData) {
            // No audio generated, fallback to text response
            return new Response(JSON.stringify({
                success: false,
                error: 'No audio generated',
                fallback: true
            }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({
            success: true,
            audio: audioData,
            format: 'wav',
            voice: voice
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
