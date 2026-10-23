import { describe, expect, it } from 'vitest';
import { createInitialChatState, loadStoredConversations, trimForRegenerate } from './conversations';

function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
    };
}

describe('loadStoredConversations', () => {
    it('returns null for corrupt or non-array storage instead of throwing', () => {
        expect(loadStoredConversations(memoryStorage({ conversations: '{not-json' }))).toBeNull();
        expect(loadStoredConversations(memoryStorage({ conversations: '{"id":1}' }))).toBeNull();
        expect(loadStoredConversations(memoryStorage())).toBeNull();
    });

    it('drops messages that are not role/content pairs', () => {
        const storage = memoryStorage({
            conversations: JSON.stringify([
                { id: 4, title: 'Kept', messages: [{ role: 'user', content: 'hi' }, { content: 'no role' }, null] },
            ]),
        });
        expect(loadStoredConversations(storage)).toEqual([
            { id: 4, title: 'Kept', messages: [{ role: 'user', content: 'hi' }] },
        ]);
    });
});

describe('createInitialChatState', () => {
    it('ignores a stored chat id that is not a finite id in the list', () => {
        const storage = memoryStorage({
            conversations: JSON.stringify([{ id: 7, title: 'Only', messages: [] }]),
            currentChatId: 'nope',
        });
        expect(createInitialChatState(storage, 99).currentChatId).toBe(7);
    });
});

describe('trimForRegenerate', () => {
    it('keeps the user turn before the selected assistant reply', () => {
        const messages = [
            { role: 'user', content: 'first' },
            { role: 'assistant', content: 'answer' },
            { role: 'user', content: 'second' },
        ];
        expect(trimForRegenerate(messages, 1)).toEqual([{ role: 'user', content: 'first' }]);
        expect(trimForRegenerate(messages, 0)).toBeNull();
        expect(trimForRegenerate(messages, 3)).toBeNull();
    });
});
