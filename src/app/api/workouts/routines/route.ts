import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';
import { STARTER_ROUTINES } from '@/lib/workout/exercise-types';

export async function GET(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ success: false, error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');
    const gymId = user.user_metadata?.gym_id || user.app_metadata?.gym_id;

    if (memberId) {
      // Fetch member's currently active assigned routine
      const { data: assignment, error: assignErr } = await supabaseAdmin
        .from('member_assigned_routines')
        .select('*, workout_routines(*)')
        .eq('member_id', memberId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assignErr) throw assignErr;

      return NextResponse.json({
        success: true,
        assignedRoutine: assignment,
        starterRoutines: STARTER_ROUTINES,
      });
    }

    // Fetch custom routines created by this gym
    const { data: customRoutines, error: routinesErr } = await supabaseAdmin
      .from('workout_routines')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });

    if (routinesErr) throw routinesErr;

    return NextResponse.json({
      success: true,
      starterRoutines: STARTER_ROUTINES,
      customRoutines: customRoutines || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch routines';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ success: false, error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const body = await reqBody(request);
    const gymId = user.user_metadata?.gym_id || user.app_metadata?.gym_id;

    if (body.action === 'assign') {
      const { member_id, routine_id, start_date } = body;
      if (!member_id || !routine_id) {
        return NextResponse.json(
          { success: false, error: 'member_id and routine_id are required' },
          { status: 400 }
        );
      }

      // Deactivate any previous routines for this member
      await supabaseAdmin
        .from('member_assigned_routines')
        .update({ active: false })
        .eq('member_id', member_id);

      // Create new assignment
      const { data: newAssignment, error: assignErr } = await supabaseAdmin
        .from('member_assigned_routines')
        .insert({
          gym_id: gymId,
          member_id,
          routine_id,
          assigned_by: user.id,
          start_date: start_date || new Date().toISOString().split('T')[0],
          active: true,
        })
        .select()
        .single();

      if (assignErr) throw assignErr;

      return NextResponse.json({
        success: true,
        assignment: newAssignment,
      });
    }

    // Action = 'create' custom routine
    const { name, split_type, days_per_week, description, schedule } = body;
    if (!name) {
      return NextResponse.json({ success: false, error: 'Routine name is required' }, { status: 400 });
    }

    const { data: newRoutine, error: createErr } = await supabaseAdmin
      .from('workout_routines')
      .insert({
        gym_id: gymId,
        created_by: user.id,
        name,
        split_type: split_type || 'Custom',
        days_per_week: days_per_week || 3,
        description: description || '',
        schedule: schedule || [],
      })
      .select()
      .single();

    if (createErr) throw createErr;

    return NextResponse.json({
      success: true,
      routine: newRoutine,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to process routine';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

async function reqBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
