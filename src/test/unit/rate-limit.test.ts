import { describe, it, expect } from 'vitest';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

describe('Rate Limiter', () => {
  it('allows requests within limit', () => {
    const key = `test-ip-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, 5, 10);
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks requests exceeding limit', () => {
    const key = `test-ip-blocked-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(key, 3, 10);
      expect(result.allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('extracts client IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
    });
    expect(getClientIp(req)).toBe('203.0.113.195');
  });

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '198.51.100.22' },
    });
    expect(getClientIp(req)).toBe('198.51.100.22');
  });

  it('returns unknown-client when no ip headers exist', () => {
    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('unknown-client');
  });
});
