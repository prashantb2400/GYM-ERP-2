interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// Global in-memory cache for API rate limiting
const ipRateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup counter
let callsSinceLastCleanup = 0;

function cleanupExpired() {
  const now = Date.now();
  for (const [key, record] of ipRateLimitStore.entries()) {
    if (record.resetAt <= now) {
      ipRateLimitStore.delete(key);
    }
  }
}

/**
 * Checks if a given identifier exceeds the allowed rate limit.
 *
 * @param identifier Unique key, typically an IP address or user ID + action
 * @param limit Max allowed requests within window
 * @param windowSeconds Window duration in seconds (default 60s)
 * @returns Object indicating if request is allowed, plus retryAfter if rejected
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowSeconds: number = 60
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  callsSinceLastCleanup++;
  if (callsSinceLastCleanup > 100) {
    callsSinceLastCleanup = 0;
    cleanupExpired();
  }

  const existing = ipRateLimitStore.get(identifier);

  if (!existing || existing.resetAt <= now) {
    ipRateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  existing.count++;
  return { allowed: true };
}

/**
 * Extracts client IP safely from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown-client';
}
