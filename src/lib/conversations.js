const DEFAULT_TITLE = 'New Chat';

function sanitizeMessage(message) {
    if (!message || typeof message !== 'object') return null;
    if (typeof message.role !== 'string' || typeof message.content !== 'string') return null;
    return {
        role: message.role,
        content: message.content,
        ...(message.metadata && typeof message.metadata === 'object' ? { metadata: message.metadata } : {}),
        ...(Array.isArray(message.followUps) ? { followUps: message.followUps } : {}),
    };
}

function sanitizeConversation(conversation, index) {
    if (!conversation || typeof conversation !== 'object') return null;
    const id = typeof conversation.id === 'number' && Number.isFinite(conversation.id)
        ? conversation.id
        : index + 1;
    const title = typeof conversation.title === 'string' && conversation.title.trim()
        ? conversation.title
        : DEFAULT_TITLE;
    const messages = Array.isArray(conversation.messages)
        ? conversation.messages.map(sanitizeMessage).filter(Boolean)
        : [];
    return { id, title, messages };
}

export function loadStoredConversations(storage = globalThis.localStorage) {
    try {
        const saved = storage?.getItem('conversations');
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return null;
        const conversations = parsed.map(sanitizeConversation).filter(Boolean);
        return conversations.length > 0 ? conversations : null;
    } catch {
        return null;
    }
}

export function createInitialChatState(storage = globalThis.localStorage, now = Date.now()) {
    const stored = loadStoredConversations(storage);
    const conversations = stored || [{ id: now, title: DEFAULT_TITLE, messages: [] }];
    let currentChatId = conversations[0].id;
    try {
        const saved = storage?.getItem('currentChatId');
        if (saved) {
            const id = Number(saved);
            if (Number.isFinite(id) && conversations.some((conversation) => conversation.id === id)) {
                currentChatId = id;
            }
        }
    } catch {
        currentChatId = conversations[0].id;
    }
    return { conversations, currentChatId };
}

/**
 * Drop an assistant reply and everything after it so the preceding user turn
 * can be sent again. Returns null when that index is not an assistant reply
 * with a user message before it.
 */
export function trimForRegenerate(messages, index) {
    if (!Array.isArray(messages) || !Number.isInteger(index)) return null;
    if (index < 0 || index >= messages.length) return null;
    if (messages[index]?.role !== 'assistant') return null;
    const trimmed = messages.slice(0, index);
    if (!trimmed.some((message) => message.role === 'user' && message.content.trim())) return null;
    return trimmed;
}
