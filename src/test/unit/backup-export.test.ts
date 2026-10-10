/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/backup/export/route';

vi.mock('@/lib/server/auth-helper', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { getAuthUser } from '@/lib/server/auth-helper';
import { supabaseAdmin } from '@/lib/supabase/admin';

describe('Database Backup Export API (/api/backup/export)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    (getAuthUser as any).mockResolvedValue({ user: null, error: 'Unauthorized' });

    const request = new Request('http://localhost:3000/api/backup/export');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('exports structured backup payload with member, plan, and invoice data', async () => {
    (getAuthUser as any).mockResolvedValue({
      user: { id: 'auth-user-99' },
      error: null,
    });

    const mockGym = { id: 'gym-123', name: 'Spartan Fitness' };
    const mockMembers = [{ id: 'm-1', name: 'Alex Johnson', phone: '9876543210' }];
    const mockPlans = [{ id: 'p-1', name: 'Annual Pass', price: 10000 }];
    const mockInvoices = [{ id: 'inv-1', invoice_no: 'INV-001', total_amount: 10000 }];

    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { gym_id: 'gym-123', role: 'owner' } }),
            }),
          }),
        };
      }
      if (table === 'gyms') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: mockGym }),
            }),
          }),
        };
      }
      if (table === 'members') {
        return {
          select: () => ({
            eq: async () => ({ data: mockMembers }),
          }),
        };
      }
      if (table === 'plans') {
        return {
          select: () => ({
            eq: async () => ({ data: mockPlans }),
          }),
        };
      }
      if (table === 'invoices') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: mockInvoices }),
              }),
            }),
          }),
        };
      }
      // default mock for other tables
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: [] }),
            }),
            limit: async () => ({ data: [] }),
          }),
        }),
      };
    });

    const request = new Request('http://localhost:3000/api/backup/export');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="gymerp-backup-Spartan_Fitness');

    const data = await response.json();
    expect(data.gymId).toBe('gym-123');
    expect(data.gym.name).toBe('Spartan Fitness');
    expect(data.members).toHaveLength(1);
    expect(data.members[0].name).toBe('Alex Johnson');
    expect(data.plans).toHaveLength(1);
    expect(data.invoices).toHaveLength(1);
    expect(data.recordCounts.members).toBe(1);
  });
});
