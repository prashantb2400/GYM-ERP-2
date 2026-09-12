import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/settings/route';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/server/auth-helper', () => ({
  getAuthUser: vi.fn(),
}));

describe('/api/settings Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings', () => {
    it('returns 401 when unauthenticated', async () => {
      (getAuthUser as any).mockResolvedValue({ user: null, error: 'Unauthorized' });
      const req = new Request('http://localhost:3000/api/settings');
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 404 when user has no gym workspace', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-user-1' }, error: null });
      (supabaseAdmin.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      }));

      const req = new Request('http://localhost:3000/api/settings');
      const res = await GET(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain('No gym workspace');
    });

    it('returns gym details and plans when authenticated', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-user-1' }, error: null });

      const mockGym = { id: 'gym-123', name: 'Iron Fitness', phone: '9876543210' };
      const mockPlans = [{ id: 'plan-1', name: 'Gold Annual' }];

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'u1', gym_id: 'gym-123', role: 'owner', permissions: ['*'] },
            }),
          };
        }
        if (table === 'gyms') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockGym, error: null }),
          };
        }
        if (table === 'plans') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPlans, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      });

      const req = new Request('http://localhost:3000/api/settings');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.gym.name).toBe('Iron Fitness');
      expect(json.plans).toHaveLength(1);
    });
  });

  describe('PATCH /api/settings', () => {
    it('rejects users without settings.manage permission', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-trainer-1' }, error: null });
      (supabaseAdmin.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'u2', gym_id: 'gym-123', role: 'trainer', permissions: ['attendance.mark'] },
        }),
      }));

      const req = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Gym Name' }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Forbidden');
    });

    it('allows owners to update gym settings successfully', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-owner-1' }, error: null });

      const updatedGym = { id: 'gym-123', name: 'Titan Gym' };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'u1', gym_id: 'gym-123', role: 'owner', permissions: ['*'] },
            }),
          };
        }
        if (table === 'gyms') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: updatedGym, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      });

      const req = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Titan Gym' }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.gym.name).toBe('Titan Gym');
    });
  });
});
