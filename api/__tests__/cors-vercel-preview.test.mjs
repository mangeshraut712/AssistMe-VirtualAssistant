import { describe, expect, it } from 'vitest';
import { resolveAllowedOrigin } from '../cors.js';

const cases = [
  ['https://assist-me-virtual-assistant.vercel.app', true],
  ['https://assist-me-virtual-assistant-git-fix-cors-team.vercel.app', false],
  ['https://assist-me-virtual-assistant-git-fix-cors-mangeshraut712.vercel.app', true],
  ['https://assist-me-virtual-assistant-git-my-feature-mangeshraut712.vercel.app', true],
  ['https://assist-me-virtual-assistant-abc123.vercel.app', false],
  ['https://assist-me-virtual-assistant-my-feature.vercel.app', false],
  ['https://assist-me-virtual-assistant-.vercel.app', false],
  ['https://assist-me-virtual-assistant-Evil.vercel.app', false],
  ['https://evil-assist-me-virtual-assistant.vercel.app', false],
  ['https://assist-me-virtual-assistant.evil.vercel.app', false],
  ['https://assist-me-virtual-assistant-git-x-otherteam.vercel.app', false],
];

describe('resolveAllowedOrigin', () => {
  it.each(cases)('%s allowed=%s', (origin, ok) => {
    const got = resolveAllowedOrigin(origin);
    expect(got === origin).toBe(ok);
  });
});
