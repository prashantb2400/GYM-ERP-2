import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

/**
 * Helper to safely resolve the caller's gym_id and user record.
 * Uses order('created_at', { ascending: false }).limit(1) to avoid PGRST116 multi-row errors.
 */
async function resolveCallerGym(authUserId: string) {
  const { data: callerUser } = await supabaseAdmin
    .from('users')
    .select('id, gym_id, role, permissions')
    .eq('auth_id', authUserId)
    .maybeSingle();

  let resolvedGymId = callerUser?.gym_id;

  if (!resolvedGymId) {
    const { data: ownedGym } = await supabaseAdmin
      .from('gyms')
      .select('id')
      .eq('owner_id', authUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ownedGym) {
      resolvedGymId = ownedGym.id;
    }
  }

  return { callerUser, resolvedGymId };
}

/**
 * GET /api/staff
 * Lists all staff and owner profiles for the caller's gym.
 * Protected by server-side authorization and immune to client-side RLS recursion.
 */
export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { callerUser, resolvedGymId } = await resolveCallerGym(user.id);

    if (!resolvedGymId) {
      return NextResponse.json({ error: 'No gym workspace associated with this user' }, { status: 403 });
    }

    // Verify permission: owner or staff.view or staff.manage or wildcard
    const isOwner = callerUser?.role === 'owner' || (!callerUser && Boolean(resolvedGymId));
    const hasViewPerm =
      callerUser?.permissions?.includes('staff.view') ||
      callerUser?.permissions?.includes('staff.manage') ||
      callerUser?.permissions?.includes('*');

    if (!isOwner && !hasViewPerm) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view staff' }, { status: 403 });
    }

    // 2. Fetch all users for this gym
    const { data: staffList, error: staffError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('gym_id', resolvedGymId)
      .order('role', { ascending: true });

    if (staffError) {
      console.error('Failed to fetch staff from database:', staffError);
      return NextResponse.json(
        { error: staffError.message || 'Database error fetching staff' },
        { status: 500 }
      );
    }

    // 3. Fetch branches to safely merge branch names without PostgREST embed bugs
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id, name')
      .eq('gym_id', resolvedGymId);

    const branchMap = new Map<string, string>();
    branches?.forEach(b => branchMap.set(b.id, b.name));

    const enrichedStaff = (staffList || []).map(member => ({
      ...member,
      branch_name: member.branch_id ? (branchMap.get(member.branch_id) || null) : null,
      branches: member.branch_id && branchMap.has(member.branch_id)
        ? { name: branchMap.get(member.branch_id) }
        : null,
    }));

    return NextResponse.json({ success: true, staff: enrichedStaff });
  } catch (err: unknown) {
    const msg =
      (err as any)?.message || (err instanceof Error ? err.message : 'Internal server error fetching staff list');
    console.error('Failed to fetch staff list:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/staff
 * Updates staff account details (permissions, is_active, branch_id, phone, role)
 */
export async function PATCH(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { callerUser, resolvedGymId } = await resolveCallerGym(user.id);

    if (!resolvedGymId) {
      return NextResponse.json({ error: 'No gym workspace associated with this user' }, { status: 403 });
    }

    // Verify permission: owner or staff.manage or wildcard
    const isOwner = callerUser?.role === 'owner' || (!callerUser && Boolean(resolvedGymId));
    const hasManagePerm =
      callerUser?.permissions?.includes('staff.manage') ||
      callerUser?.permissions?.includes('*');

    if (!isOwner && !hasManagePerm) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage staff' }, { status: 403 });
    }

    const body = await request.json();
    const { id, permissions, is_active, branch_id, role, phone, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing staff user id' }, { status: 400 });
    }

    // Ensure target staff belongs to the same gym
    const { data: targetStaff, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role')
      .eq('id', id)
      .eq('gym_id', resolvedGymId)
      .maybeSingle();

    if (targetError || !targetStaff) {
      return NextResponse.json({ error: 'Staff account not found' }, { status: 404 });
    }

    // Non-owners cannot modify owner accounts
    if (targetStaff.role === 'owner' && !isOwner) {
      return NextResponse.json({ error: 'Forbidden: Cannot modify gym owner account' }, { status: 403 });
    }

    // Protect owners from being deactivated
    if (targetStaff.role === 'owner' && is_active === false) {
      return NextResponse.json({ error: 'Owner accounts cannot be deactivated' }, { status: 400 });
    }

    // Non-owners cannot edit permissions
    if (permissions !== undefined && !isOwner) {
      return NextResponse.json({ error: 'Only gym owners can modify staff permissions' }, { status: 403 });
    }

    // Non-owners cannot alter roles (e.g. promote to owner or change roles)
    if (role !== undefined && !isOwner) {
      return NextResponse.json({ error: 'Only gym owners can alter staff roles' }, { status: 403 });
    }

    // Prevent non-owner staff from self-tampering
    if (id === callerUser?.id && !isOwner) {
      return NextResponse.json({ error: 'Staff members cannot modify their own profile or privileges' }, { status: 403 });
    }

    const updateFields: Record<string, any> = {};
    if (permissions !== undefined) updateFields.permissions = permissions;
    if (is_active !== undefined) updateFields.is_active = Boolean(is_active);
    if (branch_id !== undefined) updateFields.branch_id = branch_id || null;
    if (phone !== undefined) updateFields.phone = phone || null;
    if (name !== undefined && name.trim()) updateFields.name = name.trim();
    if (role !== undefined && ['receptionist', 'trainer'].includes(role)) updateFields.role = role;

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateFields)
      .eq('id', id)
      .eq('gym_id', resolvedGymId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update staff in DB:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Database error updating staff' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: unknown) {
    const msg =
      (err as any)?.message || (err instanceof Error ? err.message : 'Internal server error updating staff');
    console.error('Failed to update staff account:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/staff
 * Deactivates or removes a staff account.
 */
export async function DELETE(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { callerUser, resolvedGymId } = await resolveCallerGym(user.id);

    if (!resolvedGymId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isOwner = callerUser?.role === 'owner' || (!callerUser && Boolean(resolvedGymId));
    if (!isOwner) {
      return NextResponse.json({ error: 'Only gym owners can delete staff accounts' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json({ error: 'Missing staff id parameter' }, { status: 400 });
    }

    const { data: targetStaff, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, auth_id, role')
      .eq('id', staffId)
      .eq('gym_id', resolvedGymId)
      .maybeSingle();

    if (targetError || !targetStaff) {
      return NextResponse.json({ error: 'Staff account not found' }, { status: 404 });
    }

    if (targetStaff.role === 'owner') {
      return NextResponse.json({ error: 'Cannot delete gym owner account' }, { status: 400 });
    }

    // Delete database user record
    const { error: delError } = await supabaseAdmin.from('users').delete().eq('id', staffId);
    if (delError) {
      return NextResponse.json({ error: delError.message || 'Failed to delete staff record' }, { status: 500 });
    }

    // Delete auth user if auth_id exists
    if (targetStaff.auth_id) {
      await supabaseAdmin.auth.admin.deleteUser(targetStaff.auth_id).catch(() => null);
    }

    return NextResponse.json({ success: true, message: 'Staff account deleted' });
  } catch (err: unknown) {
    const msg =
      (err as any)?.message || (err instanceof Error ? err.message : 'Internal server error deleting staff account');
    console.error('Failed to delete staff account:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
