import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/staff/route';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: {
      admin: {
        deleteUser: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/server/auth-helper', () => ({
  getAuthUser: vi.fn(),
}));

describe('/api/staff Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/staff', () => {
    it('returns 401 when unauthenticated', async () => {
      (getAuthUser as any).mockResolvedValue({ user: null, error: 'Unauthorized' });
      const req = new Request('http://localhost:3000/api/staff');
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 403 when user has no gym workspace', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-user-1' }, error: null });
      (supabaseAdmin.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      }));

      const req = new Request('http://localhost:3000/api/staff');
      const res = await GET(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('No gym workspace');
    });

    it('returns staff list enriched with branch names', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-user-1' }, error: null });

      const mockStaff = [
        { id: 'u1', name: 'Admin Owner', role: 'owner', branch_id: 'b1' },
        { id: 'u2', name: 'John Trainer', role: 'trainer', branch_id: null },
      ];
      const mockBranches = [{ id: 'b1', name: 'Downtown Branch' }];

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'u1', gym_id: 'gym-123', role: 'owner', permissions: ['*'] },
            }),
          };
        }
        if (table === 'branches') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockBranches, error: null }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/staff');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.staff).toHaveLength(2);
      expect(json.staff[0].branch_name).toBe('Downtown Branch');
      expect(json.staff[1].branch_name).toBeNull();
    });

    it('unpacks database error cleanly without generic unknown error message', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-user-1' }, error: null });

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection timeout', code: '57P01' },
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'u1', gym_id: 'gym-123', role: 'owner', permissions: ['*'] },
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/staff');
      const res = await GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Database connection timeout');
    });
  });

  describe('PATCH /api/staff', () => {
    it('prevents deactivating owner account', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-user-1' }, error: null });

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
        return {};
      });

      const req = new Request('http://localhost:3000/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'u1', is_active: false }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Owner accounts cannot be deactivated');
    });
  });

  describe('DELETE /api/staff', () => {
    it('prevents deleting gym owner account', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-user-1' }, error: null });

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
        return {};
      });

      const req = new Request('http://localhost:3000/api/staff?id=u1', {
        method: 'DELETE',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Cannot delete gym owner account');
    });
  });
});
