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
});
