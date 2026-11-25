import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './apiClient';

function streamingResponse(chunks) {
    const encoder = new TextEncoder();
    let index = 0;

    return {
        ok: true,
        body: {
            getReader() {
                return {
                    async read() {
                        if (index >= chunks.length) return { done: true };
                        return { done: false, value: encoder.encode(chunks[index++]) };
                    },
                };
            },
        },
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('createApiClient streamChat', () => {
    it('flushes a terminal done event without a trailing newline', async () => {
        const onDone = vi.fn();
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValue(
                    streamingResponse([
                        'event: done\ndata: {"id":"request-1","usage":{"tokens":4}}',
                    ])
                )
        );

        await createApiClient().streamChat({ messages: [], onDone });

        expect(onDone).toHaveBeenCalledTimes(1);
        expect(onDone).toHaveBeenCalledWith({ id: 'request-1', usage: { tokens: 4 } });
    });

    it('surfaces server error events even when the message mentions JSON', async () => {
        const onError = vi.fn((err) => {
            const message = typeof err === 'string' ? err : err?.message || 'Stream error';
            throw new Error(message);
        });
        const onDelta = vi.fn();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                streamingResponse([
                    'data: {"content":"Hello"}\n\n',
                    'data: {"error":{"message":"Upstream model returned invalid JSON"}}\n\n',
                ])
            )
        );

        await expect(
            createApiClient().streamChat({ messages: [], onDelta, onError })
        ).rejects.toThrow('Upstream model returned invalid JSON');
        expect(onDelta).toHaveBeenCalledWith('Hello', expect.anything());
        expect(onError).toHaveBeenCalledTimes(1);
    });
});
