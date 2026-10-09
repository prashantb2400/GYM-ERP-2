import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

const DEFAULT_SECRET = 'gymerp-offline-local-jwt-secret-minimum-32-chars-long';

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.PGRST_JWT_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  
  // If stored in salt:hash format
  if (storedHash.includes(':')) {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return key === hash;
  }

  // Fallback for direct plain password comparison
  return password === storedHash;
}

export async function signLocalToken(user: {
  id: string;
  email: string;
  gym_id?: string;
  role?: string;
  name?: string;
}): Promise<string> {
  const secretKey = getJwtSecretKey();
  
  const token = await new SignJWT({
    sub: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    app_role: user.role || 'owner',
    gym_id: user.gym_id || '',
    email: user.email,
    user_metadata: {
      name: user.name || user.email,
    },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);

  return token;
}

export async function verifyLocalToken(token: string) {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}
