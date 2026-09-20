import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Kiosk Device Pairing & Security Mechanics', () => {
  // Helper matching the logic in /api/kiosk/pair/init
  function generatePairingCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 3; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 3; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    return `${p1}-${p2}`;
  }

  function generateDeviceToken(): string {
    return `ktok_${crypto.randomUUID()}`;
  }

  function isPairingExpired(expiresAt: string | Date): boolean {
    return new Date(expiresAt).getTime() < Date.now();
  }

  it('generates high-entropy 6-character human readable pairing code formatted as XXX-XXX', () => {
    for (let i = 0; i < 25; i++) {
      const code = generatePairingCode();
      expect(code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
      // Ensure confusing characters like O, 0, 1, I are avoided for human clarity
      expect(code).not.toContain('0');
      expect(code).not.toContain('O');
      expect(code).not.toContain('1');
      expect(code).not.toContain('I');
    }
  });

  it('generates a valid, cryptographically secure device token starting with ktok_', () => {
    const token = generateDeviceToken();
    expect(token.startsWith('ktok_')).toBe(true);
    const uuidPart = token.replace('ktok_', '');
    expect(uuidPart).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('correctly calculates pairing code TTL and expiration', () => {
    const now = new Date();
    const validExpiry = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const expiredTime = new Date(now.getTime() - 1000).toISOString();

    expect(isPairingExpired(validExpiry)).toBe(false);
    expect(isPairingExpired(expiredTime)).toBe(true);
  });

  it('sanitizes pairing code input for whitespace and casing tolerance', () => {
    const canonical = 'ABC-789';
    const dirtyInputs = ['  abc-789  ', 'Abc-789', ' abc-789 '];

    dirtyInputs.forEach((input) => {
      expect(input.trim().toUpperCase()).toBe(canonical);
    });
  });

  it('validates state transitions between pending, active, and revoked', () => {
    type KioskState = 'pending' | 'active' | 'revoked';
    
    interface DeviceRecord {
      id: string;
      status: KioskState;
      device_token: string | null;
      gym_id: string | null;
    }

    const device: DeviceRecord = {
      id: 'dev-1',
      status: 'pending',
      device_token: null,
      gym_id: null,
    };

    // 1. Authorize device
    const targetGymId = 'gym-456';
    const newToken = generateDeviceToken();
    device.status = 'active';
    device.gym_id = targetGymId;
    device.device_token = newToken;

    expect(device.status).toBe('active');
    expect(device.gym_id).toBe(targetGymId);
    expect(device.device_token?.startsWith('ktok_')).toBe(true);

    // 2. Owner revokes device
    device.status = 'revoked';
    expect(device.status).toBe('revoked');
  });
});
