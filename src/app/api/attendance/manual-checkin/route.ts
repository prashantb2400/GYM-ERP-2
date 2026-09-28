import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getAuthUser } from '@/lib/server/auth-helper';
import { validateBody } from '@/lib/server/validate';
import { manualCheckinSchema } from '@/lib/schemas/attendance';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`manual-checkin:${ip}`, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    // 1. Verify caller session
    const { user: sessionUser, error: authErr } = await getAuthUser(request);
    if (!sessionUser || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate request body
    const validation = await validateBody(request, manualCheckinSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { memberId, notes } = validation.data;

    // 3. Resolve caller permissions and gym association
    const { data: callerUser, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role, permissions')
      .eq('auth_id', sessionUser.id)
      .single();

    if (userErr || !callerUser?.gym_id) {
      return NextResponse.json({ error: 'Caller user profile or gym not found' }, { status: 403 });
    }

    const allowedRoles = ['owner', 'admin', 'receptionist', 'trainer'];
    const hasPermission =
      allowedRoles.includes(callerUser.role) ||
      (Array.isArray(callerUser.permissions) && callerUser.permissions.includes('attendance.mark'));

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to mark attendance' },
        { status: 403 }
      );
    }

    const gymId = callerUser.gym_id;

    // 4. Fetch target member scoped to gym
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, name, member_code, status, branch_id, attendance_count')
      .eq('gym_id', gymId)
      .eq('id', memberId)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: 'Member not found in current gym' }, { status: 404 });
    }

    if (member.status !== 'active') {
      return NextResponse.json(
        {
          error: `Membership is ${member.status}. Please renew before checking in.`,
          member_name: member.name,
          status: member.status,
        },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    // 5. Check if attendance already recorded today
    const { data: existingAttendance } = await supabaseAdmin
      .from('attendance')
      .select('id, check_in_time')
      .eq('gym_id', gymId)
      .eq('member_id', member.id)
      .eq('date', todayStr)
      .limit(1)
      .maybeSingle();

    if (existingAttendance) {
      return NextResponse.json({
        success: true,
        alreadyMarked: true,
        memberName: member.name,
        checkInTime: existingAttendance.check_in_time,
        message: `${member.name} is already checked in today!`,
      });
    }

    // 6. Record attendance
    const { data: attendanceRecord, error: insertErr } = await supabaseAdmin
      .from('attendance')
      .insert({
        gym_id: gymId,
        branch_id: member.branch_id || null,
        member_id: member.id,
        member_name: member.name,
        method: 'manual',
        date: todayStr,
        check_in_time: nowIso,
        marked_by: callerUser.id,
        notes: notes || 'Manual check-in from Omnibar console',
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Manual attendance insertion error:', insertErr);
      return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 });
    }

    // 7. Update member attendance tally
    await supabaseAdmin
      .from('members')
      .update({
        attendance_count: (member.attendance_count || 0) + 1,
        last_attendance: nowIso,
      })
      .eq('id', member.id);

    return NextResponse.json({
      success: true,
      alreadyMarked: false,
      memberName: member.name,
      checkInTime: nowIso,
      attendance: attendanceRecord,
      message: `Check-in recorded for ${member.name}!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Unhandled manual check-in error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
