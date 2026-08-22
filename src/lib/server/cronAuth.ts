import crypto from 'crypto';

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!secret || !authorization?.startsWith('Bearer ')) return false;

  const provided = Buffer.from(authorization.slice('Bearer '.length));
  const expected = Buffer.from(secret);

  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}
