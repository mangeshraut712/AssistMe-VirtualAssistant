import { describe, expect, it } from 'vitest';
import { MAX_TTS_CHARS, ttsPayloadLength } from '../tts.js';

describe('TTS length cap', () => {
  it('counts trimmed text and a style prefix and flags over-limit payloads', () => {
    expect(ttsPayloadLength('hello', null)).toBe(5);
    expect(ttsPayloadLength('  hi  ', 'warm')).toBe(2 + 4 + 20);
    expect(ttsPayloadLength('a'.repeat(MAX_TTS_CHARS), null)).toBe(MAX_TTS_CHARS);
    expect(ttsPayloadLength('a'.repeat(MAX_TTS_CHARS + 1), null)).toBeGreaterThan(MAX_TTS_CHARS);
  });
});
