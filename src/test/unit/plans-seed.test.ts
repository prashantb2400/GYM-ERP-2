import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, STANDARD_GYM_PLANS } from '@/app/api/plans/seed/route';

vi.mock('@/lib/server/auth-helper', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/server/branch-scope', () => ({
  getBranchScope: vi.fn(),
  isBranchScopeError: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { getAuthUser } from '@/lib/server/auth-helper';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';
import { supabaseAdmin } from '@/lib/supabase/admin';

describe('POST /api/plans/seed (Gym 1-Click Starter Plans)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized requests with 401', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ user: null, error: 'Unauthorized' });

    const req = new Request('http://localhost/api/plans/seed', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('rejects non-owner / non-staff roles with 403', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ user: { id: 'user-1' } as any, error: null });
    vi.mocked(isBranchScopeError).mockReturnValueOnce(false);
    vi.mocked(getBranchScope).mockResolvedValueOnce({
      gymId: 'gym-1',
      branchId: null,
      role: 'trainer',
      isOwner: false,
    } as any);

    const req = new Request('http://localhost/api/plans/seed', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('detects existing plans and does not duplicate', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ user: { id: 'owner-1' } as any, error: null });
    vi.mocked(isBranchScopeError).mockReturnValueOnce(false);
    vi.mocked(getBranchScope).mockResolvedValueOnce({
      gymId: 'gym-1',
      branchId: null,
      role: 'owner',
      isOwner: true,
    } as any);

    vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValueOnce({ data: [{ id: 'p1', name: 'Existing Plan' }], error: null }),
    } as any);

    const req = new Request('http://localhost/api/plans/seed', { method: 'POST' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.alreadySeeded).toBe(true);
  });

  it('inserts 5 standard plans when gym has 0 plans', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ user: { id: 'owner-1' } as any, error: null });
    vi.mocked(isBranchScopeError).mockReturnValueOnce(false);
    vi.mocked(getBranchScope).mockResolvedValueOnce({
      gymId: 'gym-1',
      branchId: null,
      role: 'owner',
      isOwner: true,
    } as any);

    // First query: check existing -> empty
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
    } as any);

    // Second query: insert -> success
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValueOnce({ data: STANDARD_GYM_PLANS, error: null }),
    } as any);

    const req = new Request('http://localhost/api/plans/seed', { method: 'POST' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.alreadySeeded).toBe(false);
    expect(json.plans.length).toBe(5);
  });
});
