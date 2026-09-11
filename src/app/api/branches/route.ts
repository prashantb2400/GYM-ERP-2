import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';
import { isSuperAdmin } from '@/lib/platform/auth';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';

// GET /api/branches - List branches for caller's gym
export async function GET(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedGymId = searchParams.get('gymId');

    const scope = await getBranchScope(user.id, { requestedGymId });
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    let query = supabaseAdmin
      .from('branches')
      .select('*')
      .eq('gym_id', scope.gymId)
      .order('created_at', { ascending: true });

    // If staff (non-owner), only return their assigned branch
    if (scope.branchId) {
      query = query.eq('id', scope.branchId);
    }

    const { data: branches, error } = await query;
    if (error) throw error;

    return NextResponse.json({ branches: branches || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch branches';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/branches - Create a new branch (Owner only)
export async function POST(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const scope = await getBranchScope(user.id);
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    if (!scope.isOwner) {
      return NextResponse.json({ error: 'Forbidden: Only gym owners can create branches' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, address } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    }

    const { data: branch, error } = await supabaseAdmin
      .from('branches')
      .insert({
        gym_id: scope.gymId,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        address: address || {},
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, branch });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create branch';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/branches - Update a branch (Owner only)
export async function PATCH(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const scope = await getBranchScope(user.id);
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    if (!scope.isOwner) {
      return NextResponse.json({ error: 'Forbidden: Only gym owners can modify branches' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, phone, address, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });
    }

    // Verify branch belongs to caller's gym
    const { data: existingBranch } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', id)
      .eq('gym_id', scope.gymId)
      .single();

    if (!existingBranch) {
      return NextResponse.json({ error: 'Branch not found or access denied' }, { status: 404 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (address !== undefined) updateData.address = address;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedBranch, error } = await supabaseAdmin
      .from('branches')
      .update(updateData)
      .eq('id', id)
      .eq('gym_id', scope.gymId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, branch: updatedBranch });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update branch';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
