import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

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

    // 1. Resolve caller's user record and gym_id
    const { data: callerUser } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role, permissions')
      .eq('auth_id', user.id)
      .maybeSingle();

    let resolvedGymId = callerUser?.gym_id;

    // Fallback: Check if caller is gym owner via gyms table
    if (!resolvedGymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (ownedGym) {
        resolvedGymId = ownedGym.id;
      }
    }

    if (!resolvedGymId) {
      return NextResponse.json({ error: 'No gym workspace associated with this user' }, { status: 403 });
    }

    // Verify permission: owner or staff.view
    const isOwner = callerUser?.role === 'owner' || (!callerUser && Boolean(resolvedGymId));
    const hasViewPerm = callerUser?.permissions?.includes('staff.view');
    if (!isOwner && !hasViewPerm) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view staff' }, { status: 403 });
    }

    // 2. Fetch all users for this gym
    const { data: staffList, error: staffError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('gym_id', resolvedGymId)
      .order('role', { ascending: true });

    if (staffError) throw staffError;

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
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
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

    const { data: callerUser } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role, permissions')
      .eq('auth_id', user.id)
      .maybeSingle();

    let resolvedGymId = callerUser?.gym_id;
    if (!resolvedGymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (ownedGym) resolvedGymId = ownedGym.id;
    }

    if (!resolvedGymId) {
      return NextResponse.json({ error: 'No gym workspace associated with this user' }, { status: 403 });
    }

    // Verify permission: owner or staff.manage
    const isOwner = callerUser?.role === 'owner' || (!callerUser && Boolean(resolvedGymId));
    const hasManagePerm = callerUser?.permissions?.includes('staff.manage');
    if (!isOwner && !hasManagePerm) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage staff' }, { status: 403 });
    }

    const body = await request.json();
    const { id, permissions, is_active, branch_id, role, phone, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing staff user id' }, { status: 400 });
    }

    // Ensure target staff belongs to the same gym
    const { data: targetStaff } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role')
      .eq('id', id)
      .eq('gym_id', resolvedGymId)
      .single();

    if (!targetStaff) {
      return NextResponse.json({ error: 'Staff account not found' }, { status: 404 });
    }

    // Protect owners from being deactivated by staff
    if (targetStaff.role === 'owner' && is_active === false) {
      return NextResponse.json({ error: 'Owner accounts cannot be deactivated' }, { status: 400 });
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

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
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

    const { data: callerUser } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role')
      .eq('auth_id', user.id)
      .maybeSingle();

    let resolvedGymId = callerUser?.gym_id;
    if (!resolvedGymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (ownedGym) resolvedGymId = ownedGym.id;
    }

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

    const { data: targetStaff } = await supabaseAdmin
      .from('users')
      .select('id, auth_id, role')
      .eq('id', staffId)
      .eq('gym_id', resolvedGymId)
      .single();

    if (!targetStaff) {
      return NextResponse.json({ error: 'Staff account not found' }, { status: 404 });
    }

    if (targetStaff.role === 'owner') {
      return NextResponse.json({ error: 'Cannot delete gym owner account' }, { status: 400 });
    }

    // Delete database user record
    await supabaseAdmin.from('users').delete().eq('id', staffId);

    // Delete auth user if auth_id exists
    if (targetStaff.auth_id) {
      await supabaseAdmin.auth.admin.deleteUser(targetStaff.auth_id).catch(() => null);
    }

    return NextResponse.json({ success: true, message: 'Staff account deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Failed to delete staff account:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
