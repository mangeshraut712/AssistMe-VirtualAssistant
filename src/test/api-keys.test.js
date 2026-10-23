import { afterEach, describe, expect, it } from 'vitest';
import geminiKey from '../../api/gemini/key.js';
import xaiKey from '../../api/xai/key.js';

const ORIGINAL_GOOGLE = process.env.GOOGLE_API_KEY;
const ORIGINAL_XAI = process.env.XAI_API_KEY;

afterEach(() => {
    if (ORIGINAL_GOOGLE === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = ORIGINAL_GOOGLE;
    if (ORIGINAL_XAI === undefined) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = ORIGINAL_XAI;
});

async function call(handler, origin) {
    const headers = origin ? { origin } : undefined;
    return handler(new Request('https://assistme.example/api/key', { headers }));
}

describe('API key endpoints', () => {
    it('does not give the Gemini key to an unlisted origin', async () => {
        process.env.GOOGLE_API_KEY = 'unit-test-google-key';
        const denied = await call(geminiKey, 'https://evil.example');
        expect(denied.status).toBe(403);
        expect(await denied.text()).not.toContain('unit-test-google-key');
        expect(denied.headers.get('access-control-allow-origin')).toBeNull();

        const allowed = await call(geminiKey, 'https://mangeshraut712.github.io');
        expect(allowed.status).toBe(200);
        expect(allowed.headers.get('access-control-allow-origin')).toBe('https://mangeshraut712.github.io');
        expect((await allowed.json()).apiKey).toBe('unit-test-google-key');

        const sameOrigin = await call(geminiKey);
        expect(sameOrigin.status).toBe(200);
        expect(sameOrigin.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('does not give the xAI key to an unlisted origin', async () => {
        process.env.XAI_API_KEY = 'unit-test-xai-key';
        const denied = await call(xaiKey, 'https://evil.example');
        expect(denied.status).toBe(403);
        expect(await denied.text()).not.toContain('unit-test-xai-key');

        const allowed = await call(xaiKey, 'http://localhost:5173');
        expect(allowed.status).toBe(200);
        expect((await allowed.json()).apiKey).toBe('unit-test-xai-key');
    });
});
