import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { knowledgeService } from './index';

/**
 * Build a fake fetch Response whose body reader yields the given SSE chunks,
 * one network read at a time, so events can be split across chunk boundaries.
 */
function sseResponse(chunks) {
    const encoder = new TextEncoder();
    let index = 0;
    return {
        ok: true,
        body: {
            getReader: () => ({
                async read() {
                    if (index < chunks.length) {
                        return { done: false, value: encoder.encode(chunks[index++]) };
                    }
                    return { done: true, value: undefined };
                },
            }),
        },
    };
}

describe('knowledgeService.streamArticle', () => {
    let fetchMock;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reassembles SSE events split across chunk boundaries and dispatches by type', async () => {
        fetchMock.mockResolvedValue(
            sseResponse([
                'data: {"type":"metad',
                'ata","sources":[{"title":"A"}]}\n\nda',
                'ta: {"type":"content","delta":"Hel"}\n\ndata: {"type":"content","delta":"lo"}\n',
                '\ndata: [DONE]\n\ndata: {"type":"content","delta":"never"}\n\n',
            ])
        );

        const onMetadata = vi.fn();
        const onContent = vi.fn();
        const onError = vi.fn();

        await knowledgeService.streamArticle({ query: 'test', onMetadata, onContent, onError });

        expect(onError).not.toHaveBeenCalled();
        expect(onMetadata).toHaveBeenCalledTimes(1);
        expect(onMetadata).toHaveBeenCalledWith([{ title: 'A' }]);
        expect(onContent.mock.calls).toEqual([['Hel'], ['lo']]);
    });

    it('surfaces server error events even when the message mentions JSON', async () => {
        fetchMock.mockResolvedValue(
            sseResponse([
                'data: {"type":"error","message":"Upstream model returned invalid JSON"}\n\n',
            ])
        );

        const onError = vi.fn();

        await knowledgeService.streamArticle({ query: 'test', onError });

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0].message).toBe('Upstream model returned invalid JSON');
    });

    it('skips malformed JSON lines instead of failing the stream', async () => {
        fetchMock.mockResolvedValue(
            sseResponse(['data: {not json}\n\ndata: {"type":"content","delta":"ok"}\n\n'])
        );

        const onContent = vi.fn();
        const onError = vi.fn();

        await knowledgeService.streamArticle({ query: 'test', onContent, onError });

        expect(onError).not.toHaveBeenCalled();
        expect(onContent.mock.calls).toEqual([['ok']]);
    });

    it('reports non-OK responses through onError', async () => {
        fetchMock.mockResolvedValue({ ok: false });

        const onError = vi.fn();

        await knowledgeService.streamArticle({ query: 'test', onError });

        expect(onError).toHaveBeenCalledTimes(1);
    });
});
