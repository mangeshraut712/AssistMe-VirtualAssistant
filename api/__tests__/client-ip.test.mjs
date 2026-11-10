import { describe, expect, it } from 'vitest';
import { getClientIp } from '../chat.js';

describe('getClientIp', () => {
  it('uses the rightmost X-Forwarded-For hop, not a client-prepended one', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4, 10.0.0.1, 198.51.100.20',
    });
    expect(getClientIp(headers)).toBe('198.51.100.20');
  });

  it('falls back to x-real-ip and then unknown', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9');
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});
