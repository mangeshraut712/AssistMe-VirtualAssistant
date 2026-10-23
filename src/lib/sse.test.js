import { describe, expect, it } from 'vitest';
import { createSseReader } from './sse';

describe('createSseReader', () => {
    it('reassembles a JSON event and a multibyte character split across chunks', () => {
        const payload = 'data: {"type":"content","delta":"🙂"}\n\n';
        const bytes = new TextEncoder().encode(payload);
        const splitAt = bytes.length - 2;
        const reader = createSseReader();

        expect(reader.push(bytes.slice(0, splitAt))).toEqual([]);
        expect(reader.push(bytes.slice(splitAt))).toEqual([
            { type: 'content', delta: '🙂' },
        ]);
    });

    it('emits done and keeps a trailing partial line until finish', () => {
        const reader = createSseReader();
        const first = new TextEncoder().encode('data: {"type":"content","delta":"hel');
        expect(reader.push(first)).toEqual([]);

        const second = new TextEncoder().encode('lo"}\ndata: [DONE]\n');
        expect(reader.push(second)).toEqual([
            { type: 'content', delta: 'hello' },
            { type: 'done' },
        ]);
    });
});
