import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';

// GET /api/plans - List membership plans for caller's gym
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedGymId = searchParams.get('gymId');

    const scope = await getBranchScope(user.id, { requestedGymId });
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const { data: plans, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('gym_id', scope.gymId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, plans: plans || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch membership plans';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/plans - Create a new membership plan
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = await getBranchScope(user.id);
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    // Role check: owners and managers/authorized staff can create plans
    if (!scope.isOwner && scope.role !== 'receptionist') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create plans' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      duration_days,
      price,
      features = [],
      highlights = [],
      is_popular = false,
      is_active = true,
      display_order,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }

    const parsedDays = parseInt(String(duration_days), 10);
    if (isNaN(parsedDays) || parsedDays <= 0) {
      return NextResponse.json({ error: 'Valid duration in days is required' }, { status: 400 });
    }

    const parsedPrice = parseFloat(String(price));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Valid plan price is required' }, { status: 400 });
    }

    // Calculate display order if not provided
    let finalOrder = typeof display_order === 'number' ? display_order : 0;
    if (finalOrder === 0) {
      const { count } = await supabaseAdmin
        .from('plans')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', scope.gymId);
      finalOrder = (count || 0) + 1;
    }

    const { data: newPlan, error } = await supabaseAdmin
      .from('plans')
      .insert({
        gym_id: scope.gymId,
        name: name.trim(),
        duration_days: parsedDays,
        price: parsedPrice,
        features: Array.isArray(features) ? features : [],
        highlights: Array.isArray(highlights) ? highlights : [],
        is_popular: Boolean(is_popular),
        is_active: Boolean(is_active),
        display_order: finalOrder,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create membership plan';
    console.error('Plan creation error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/plans - Update an existing membership plan
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = await getBranchScope(user.id);
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    if (!scope.isOwner && scope.role !== 'receptionist') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to update plans' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Sanitize update fields
    const allowedFields: Record<string, any> = {};
    if (updates.name !== undefined) allowedFields.name = String(updates.name).trim();
    if (updates.duration_days !== undefined) allowedFields.duration_days = parseInt(String(updates.duration_days), 10);
    if (updates.price !== undefined) allowedFields.price = parseFloat(String(updates.price));
    if (updates.features !== undefined && Array.isArray(updates.features)) allowedFields.features = updates.features;
    if (updates.highlights !== undefined && Array.isArray(updates.highlights)) allowedFields.highlights = updates.highlights;
    if (updates.is_popular !== undefined) allowedFields.is_popular = Boolean(updates.is_popular);
    if (updates.is_active !== undefined) allowedFields.is_active = Boolean(updates.is_active);
    if (updates.display_order !== undefined) allowedFields.display_order = parseInt(String(updates.display_order), 10);

    const { data: updatedPlan, error } = await supabaseAdmin
      .from('plans')
      .update(allowedFields)
      .eq('id', id)
      .eq('gym_id', scope.gymId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update membership plan';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/plans - Delete a membership plan
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = await getBranchScope(user.id);
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    if (!scope.isOwner) {
      return NextResponse.json({ error: 'Forbidden: Only gym owners can delete membership plans' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('id', id)
      .eq('gym_id', scope.gymId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Plan deleted successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete membership plan';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
