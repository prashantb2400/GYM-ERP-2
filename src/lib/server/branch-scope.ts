import { supabaseAdmin } from '@/lib/supabase/admin';
import { isSuperAdmin } from '@/lib/platform/auth';

export interface BranchScope {
  gymId: string;
  branchId: string | null; // null means all branches (owners/superadmins)
  role: string;
  userId: string;
  isOwner: boolean;
  isSuperAdmin: boolean;
}

export interface BranchScopeError {
  error: string;
  status: number;
}

export function isBranchScopeError(
  result: BranchScope | BranchScopeError
): result is BranchScopeError {
  return 'error' in result;
}

/**
 * Resolves the gym and branch scope for an authenticated caller.
 * - Owners have access to all branches by default, but can optionally scope to a specific branch.
 * - Staff (receptionist, trainer) are strictly restricted to their assigned branch.
 * - Platform Superadmins can access any gym and branch when explicitly requested.
 */
export async function getBranchScope(
  authUserId: string,
  options?: {
    requestedGymId?: string | null;
    requestedBranchId?: string | null;
  }
): Promise<BranchScope | BranchScopeError> {
  const { requestedGymId, requestedBranchId } = options || {};

  // 1. Fetch user record from database
  const userQuery = supabaseAdmin
    .from('users')
    .select('id, gym_id, branch_id, role, is_active')
    .eq('auth_id', authUserId);

  let { data: userData } = typeof (userQuery as any).maybeSingle === 'function'
    ? await (userQuery as any).maybeSingle()
    : await userQuery.single();

  // Auto-heal owner profile if gym exists
  if (!userData || !userData.gym_id) {
    try {
      const gymQuery = supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: ownerGym } = typeof (gymQuery as any).maybeSingle === 'function'
        ? await (gymQuery as any).maybeSingle()
        : await gymQuery.single();

      if (ownerGym) {
        const branchQuery = supabaseAdmin
          .from('branches')
          .select('id')
          .eq('gym_id', ownerGym.id)
          .order('created_at', { ascending: true })
          .limit(1);

        const { data: primaryBranch } = typeof (branchQuery as any).maybeSingle === 'function'
          ? await (branchQuery as any).maybeSingle()
          : await branchQuery.single();

        const upsertQuery = supabaseAdmin
          .from('users')
          .upsert({
            auth_id: authUserId,
            gym_id: ownerGym.id,
            branch_id: primaryBranch?.id || null,
            role: 'owner',
            permissions: ['*'],
            name: 'Gym Owner',
            is_active: true,
          }, { onConflict: 'auth_id' })
          .select('id, gym_id, branch_id, role, is_active');

        const { data: autoUser } = typeof (upsertQuery as any).maybeSingle === 'function'
          ? await (upsertQuery as any).maybeSingle()
          : await upsertQuery.single();

        if (autoUser) {
          userData = autoUser;
        }
      }
    } catch {
      // Ignore auto-heal error and proceed to permission check
    }
  }

  if (!userData || userData.is_active === false) {
    // Check if platform superadmin
    const superAdmin = await isSuperAdmin(authUserId);
    if (superAdmin) {
      if (!requestedGymId) {
        return { error: 'Platform admin must provide a gymId', status: 400 };
      }
      return {
        gymId: requestedGymId,
        branchId: requestedBranchId || null,
        role: 'superadmin',
        userId: authUserId,
        isOwner: true,
        isSuperAdmin: true,
      };
    }
    return { error: 'Forbidden: Account not found or deactivated', status: 403 };
  }

  const gymId = userData.gym_id;
  if (!gymId) {
    return { error: 'Forbidden: User has no gym assigned', status: 403 };
  }

  // Cross-tenant protection
  if (requestedGymId && requestedGymId !== gymId) {
    const superAdmin = await isSuperAdmin(authUserId);
    if (!superAdmin) {
      return { error: 'Forbidden: Cross-tenant access denied', status: 403 };
    }
  }

  const isOwner = userData.role === 'owner';

  if (isOwner) {
    let resolvedBranchId: string | null = null;

    if (requestedBranchId) {
      // Validate that the requested branch belongs to this gym
      const { data: branch } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('id', requestedBranchId)
        .eq('gym_id', gymId)
        .single();

      if (!branch) {
        return { error: 'Invalid branch ID for this gym', status: 400 };
      }
      resolvedBranchId = branch.id;
    }

    return {
      gymId,
      branchId: resolvedBranchId,
      role: userData.role,
      userId: userData.id,
      isOwner: true,
      isSuperAdmin: false,
    };
  }

  // Staff role: enforce strict branch confinement
  let staffBranchId = userData.branch_id;

  // Fallback: If staff has null branch_id, assign them to gym's primary branch
  if (!staffBranchId) {
    const { data: primaryBranch } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (primaryBranch) {
      staffBranchId = primaryBranch.id;
      // Self-heal: backfill user's branch_id
      await supabaseAdmin
        .from('users')
        .update({ branch_id: staffBranchId })
        .eq('id', userData.id);
    }
  }

  // If staff explicitly passed a different branchId, deny access
  if (requestedBranchId && requestedBranchId !== staffBranchId) {
    return { error: 'Forbidden: Cannot access records from another branch', status: 403 };
  }

  return {
    gymId,
    branchId: staffBranchId || null,
    role: userData.role,
    userId: userData.id,
    isOwner: false,
    isSuperAdmin: false,
  };
}
