import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    // Resolve gym_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id, branch_id, role')
      .eq('auth_id', user.id)
      .maybeSingle();

    let gymId = userData?.gym_id;
    if (!gymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      gymId = ownedGym?.id;
    }

    if (!gymId) {
      return NextResponse.json({ error: 'No gym workspace found' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('type');
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId') || userData?.branch_id;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    let query = supabaseAdmin
      .from('vigilance_events')
      .select('*, cctv_cameras(id, name, location), members(id, name, phone, member_code, plan_id, status)')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (branchId && branchId !== 'all') {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: events, error: evErr } = await query;
    if (evErr) throw evErr;

    return NextResponse.json({
      success: true,
      events: events || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch vigilance events';
    console.error('Fetch vigilance events error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const { eventId, status, notes } = await request.json();
    if (!eventId || !status) {
      return NextResponse.json(
        { error: 'eventId and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['unresolved', 'acknowledged', 'lead_created', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('vigilance_events')
      .update({
        status,
        metadata: notes ? { notes } : undefined,
      })
      .eq('id', eventId)
      .select()
      .single();

    if (updErr) throw updErr;

    return NextResponse.json({
      success: true,
      event: updated,
      message: `Alert marked as ${status}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update vigilance event';
    console.error('Update vigilance event error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
