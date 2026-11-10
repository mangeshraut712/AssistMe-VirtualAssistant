import { describe, expect, it } from 'vitest';
import { resolveChatMaxTokens } from '../chat.js';

describe('resolveChatMaxTokens', () => {
  it('falls back for missing, non-numeric, and non-positive values', () => {
    expect(resolveChatMaxTokens(undefined)).toBe(2048);
    expect(resolveChatMaxTokens('nope')).toBe(2048);
    expect(resolveChatMaxTokens(0)).toBe(2048);
    expect(resolveChatMaxTokens(-1)).toBe(2048);
  });

  it('keeps valid counts and caps the upper bound', () => {
    expect(resolveChatMaxTokens(256)).toBe(256);
    expect(resolveChatMaxTokens('512')).toBe(512);
    expect(resolveChatMaxTokens(999999)).toBe(128000);
  });
});
