/**
 * Chat API Edge Function
 * 
 * Supports both OpenRouter (legacy) and Vercel AI Gateway
 * Uses Vercel AI SDK for streaming
 */

export const config = {
    runtime: 'edge',
};

const FALLBACK_MODELS = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'google/gemma-3-27b-it:free',
];

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const _rateLimitState = new Map();

function getClientIp(headers) {
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIp = headers.get('x-real-ip');
    if (realIp) return realIp.trim();
    return 'unknown';
}

function checkRateLimit(ip) {
    const now = Date.now();
    const key = ip || 'unknown';
    const entry = _rateLimitState.get(key);
    if (!entry || entry.resetAt <= now) {
        const next = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
        _rateLimitState.set(key, next);
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: next.resetAt };
    }
    if (entry.count >= RATE_LIMIT_MAX) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }
    entry.count += 1;
    _rateLimitState.set(key, entry);
    return { allowed: true, remaining: Math.max(0, RATE_LIMIT_MAX - entry.count), resetAt: entry.resetAt };
}

function uniqueStrings(values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const v = typeof value === 'string' ? value.trim() : '';
        if (!v) continue;
        if (seen.has(v)) continue;
        seen.add(v);
        result.push(v);
    }
    return result;
}

function shouldRetryStatus(status) {
    return status === 400 || status === 404 || status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

const ALLOWED_ORIGINS = new Set([
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://assist-me-virtual-assistant.vercel.app',
]);

const VERCEL_ORIGIN_REGEX =
    /^https:\/\/assist-me-virtual-assistant(-[a-z0-9]+)?\.vercel\.app$/;

function normaliseOrigin(value) {
    if (!value) return null;
    const origin = String(value).trim().replace(/\/+$/, '');
    return origin || null;
}

function resolveAllowedOrigin(origin) {
    const normalised = normaliseOrigin(origin);
    if (!normalised) return null;

    if (ALLOWED_ORIGINS.has(normalised)) return normalised;
    if (VERCEL_ORIGIN_REGEX.test(normalised)) return normalised;

    const envAppUrl = normaliseOrigin(process.env.APP_URL);
    if (envAppUrl && normalised === envAppUrl) return normalised;

    const envVercelUrl = normaliseOrigin(process.env.VERCEL_URL);
    if (envVercelUrl) {
        const candidate = envVercelUrl.startsWith('http')
            ? envVercelUrl
            : `https://${envVercelUrl}`;
        if (normalised === candidate) return normalised;
    }

    const envCustom = process.env.CORS_ALLOW_ORIGINS;
    if (envCustom) {
        for (const entry of envCustom.split(',')) {
            const configured = normaliseOrigin(entry);
            if (configured && normalised === configured) return normalised;
        }
    }

    return null;
}

export default async function handler(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Determine if this is a text (non-streaming) or stream request
    const isTextEndpoint = path.includes('/text');

    const allowedOrigin = resolveAllowedOrigin(req.headers.get('origin'));
    const corsBaseHeaders = {
        'Vary': 'Origin',
        ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                ...corsBaseHeaders,
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Rate limiting
    const ip = getClientIp(req.headers);
    const limit = checkRateLimit(ip);
    if (!limit.allowed) {
        const retryAfterSeconds = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: {
                ...corsBaseHeaders,
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfterSeconds),
            },
        });
    }

    try {
        const body = await req.json();
        const { messages, model, temperature, max_tokens, preferred_language } = body;
        const stream = body.stream !== undefined ? body.stream : !isTextEndpoint;

        // Check for API key - support both OpenRouter and AI Gateway
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
        const apiKey = openRouterKey || aiGatewayKey;

        if (!apiKey) {
            return new Response(JSON.stringify({
                error: 'API key not configured. Set OPENROUTER_API_KEY or AI_GATEWAY_API_KEY in Vercel Environment Variables.'
            }), {
                status: 500,
                headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Validate messages
        if (!Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: 'Invalid request: messages must be a non-empty array' }), {
                status: 400,
                headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (messages.length > 50) {
            return new Response(JSON.stringify({ error: 'Invalid request: too many messages' }), {
                status: 400,
                headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
            });
        }

        for (const message of messages) {
            if (!message || typeof message !== 'object') {
                return new Response(JSON.stringify({ error: 'Invalid request: malformed message' }), {
                    status: 400,
                    headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
                });
            }
            const role = String(message.role || '').trim();
            const content = message.content;
            if (!role || typeof content !== 'string') {
                return new Response(JSON.stringify({ error: 'Invalid request: each message must include role and content' }), {
                    status: 400,
                    headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
                });
            }
            if (!['system', 'user', 'assistant', 'tool'].includes(role)) {
                return new Response(JSON.stringify({ error: 'Invalid request: unsupported message role' }), {
                    status: 400,
                    headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
                });
            }
            if (content.length > 20000) {
                return new Response(JSON.stringify({ error: 'Invalid request: message content too long' }), {
                    status: 400,
                    headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        const requestedModel = (model || process.env.OPENROUTER_DEFAULT_MODEL || FALLBACK_MODELS[0]).trim();
        const modelsToTry = uniqueStrings([requestedModel, ...FALLBACK_MODELS]);

        let response = null;
        let selectedModel = requestedModel;
        let lastStatus = 500;
        let lastErrorText = '';

        // Try models with fallback
        for (const attemptModel of modelsToTry.slice(0, 3)) {
            selectedModel = attemptModel;
            try {
                response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://assist-me-virtual-assistant.vercel.app',
                        'X-Title': 'AssistMe Virtual Assistant',
                    },
                    body: JSON.stringify({
                        model: attemptModel,
                        messages: messages,
                        stream: stream,
                        temperature: temperature || 0.7,
                        max_tokens: max_tokens || 2048,
                    }),
                });
            } catch (e) {
                lastStatus = 502;
                lastErrorText = String(e?.message || e);
                response = null;
                continue;
            }

            if (response.ok) break;

            lastStatus = response.status;
            lastErrorText = await response.text().catch(() => response.statusText);

            if (shouldRetryStatus(response.status)) {
                response = null;
                continue;
            }

            break;
        }

        if (!response || !response.ok) {
            return new Response(JSON.stringify({ error: `API error: ${lastErrorText || 'Request failed'}` }), {
                status: lastStatus,
                headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Non-streaming response
        if (!stream) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content ?? '';
            const usage = data.usage ?? { total_tokens: 0 };

            const transformedResponse = {
                response: content,
                usage: {
                    tokens: usage.total_tokens || 0,
                    prompt_tokens: usage.prompt_tokens || 0,
                    completion_tokens: usage.completion_tokens || 0,
                },
                model: data.model || selectedModel,
                id: data.id,
            };

            return new Response(JSON.stringify(transformedResponse), {
                status: 200,
                headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Streaming response - transform to frontend format
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let buffer = '';

        const transformStream = new TransformStream({
            async transform(chunk, controller) {
                const text = decoder.decode(chunk, { stream: true });
                buffer += text;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            // Handle content updates
                            if (data.choices?.[0]?.delta?.content) {
                                const content = data.choices[0].delta.content;
                                accumulatedContent += content;
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                            }

                            // Handle metadata/usage updates
                            if (data.usage || data.choices?.[0]?.finish_reason) {
                                const metadata = {
                                    usage: data.usage || {
                                        prompt_tokens: Math.ceil(JSON.stringify(messages).length / 4),
                                        completion_tokens: Math.ceil(accumulatedContent.length / 4),
                                        total_tokens: Math.ceil((JSON.stringify(messages).length + accumulatedContent.length) / 4)
                                    },
                                    model: data.model || selectedModel || 'unknown',
                                    finish_reason: data.choices?.[0]?.finish_reason ?? null,
                                    id: data.id
                                };
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata })}\n\n`));
                            }
                        } catch (e) {
                            // Ignore parse errors for partial lines
                        }
                    }
                }
            },
            flush(controller) {
                // Process any remaining buffer
                if (buffer.trim() !== '' && buffer.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(buffer.slice(6));
                        if (data.choices?.[0]?.delta?.content) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data.choices[0].delta.content })}\n\n`));
                        }
                    } catch (e) { }
                }
            }
        });

        return new Response(response.body.pipeThrough(transformStream), {
            headers: {
                ...corsBaseHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
            status: 500,
            headers: { ...corsBaseHeaders, 'Content-Type': 'application/json' },
        });
    }
}
