import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isSuperAdmin } from '@/lib/platform/auth';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/platform/auth', () => ({
  isSuperAdmin: vi.fn(),
}));

describe('getBranchScope Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows owner access to all branches by default', async () => {
    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'user-owner-1',
          gym_id: 'gym-1',
          branch_id: 'branch-1',
          role: 'owner',
          is_active: true,
        },
      }),
    });

    const scope = await getBranchScope('auth-owner-1');
    expect(isBranchScopeError(scope)).toBe(false);
    if (!isBranchScopeError(scope)) {
      expect(scope.gymId).toBe('gym-1');
      expect(scope.branchId).toBeNull();
      expect(scope.isOwner).toBe(true);
      expect(scope.role).toBe('owner');
    }
  });

  it('allows owner to target a specific valid branch in their gym', async () => {
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-owner-1',
              gym_id: 'gym-1',
              branch_id: 'branch-1',
              role: 'owner',
              is_active: true,
            },
          }),
        };
      }
      if (table === 'branches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'branch-2' },
          }),
        };
      }
      return {};
    });

    const scope = await getBranchScope('auth-owner-1', { requestedBranchId: 'branch-2' });
    expect(isBranchScopeError(scope)).toBe(false);
    if (!isBranchScopeError(scope)) {
      expect(scope.gymId).toBe('gym-1');
      expect(scope.branchId).toBe('branch-2');
      expect(scope.isOwner).toBe(true);
    }
  });

  it('rejects owner targeting an invalid branch not in their gym', async () => {
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-owner-1',
              gym_id: 'gym-1',
              branch_id: 'branch-1',
              role: 'owner',
              is_active: true,
            },
          }),
        };
      }
      if (table === 'branches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
          }),
        };
      }
      return {};
    });

    const scope = await getBranchScope('auth-owner-1', { requestedBranchId: 'branch-other-gym' });
    expect(isBranchScopeError(scope)).toBe(true);
    if (isBranchScopeError(scope)) {
      expect(scope.status).toBe(400);
      expect(scope.error).toContain('Invalid branch ID');
    }
  });

  it('strictly confines staff to their assigned branch', async () => {
    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'user-staff-1',
          gym_id: 'gym-1',
          branch_id: 'branch-east',
          role: 'receptionist',
          is_active: true,
        },
      }),
    });

    const scope = await getBranchScope('auth-staff-1');
    expect(isBranchScopeError(scope)).toBe(false);
    if (!isBranchScopeError(scope)) {
      expect(scope.gymId).toBe('gym-1');
      expect(scope.branchId).toBe('branch-east');
      expect(scope.isOwner).toBe(false);
      expect(scope.role).toBe('receptionist');
    }
  });

  it('prevents staff from accessing a different branch', async () => {
    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'user-staff-1',
          gym_id: 'gym-1',
          branch_id: 'branch-east',
          role: 'receptionist',
          is_active: true,
        },
      }),
    });

    const scope = await getBranchScope('auth-staff-1', { requestedBranchId: 'branch-west' });
    expect(isBranchScopeError(scope)).toBe(true);
    if (isBranchScopeError(scope)) {
      expect(scope.status).toBe(403);
      expect(scope.error).toContain('Cannot access records from another branch');
    }
  });

  it('rejects inactive or nonexistent user accounts', async () => {
    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
      }),
    });
    (isSuperAdmin as any).mockResolvedValue(false);

    const scope = await getBranchScope('auth-unknown');
    expect(isBranchScopeError(scope)).toBe(true);
    if (isBranchScopeError(scope)) {
      expect(scope.status).toBe(403);
    }
  });

  it('supports platform superadmins with requested parameters', async () => {
    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
      }),
    });
    (isSuperAdmin as any).mockResolvedValue(true);

    const scope = await getBranchScope('auth-superadmin', {
      requestedGymId: 'gym-target',
      requestedBranchId: 'branch-target',
    });

    expect(isBranchScopeError(scope)).toBe(false);
    if (!isBranchScopeError(scope)) {
      expect(scope.gymId).toBe('gym-target');
      expect(scope.branchId).toBe('branch-target');
      expect(scope.isSuperAdmin).toBe(true);
    }
  });
});
