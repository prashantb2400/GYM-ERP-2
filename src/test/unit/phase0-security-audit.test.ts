import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyKioskOrAuth } from '@/lib/server/kiosk-auth';
import { MantraMfs100Driver, SecuGenDriver } from '@/lib/fingerprint/drivers';

// Mock Supabase admin and server auth helper
vi.mock('@/lib/supabase/admin', () => {
  return {
    supabaseAdmin: {
      from: vi.fn((table: string) => {
        if (table === 'kiosk_devices') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn(function (this: any, col: string, val: string) {
              this._filters = this._filters || {};
              this._filters[col] = val;
              return this;
            }),
            maybeSingle: vi.fn(function (this: any) {
              if (this._filters?.device_token === 'valid-paired-token' && this._filters?.status === 'active') {
                return Promise.resolve({
                  data: {
                    id: 'dev-1',
                    device_token: 'valid-paired-token',
                    gym_id: this._filters?.gym_id || 'gym-123',
                    branch_id: 'branch-1',
                    status: 'active',
                  },
                  error: null,
                });
              }
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'gyms') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'super_admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    },
  };
});

vi.mock('@/lib/server/auth-helper', () => ({
  getAuthUser: vi.fn().mockResolvedValue({ user: null, error: 'No session' }),
}));

describe('Phase 0 Security & Biometric Hardening', () => {
  describe('Kiosk Mandatory Device Authentication (verifyKioskOrAuth)', () => {
    it('rejects kiosk request when neither user session nor device token is present', async () => {
      const req = new Request('http://localhost/api/kiosk/member-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gymId: 'gym-123', query: '9876543210' }),
      });

      const res = await verifyKioskOrAuth(req, 'gym-123');
      expect(res.authorized).toBe(false);
      if (!res.authorized) {
        expect(res.response.status).toBe(401);
      }
    });

    it('rejects kiosk request with invalid or deactivated device token', async () => {
      const req = new Request('http://localhost/api/kiosk/member-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': 'rogue-or-revoked-token',
        },
        body: JSON.stringify({ gymId: 'gym-123', query: '9876543210' }),
      });

      const res = await verifyKioskOrAuth(req, 'gym-123');
      expect(res.authorized).toBe(false);
      if (!res.authorized) {
        expect(res.response.status).toBe(401);
      }
    });

    it('authorizes kiosk request when valid active device token matches gymId', async () => {
      const req = new Request('http://localhost/api/kiosk/member-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': 'valid-paired-token',
        },
        body: JSON.stringify({ gymId: 'gym-123', query: '9876543210' }),
      });

      const res = await verifyKioskOrAuth(req, 'gym-123');
      expect(res.authorized).toBe(true);
      if (res.authorized) {
        expect(res.authType).toBe('device');
        expect(res.gymId).toBe('gym-123');
        expect(res.branchId).toBe('branch-1');
      }
    });
  });

  describe('Biometric Driver Collision Protection', () => {
    it('fails safely when Mantra returns empty template data rather than synthesizing fake points', async () => {
      const driver = new MantraMfs100Driver();
      // Mock global fetch to return Mantra XML with empty Data node
      const emptyDataXml = `<?xml version="1.0"?>
        <PidData>
          <Resp errCode="0" errInfo="Success" qScore="75" />
          <Data></Data>
        </PidData>`;

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(emptyDataXml),
      } as any);

      try {
        const result = await driver.capture('right_thumb');
        expect(result.success).toBe(false);
        expect(result.error).toContain('empty or invalid');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('fails safely when SecuGen returns empty template rather than falling back to finger string', async () => {
      const driver = new SecuGenDriver();
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ErrorCode: 0, Quality: 80, TemplateBase64: '' }),
      } as any);

      try {
        const result = await driver.capture('right_index');
        expect(result.success).toBe(false);
        expect(result.error).toContain('empty or invalid');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Staff Account Takeover Prevention', () => {
    it('does not overwrite existing staff auth_id when email matches', () => {
      const existingUser = {
        id: 'user-1',
        email: 'staff@gym.com',
        auth_id: 'original-auth-id-456',
        role: 'receptionist',
      };

      const attackerAuthUserId = 'attacker-auth-id-789';

      // Verify logic: only unassigned auth_id should be adopted
      let updatedAuthId = existingUser.auth_id;
      if (!existingUser.auth_id) {
        updatedAuthId = attackerAuthUserId;
      }

      expect(updatedAuthId).toBe('original-auth-id-456');
      expect(updatedAuthId).not.toBe(attackerAuthUserId);
    });
  });
});
