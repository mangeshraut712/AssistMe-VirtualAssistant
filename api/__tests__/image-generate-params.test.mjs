import { describe, expect, it } from 'vitest';
import { parseImageDimensions, sanitizeImageModel } from '../images/generate.js';

describe('sanitizeImageModel', () => {
  it('allows known Pollinations models and rejects query injection', () => {
    expect(sanitizeImageModel('flux-anime')).toBe('flux-anime');
    expect(sanitizeImageModel('turbo')).toBe('turbo');
    expect(sanitizeImageModel('flux&url=https://evil.example')).toBe('flux');
    expect(sanitizeImageModel(undefined)).toBe('flux');
  });
});

describe('parseImageDimensions', () => {
  it('parses and clamps width/height and ignores extra query text', () => {
    expect(parseImageDimensions('512x768')).toEqual({ width: 512, height: 768 });
    expect(parseImageDimensions('10x10')).toEqual({ width: 64, height: 64 });
    expect(parseImageDimensions('99999x99999')).toEqual({ width: 2048, height: 2048 });
    expect(parseImageDimensions('1024x1024&referrer=https://evil.example')).toEqual({
      width: 1024,
      height: 1024,
    });
    expect(parseImageDimensions('fooxbar')).toEqual({ width: 1024, height: 1024 });
  });
});
