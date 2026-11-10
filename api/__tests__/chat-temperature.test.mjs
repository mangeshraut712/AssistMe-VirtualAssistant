import { describe, expect, it } from 'vitest';
import { resolveChatTemperature } from '../chat.js';

describe('resolveChatTemperature', () => {
  it('keeps temperature 0 instead of treating it as missing', () => {
    expect(resolveChatTemperature(0)).toBe(0);
    expect(resolveChatTemperature('0')).toBe(0);
  });

  it('falls back for missing or invalid values and clamps the 0-2 range', () => {
    expect(resolveChatTemperature(undefined)).toBe(0.7);
    expect(resolveChatTemperature('hot')).toBe(0.7);
    expect(resolveChatTemperature(1.2)).toBe(1.2);
    expect(resolveChatTemperature(9)).toBe(2);
    expect(resolveChatTemperature(-1)).toBe(0);
  });
});
