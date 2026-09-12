import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PATCH, DELETE } from '@/app/api/leads/route';
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

describe('/api/leads Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/leads', () => {
    it('returns 401 when unauthenticated', async () => {
      (getAuthUser as any).mockResolvedValue({ user: null, error: 'Unauthorized' });
      const req = new Request('http://localhost:3000/api/leads');
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

      const req = new Request('http://localhost:3000/api/leads');
      const res = await GET(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('No gym workspace');
    });

    it('handles missing leads table gracefully without 500 crash', async () => {
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
        if (table === 'leads') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST205', message: "Could not find the table 'leads' in the schema cache" },
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/leads');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.tableMissing).toBe(true);
      expect(json.leads).toEqual([]);
    });

    it('returns leads list when table exists', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-user-1' }, error: null });

      const mockLeads = [
        { id: 'lead-1', name: 'John Doe', phone: '9876543210', status: 'new', interest: 'membership' },
      ];

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
        if (table === 'leads') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: mockLeads,
              error: null,
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/leads');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.tableMissing).toBe(false);
      expect(json.leads).toHaveLength(1);
      expect(json.leads[0].name).toBe('John Doe');
    });
  });

  describe('POST /api/leads', () => {
    it('validates required fields (name, phone)', async () => {
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

      const req = new Request('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', phone: '' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('required');
    });

    it('creates new lead successfully', async () => {
      (getAuthUser as any).mockResolvedValue({ user: { id: 'auth-user-1' }, error: null });

      const newLead = { id: 'lead-new', name: 'Alice Smith', phone: '9988776655', status: 'new' };

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
        if (table === 'leads') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: newLead, error: null }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alice Smith', phone: '9988776655', interest: 'membership' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.lead.name).toBe('Alice Smith');
    });
  });

  describe('DELETE /api/leads', () => {
    it('deletes lead record scoped to gym', async () => {
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
        if (table === 'leads') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            error: null,
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/leads?id=lead-1', {
        method: 'DELETE',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
