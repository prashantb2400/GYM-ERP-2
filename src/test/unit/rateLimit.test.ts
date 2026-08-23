import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, clearRateLimitStore, rateLimitHeaders } from '@/lib/server/rateLimit';

describe('Sliding Window Rate Limiter', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it('should allow requests within limit', () => {
    const key = 'test_client_1';
    const limit = 5;
    const windowMs = 60000;

    for (let i = 0; i < limit; i++) {
      const res = checkRateLimit(key, limit, windowMs);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(limit - 1 - i);
    }
  });

  it('should block requests that exceed limit', () => {
    const key = 'test_client_2';
    const limit = 3;
    const windowMs = 60000;

    // Use up all 3 tokens
    checkRateLimit(key, limit, windowMs);
    checkRateLimit(key, limit, windowMs);
    checkRateLimit(key, limit, windowMs);

    // 4th request must be rejected
    const blockedRes = checkRateLimit(key, limit, windowMs);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.resetMs).toBeGreaterThan(0);
  });

  it('should format standard rate limit response headers', () => {
    const res = checkRateLimit('test_headers', 10, 60000);
    const headers = rateLimitHeaders(res);

    expect(headers['X-RateLimit-Limit']).toBe('10');
    expect(headers['X-RateLimit-Remaining']).toBe('9');
    expect(Number(headers['X-RateLimit-Reset'])).toBeGreaterThan(0);
  });

  it('should isolate rate limits across different keys', () => {
    const limit = 2;
    checkRateLimit('client_a', limit, 60000);
    checkRateLimit('client_a', limit, 60000);
    expect(checkRateLimit('client_a', limit, 60000).allowed).toBe(false);

    // client_b should still be allowed
    expect(checkRateLimit('client_b', limit, 60000).allowed).toBe(true);
  });
});
