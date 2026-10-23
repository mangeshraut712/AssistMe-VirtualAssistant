/**
 * Incremental SSE parser. Chunks may split a UTF-8 character or a JSON line.
 */
export function createSseReader() {
    let buffer = '';
    const decoder = new TextDecoder();

    const parse = (flush) => {
        const parts = buffer.split('\n');
        if (flush) {
            buffer = '';
        } else {
            buffer = parts.pop() ?? '';
        }

        const events = [];
        for (const part of parts) {
            const line = part.replace(/\r$/, '');
            if (!line.startsWith('data:')) continue;
            const dataStr = line.slice(5).trim();
            if (!dataStr) continue;
            if (dataStr === '[DONE]') {
                events.push({ type: 'done' });
                continue;
            }
            try {
                const data = JSON.parse(dataStr);
                if (data && typeof data === 'object') events.push(data);
            } catch {
                // Ignore a malformed event and keep reading.
            }
        }
        return events;
    };

    return {
        push(chunk) {
            buffer += decoder.decode(chunk, { stream: true });
            return parse(false);
        },
        finish() {
            buffer += decoder.decode();
            return parse(true);
        },
    };
}
