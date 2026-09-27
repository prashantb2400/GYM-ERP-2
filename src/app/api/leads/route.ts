import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';
import { validateBody } from '@/lib/server/validate';
import { createLeadSchema, updateLeadSchema } from '@/lib/schemas/leads';

/**
 * Helper to resolve gym_id for the authenticated user.
 */
async function resolveGymId(authUserId: string): Promise<string | null> {
  const { data: callerUser } = await supabaseAdmin
    .from('users')
    .select('id, gym_id, role, permissions')
    .eq('auth_id', authUserId)
    .maybeSingle();

  if (callerUser?.gym_id) {
    return callerUser.gym_id;
  }

  const { data: ownedGym } = await supabaseAdmin
    .from('gyms')
    .select('id')
    .eq('owner_id', authUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return ownedGym?.id || null;
}

/**
 * GET /api/leads
 * Fetches all leads for the user's gym, optionally filtered by branch.
 * Gracefully handles missing database table without 500 crashes.
 */
export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const gymId = await resolveGymId(user.id);
    if (!gymId) {
      return NextResponse.json({ error: 'No gym workspace associated with this user' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    let query = supabaseAdmin
      .from('leads')
      .select('*')
      .eq('gym_id', gymId)
      .order('follow_up_date', { ascending: true, nullsFirst: false });

    if (branchId && branchId !== 'all') {
      query = query.eq('branch_id', branchId);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      // Gracefully handle missing leads table without crashing
      const code = (leadsError as any)?.code;
      const msg = (leadsError as any)?.message || '';
      if (code === '42P01' || code === 'PGRST205' || msg.includes('does not exist') || msg.includes('schema cache')) {
        return NextResponse.json({
          success: false,
          tableMissing: true,
          leads: [],
          message: 'Leads table not yet migrated in Supabase',
        });
      }

      return NextResponse.json({ error: msg || 'Failed to fetch leads' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tableMissing: false,
      leads: leads || [],
    });
  } catch (err: unknown) {
    const msg =
      (err as any)?.message || (err instanceof Error ? err.message : 'Internal server error while fetching leads');
    console.error('GET /api/leads failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/leads
 * Adds a new lead enquiry to the gym CRM.
 */
export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const gymId = await resolveGymId(user.id);
    if (!gymId) {
      return NextResponse.json({ error: 'No gym workspace associated with this user' }, { status: 403 });
    }

    const validation = await validateBody(request, createLeadSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { name, phone, email, interest, source, follow_up_date, notes, branchId } = validation.data;

    const cleanPhone = phone.replace(/\D/g, '');

    const { data: newLead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert([
        {
          gym_id: gymId,
          branch_id: branchId || null,
          name: name.trim(),
          phone: cleanPhone,
          email: email?.trim() || null,
          interest: interest || 'membership',
          source: source || 'walk_in',
          status: 'new',
          notes: notes?.trim() || null,
          follow_up_date: follow_up_date || null,
        },
      ])
      .select('*')
      .single();

    if (insertError) {
      const msg = (insertError as any)?.message || 'Failed to create lead';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: newLead });
  } catch (err: unknown) {
    const msg =
      (err as any)?.message || (err instanceof Error ? err.message : 'Internal server error while adding lead');
    console.error('POST /api/leads failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/leads
 * Updates lead status, notes, follow-up date, or converted member ID.
 */
export async function PATCH(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const gymId = await resolveGymId(user.id);
    if (!gymId) {
      return NextResponse.json({ error: 'No gym workspace associated with this user' }, { status: 403 });
    }

    const validation = await validateBody(request, updateLeadSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { id, status, notes, follow_up_date, converted_member_id } = validation.data;

    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (follow_up_date !== undefined) updates.follow_up_date = follow_up_date;
    if (converted_member_id !== undefined) updates.converted_member_id = converted_member_id;

    const { data: updatedLead, error: updateError } = await supabaseAdmin
      .from('leads')
      .update(updates)
      .eq('id', id)
      .eq('gym_id', gymId)
      .select('*')
      .single();

    if (updateError) {
      const msg = (updateError as any)?.message || 'Failed to update lead';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (err: unknown) {
    const msg =
      (err as any)?.message || (err instanceof Error ? err.message : 'Internal server error while updating lead');
    console.error('PATCH /api/leads failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/leads
 * Deletes a lead record scoped to the user's gym.
 */
export async function DELETE(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const gymId = await resolveGymId(user.id);
    if (!gymId) {
      return NextResponse.json({ error: 'No gym workspace associated with this user' }, { status: 403 });
    }

    // Verify caller has permission to delete leads
    const { data: callerUser } = await supabaseAdmin
      .from('users')
      .select('role, permissions')
      .eq('auth_id', user.id)
      .maybeSingle();

    const canDelete = callerUser?.role === 'owner' ||
      callerUser?.permissions?.includes('leads.manage') ||
      callerUser?.permissions?.includes('followups.manage');

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete leads' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('gym_id', gymId);

    if (deleteError) {
      const msg = (deleteError as any)?.message || 'Failed to delete lead';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err: unknown) {
    const msg =
      (err as any)?.message || (err instanceof Error ? err.message : 'Internal server error while deleting lead');
    console.error('DELETE /api/leads failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
