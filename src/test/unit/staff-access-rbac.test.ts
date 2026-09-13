import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_PERMISSIONS, UserRole } from '@/types/auth';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/utils/permissions';
import { maskPhone } from '@/lib/utils/format';
import { GET as getSettings } from '@/app/api/settings/route';
import { POST as broadcastWa } from '@/app/api/whatsapp/broadcast/route';
import { DELETE as deleteLead } from '@/app/api/leads/route';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/server/auth-helper', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/platform/auth', () => ({
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/lib/server/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

describe('Staff Access Control & RBAC Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Role Boundaries & Default Permissions', () => {
    it('grants full management privileges to owner', () => {
      expect(hasPermission('owner', [], 'members.delete')).toBe(true);
      expect(hasPermission('owner', [], 'invoices.delete')).toBe(true);
      expect(hasPermission('owner', [], 'settings.manage')).toBe(true);
      expect(hasPermission('owner', [], 'whatsapp.broadcast')).toBe(true);
      expect(hasPermission('owner', [], 'cron.manage')).toBe(true);
    });

    it('restricts receptionist from deleting invoices, members, and viewing analytics', () => {
      // Allowed
      expect(hasPermission('receptionist', [], 'members.add')).toBe(true);
      expect(hasPermission('receptionist', [], 'members.edit')).toBe(true);
      expect(hasPermission('receptionist', [], 'invoices.create')).toBe(true);
      expect(hasPermission('receptionist', [], 'due.collect')).toBe(true);
      expect(hasPermission('receptionist', [], 'attendance.mark')).toBe(true);

      // Blocked
      expect(hasPermission('receptionist', [], 'members.delete')).toBe(false);
      expect(hasPermission('receptionist', [], 'invoices.delete')).toBe(false);
      expect(hasPermission('receptionist', [], 'analytics.view')).toBe(false);
      expect(hasPermission('receptionist', [], 'settings.manage')).toBe(false);
      expect(hasPermission('receptionist', [], 'whatsapp.broadcast')).toBe(false);
      expect(hasPermission('receptionist', [], 'cron.manage')).toBe(false);
    });

    it('strictly isolates trainers to workouts, diets, and attendance', () => {
      // Allowed
      expect(hasPermission('trainer', [], 'attendance.mark')).toBe(true);
      expect(hasPermission('trainer', [], 'diet.manage')).toBe(true);
      expect(hasPermission('trainer', [], 'exercise.manage')).toBe(true);
      expect(hasPermission('trainer', [], 'members.view')).toBe(true);

      // Blocked from all billing, dues, settings, leads, and analytics
      expect(hasPermission('trainer', [], 'invoices.view')).toBe(false);
      expect(hasPermission('trainer', [], 'invoices.create')).toBe(false);
      expect(hasPermission('trainer', [], 'due.view')).toBe(false);
      expect(hasPermission('trainer', [], 'due.collect')).toBe(false);
      expect(hasPermission('trainer', [], 'analytics.view')).toBe(false);
      expect(hasPermission('trainer', [], 'settings.view')).toBe(false);
      expect(hasPermission('trainer', [], 'leads.view')).toBe(false);
      expect(hasPermission('trainer', [], 'whatsapp.send')).toBe(false);
    });
  });

  describe('2. Member Contact Privacy Masking', () => {
    it('masks phone numbers correctly for privacy protection', () => {
      expect(maskPhone('9876543210')).toBe('+91 98******10');
      expect(maskPhone('+919876543210')).toBe('+91 98******10');
      expect(maskPhone('919876543210')).toBe('+91 98******10');
      expect(maskPhone('')).toBe('');
      expect(maskPhone(null)).toBe('');
    });
  });

  describe('3. GET /api/settings Secret Redaction', () => {
    it('redacts sensitive integration secrets and keys for non-owner staff', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-trainer-1' }, error: null });

      const mockGymWithSecrets = {
        id: 'gym-123',
        name: 'Alpha Gym',
        whatsapp_access_token: 'secret_meta_token_12345',
        whatsapp_phone_number_id: 'phone_id_9999',
        razorpay_key_secret: 'rzp_sec_xyz888',
        cctv_ip: '192.168.1.50',
        cctv_password: 'super_secret_camera_pass',
        pan: 'ABCDE1234F',
        settings: {
          whatsapp_token: 'raw_wa_tok',
          cctv_enabled: true,
        },
      };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'u-trainer', gym_id: 'gym-123', role: 'trainer', permissions: [] },
            }),
          };
        }
        if (table === 'gyms') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockGymWithSecrets }, error: null }),
          };
        }
        if (table === 'plans') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
      });

      const req = new Request('http://localhost:3000/api/settings');
      const res = await getSettings(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.gym.name).toBe('Alpha Gym');
      // Verify secrets are redacted
      expect(json.gym.whatsapp_access_token).toBeUndefined();
      expect(json.gym.razorpay_key_secret).toBeUndefined();
      expect(json.gym.cctv_password).toBeUndefined();
      expect(json.gym.pan).toBeUndefined();
      expect(json.gym.settings.whatsapp_token).toBeUndefined();
    });
  });

  describe('4. WhatsApp Broadcast Authorization', () => {
    it('blocks non-owner staff from triggering mass broadcasts', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'trainer-auth-1' } }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { gym_id: 'gym-123', role: 'trainer', permissions: ['attendance.mark'] },
          }),
        }),
      };
      (createClient as any).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost:3000/api/whatsapp/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phones: ['9876543210'],
          templateName: 'gym_broadcast_promo',
          paramsPerPhone: [{ name: 'Member' }],
        }),
      });

      const res = await broadcastWa(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Forbidden');
    });
  });

  describe('5. CRM Lead Deletion Authorization', () => {
    it('rejects lead deletion when caller lacks leads.manage or owner role', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'staff-auth-1' }, error: null });

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { gym_id: 'gym-123', role: 'receptionist', permissions: ['members.view'] },
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
      });

      const req = new Request('http://localhost:3000/api/leads?id=lead-999', {
        method: 'DELETE',
      });

      const res = await deleteLead(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Forbidden');
    });
  });
});
