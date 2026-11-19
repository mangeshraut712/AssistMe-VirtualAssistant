import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../tts.js';

const ORIGIN = 'https://mangeshraut712.github.io';

describe('TTS pro -> flash fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('keeps the CORS origin on the fallback response', async () => {
    vi.stubEnv('GOOGLE_API_KEY', 'test-key');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('quota', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ inlineData: { data: 'UklGRg==', mimeType: 'audio/wav' } }] } }],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const res = await handler(
      new Request('https://example.test/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: JSON.stringify({ text: 'hello', model: 'pro' }),
      }),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('gemini-2.5-flash-preview-tts');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });
});
