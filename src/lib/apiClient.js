export function createApiClient({ baseUrl = '' } = {}) {
    const base = String(baseUrl || '').replace(/\/+$/, '');

    const buildUrl = (path) => {
        if (!path.startsWith('/')) return `${base}/${path}`;
        return `${base}${path}`;
    };

    const parseErrorMessage = (payload) => {
        if (!payload) return 'Request failed';
        if (typeof payload === 'string') return payload;
        if (payload.detail) return String(payload.detail);
        if (payload.error) return typeof payload.error === 'string' ? payload.error : String(payload.error.message || payload.error);
        if (payload.message) return String(payload.message);
        return 'Request failed';
    };

    const normalizeChatTextResponse = (payload) => {
        if (!payload || typeof payload !== 'object') {
            return { response: '', usage: { tokens: 0 }, model: null };
        }

        if (payload.response !== undefined) {
            return payload;
        }

        if (Array.isArray(payload.choices) && payload.choices[0]?.message?.content !== undefined) {
            const content = String(payload.choices[0].message.content ?? '');
            const totalTokens = payload.usage?.total_tokens ?? payload.usage?.tokens ?? 0;
            return {
                response: content,
                usage: { tokens: totalTokens },
                model: payload.model ?? null,
                id: payload.id,
            };
        }

        return { response: '', usage: { tokens: 0 }, model: payload.model ?? null };
    };

    const readResponsePayload = async (response) => {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await response.json();
        }
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    };

    const chatText = async ({ messages, model, temperature, max_tokens, preferred_language, signal } = {}) => {
        const response = await fetch(buildUrl('/api/chat/text'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                model,
                temperature,
                max_tokens,
                preferred_language,
            }),
            signal,
        });

        const payload = await readResponsePayload(response);

        if (!response.ok) {
            throw new Error(parseErrorMessage(payload));
        }

        if (payload && typeof payload === 'object' && payload.error) {
            throw new Error(parseErrorMessage(payload));
        }

        return normalizeChatTextResponse(payload);
    };

    const streamChat = async ({ messages, model, temperature, max_tokens, preferred_language, onDelta, onMetadata, onDone, onError, signal } = {}) => {
        const response = await fetch(buildUrl('/api/chat/stream'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                model,
                temperature,
                max_tokens,
                preferred_language,
            }),
            signal,
        });

        if (!response.ok) {
            const payload = await readResponsePayload(response).catch(() => null);
            throw new Error(parseErrorMessage(payload || response.statusText));
        }

        if (!response.body) {
            throw new Error('Streaming not supported by this response');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        let currentEvent = null;

        const handleData = (eventName, data) => {
            if (!data || typeof data !== 'object') return;

            const event = eventName || null;

            if (event === 'delta' && data.content !== undefined) {
                onDelta && onDelta(String(data.content), data);
                return;
            }

            if (event === 'done') {
                onDone && onDone(data);
                return;
            }

            if (event === 'error') {
                onError && onError(data);
                return;
            }

            if (data.content !== undefined) {
                onDelta && onDelta(String(data.content), data);
                return;
            }

            if (data.metadata !== undefined) {
                onMetadata && onMetadata(data.metadata, data);
                return;
            }

            if (data.usage !== undefined && onMetadata) {
                onMetadata({ usage: data.usage, model: data.model, id: data.id }, data);
                return;
            }

            if (data.error !== undefined) {
                onError && onError(data.error);
                return;
            }

            if (data.message !== undefined && event === 'error') {
                onError && onError(data);
            }
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const rawLine of lines) {
                const line = rawLine.trimEnd();
                if (!line.trim()) {
                    currentEvent = null;
                    continue;
                }

                if (line.startsWith('event:')) {
                    currentEvent = line.slice('event:'.length).trim();
                    continue;
                }

                if (line.startsWith('data:')) {
                    const jsonText = line.slice('data:'.length).trim();
                    if (!jsonText || jsonText === '[DONE]') continue;

                    try {
                        const data = JSON.parse(jsonText);
                        handleData(currentEvent, data);
                    } catch {
                        continue;
                    }
                }
            }
        }
    };

    return {
        chatText,
        streamChat,
    };
}
