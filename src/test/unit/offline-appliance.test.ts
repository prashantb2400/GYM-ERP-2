/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, signLocalToken, verifyLocalToken } from '@/lib/server/local-auth';

describe('Offline Local Authentication Engine', () => {
  it('hashes password and verifies successfully with correct password', () => {
    const password = 'StrongPassword123!';
    const hash = hashPassword(password);

    expect(hash).toContain(':');
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('WrongPassword', hash)).toBe(false);
  });

  it('signs and verifies JWT tokens using the offline secret', async () => {
    const userPayload = {
      id: 'test-user-id-1234',
      email: 'owner@localgym.com',
      gym_id: 'test-gym-id-5678',
      role: 'owner',
      name: 'Local Gym Owner',
    };

    const token = await signLocalToken(userPayload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verified = await verifyLocalToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe(userPayload.id);
    expect(verified?.email).toBe(userPayload.email);
    expect(verified?.app_role).toBe(userPayload.role);
    expect(verified?.gym_id).toBe(userPayload.gym_id);
  });

  it('rejects tampered or malformed tokens safely', async () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
    const verified = await verifyLocalToken(invalidToken);
    expect(verified).toBeNull();
  });
});
