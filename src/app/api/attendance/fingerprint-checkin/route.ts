import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`fp-checkin:${ip}`, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const { user: sessionUser, error: authErr } = await getAuthUser(request);
    if (!sessionUser || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      gymId: requestedGymId,
      branchId: requestedBranchId,
      memberId,
      confidence,
      score,
      driverId = 'virtual',
      deviceId,
    } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'Missing required memberId' }, { status: 400 });
    }

    const scope = await getBranchScope(sessionUser.id, {
      requestedGymId,
      requestedBranchId,
    });

    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const gymId = scope.gymId;

    // 1. Verify member belongs to this gym
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, name, member_code, status, photo_url, attendance_count, branch_id, total_due, plan_end_date')
      .eq('gym_id', gymId)
      .eq('id', memberId)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.status !== 'active') {
      return NextResponse.json({
        error: `Membership is ${member.status}`,
        member_name: member.name,
        member_photo: member.photo_url,
        member_code: member.member_code,
        status: member.status,
      }, { status: 403 });
    }

    const todayString = new Date().toISOString().split('T')[0];

    // 2. Check if already checked in today
    const { data: existing } = await supabaseAdmin
      .from('attendance')
      .select('id, check_in_time, check_out_time')
      .eq('gym_id', gymId)
      .eq('member_id', member.id)
      .eq('date', todayString)
      .single();

    if (existing) {
      if (existing.check_out_time) {
        return NextResponse.json({
          success: true,
          already_completed: true,
          action: 'already_completed',
          message: 'Already checked in and checked out for today',
          member_name: member.name,
          member_photo: member.photo_url,
          member_code: member.member_code,
        });
      }

      const checkInMs = new Date(existing.check_in_time).getTime();
      const elapsedMinutes = (Date.now() - checkInMs) / (1000 * 60);

      if (elapsedMinutes < 5) {
        return NextResponse.json({
          success: true,
          already_marked: true,
          action: 'check_in_duplicate',
          message: `Already checked in ${Math.round(elapsedMinutes)}m ago`,
          member_name: member.name,
          member_photo: member.photo_url,
          member_code: member.member_code,
          check_in_time: existing.check_in_time,
          total_due: member.total_due,
        });
      }

      // Check-out scan (> 5 minutes after check-in)
      const nowIso = new Date().toISOString();
      const durationMin = Math.round(elapsedMinutes);

      const { error: updateErr } = await supabaseAdmin
        .from('attendance')
        .update({
          check_out_time: nowIso,
          notes: `Check-out via Fingerprint (Workout: ${durationMin}m)`,
        })
        .eq('id', existing.id);

      if (updateErr) throw updateErr;

      return NextResponse.json({
        success: true,
        action: 'check_out',
        member_name: member.name,
        member_photo: member.photo_url,
        member_code: member.member_code,
        time: new Date().toLocaleTimeString('en-IN'),
        duration: durationMin,
        message: `Checked out! Workout duration: ${durationMin} min`,
      });
    }

    const assignedBranchId = scope.branchId || member.branch_id || null;
    const nowIso = new Date().toISOString();

    // 3. Insert attendance record with method = 'fingerprint'
    const { error: insertErr } = await supabaseAdmin
      .from('attendance')
      .insert({
        gym_id: gymId,
        branch_id: assignedBranchId,
        member_id: member.id,
        member_name: member.name,
        date: todayString,
        check_in_time: nowIso,
        method: 'fingerprint',
        confidence: confidence || score || 85,
        device_id: deviceId || driverId || 'optical_scanner',
        device_name: `Biometric Scanner (${driverId})`,
        marked_by: sessionUser.id,
        notes: `Checked in via Fingerprint Biometrics (Score: ${score || 85}%)`,
      });

    if (insertErr) throw insertErr;

    // 4. Increment member attendance stats
    await supabaseAdmin
      .from('members')
      .update({
        attendance_count: (member.attendance_count || 0) + 1,
        last_attendance: nowIso,
      })
      .eq('id', member.id);

    return NextResponse.json({
      success: true,
      already_marked: false,
      member_name: member.name,
      member_photo: member.photo_url,
      member_code: member.member_code,
      total_due: member.total_due,
      checked_in_at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Fingerprint check-in failure:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
