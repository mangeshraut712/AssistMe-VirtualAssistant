export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { messages, model, stream = true } = await req.json();
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'OpenRouter API key not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://assist-me-virtual-assistant.vercel.app',
                'X-Title': 'AssistMe Virtual Assistant',
            },
            body: JSON.stringify({
                model: model || 'google/gemini-2.0-flash-001:free',
                messages: messages,
                stream: stream,
                include_usage: true, // Request usage data explicitly
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(JSON.stringify({ error: `OpenRouter API error: ${errorText}` }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!stream) {
            const data = await response.json();
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
            });
        }

        // Create a TransformStream to convert OpenRouter format to frontend format
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let buffer = ''; // Buffer for incomplete lines

        const transformStream = new TransformStream({
            async transform(chunk, controller) {
                const text = decoder.decode(chunk, { stream: true });
                buffer += text;

                const lines = buffer.split('\n');
                // Keep the last line in the buffer as it might be incomplete
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            // Handle content updates
                            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                const content = data.choices[0].delta.content;
                                accumulatedContent += content;
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                            }

                            // Handle metadata/usage updates
                            if (data.usage || (data.choices && data.choices[0].finish_reason)) {
                                const metadata = {
                                    usage: data.usage || {
                                        // Fallback estimation if usage not provided
                                        prompt_tokens: Math.ceil(JSON.stringify(messages).length / 4),
                                        completion_tokens: Math.ceil(accumulatedContent.length / 4),
                                        total_tokens: Math.ceil((JSON.stringify(messages).length + accumulatedContent.length) / 4)
                                    },
                                    model: data.model || model || 'unknown',
                                    finish_reason: data.choices ? data.choices[0].finish_reason : null,
                                    id: data.id
                                };
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata })}\n\n`));
                            }
                        } catch (e) {
                            // If JSON parse fails, it might be a weird partial line, just ignore or log
                            // But since we buffer, this should happen much less often for valid lines
                        }
                    }
                }
            },
            flush(controller) {
                // Process any remaining buffer
                if (buffer.trim() !== '' && buffer.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(buffer.slice(6));
                        // Handle content/metadata in the final chunk if needed
                    } catch (e) { }
                }
            }
        });

        return new Response(response.body.pipeThrough(transformStream), {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}
