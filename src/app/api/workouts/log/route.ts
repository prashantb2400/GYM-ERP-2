import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';
import { estimateOneRepMax } from '@/lib/workout/one-rep-max';

export async function GET(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ success: false, error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');
    let gymId = user.user_metadata?.gym_id || user.app_metadata?.gym_id;

    if (!memberId) {
      return NextResponse.json({ success: false, error: 'member_id query parameter is required' }, { status: 400 });
    }

    if (!gymId) {
      const { data: memberRec } = await supabaseAdmin
        .from('members')
        .select('gym_id')
        .eq('id', memberId)
        .maybeSingle();
      gymId = memberRec?.gym_id;
    }

    let query = supabaseAdmin
      .from('workout_logs')
      .select('*')
      .eq('member_id', memberId);

    if (gymId) {
      query = query.eq('gym_id', gymId);
    }

    const { data: logs, error: logsErr } = await query
      .order('date', { ascending: false })
      .limit(30);

    if (logsErr) throw logsErr;

    return NextResponse.json({
      success: true,
      logs: logs || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch workout logs';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ success: false, error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { member_id, session_name, routine_id, duration_minutes, sets, notes, date } = body;
    let gymId = user.user_metadata?.gym_id || user.app_metadata?.gym_id;

    if (!gymId && member_id) {
      const { data: memberRec } = await supabaseAdmin
        .from('members')
        .select('gym_id')
        .eq('id', member_id)
        .maybeSingle();
      gymId = memberRec?.gym_id;
    }

    if (!member_id || !session_name || !Array.isArray(sets)) {
      return NextResponse.json(
        { success: false, error: 'member_id, session_name, and sets array are required' },
        { status: 400 }
      );
    }

    // Calculate total workout volume (kg)
    let totalVolumeKg = 0;
    const estimatedOneRms: Record<string, number> = {};

    for (const set of sets) {
      const w = Number(set.weight) || 0;
      const r = Number(set.reps) || 0;
      totalVolumeKg += w * r;

      if (w > 0 && r > 0 && set.exerciseName) {
        try {
          const est = estimateOneRepMax(w, r, 'epley', set.rpe ? Number(set.rpe) : undefined);
          const currentBest = estimatedOneRms[set.exerciseName] || 0;
          if (est.estimatedOneRm > currentBest) {
            estimatedOneRms[set.exerciseName] = est.estimatedOneRm;
          }
        } catch {
          // Ignore invalid calculation
        }
      }
    }

    const { data: newLog, error: insertErr } = await supabaseAdmin
      .from('workout_logs')
      .insert({
        gym_id: gymId,
        member_id,
        routine_id: routine_id || null,
        session_name,
        date: date || new Date().toISOString().split('T')[0],
        duration_minutes: duration_minutes || 45,
        total_volume_kg: Math.round(totalVolumeKg * 100) / 100,
        sets,
        notes: notes || '',
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({
      success: true,
      log: newLog,
      totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
      estimatedOneRms,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record workout session';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
