import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/platform/auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';
import { getAuthUser } from '@/lib/server/auth-helper';
import { validateBody } from '@/lib/server/validate';
import { faceCheckinSchema } from '@/lib/schemas/attendance';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`face-checkin:${ip}`, 60, 60);
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

    const validation = await validateBody(request, faceCheckinSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { gymId: requestedGymId, branchId: requestedBranchId, memberId, confidence, type = 'auto', deviceId, timestamp } = validation.data;

    // Tenant & Branch isolation: resolve scope from caller's account
    const scope = await getBranchScope(sessionUser.id, {
      requestedGymId,
      requestedBranchId,
    });

    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const gymId = scope.gymId;

    // 1. Verify member belongs to this gym and is active
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, name, member_code, status, photo_url, attendance_count, branch_id')
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
        status: member.status,
      }, { status: 403 });
    }

    const scanDate = timestamp ? new Date(timestamp) : new Date();
    const validScanDate = isNaN(scanDate.getTime()) ? new Date() : scanDate;
    const todayString = validScanDate.toISOString().split('T')[0];
    const scanIso = validScanDate.toISOString();

    // 2. Check if an attendance record exists for today
    const { data: existingAttendance } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('gym_id', gymId)
      .eq('member_id', member.id)
      .eq('date', todayString)
      .single();

    // Decision logic for Check-In vs Check-Out
    if (!existingAttendance) {
      if (type === 'out') {
        return NextResponse.json({
          error: 'Cannot check out: Member has not checked in today',
          member_name: member.name,
        }, { status: 400 });
      }

      // First scan of the day -> Check-In
      const { error: insertErr } = await supabaseAdmin
        .from('attendance')
        .insert({
          gym_id: gymId,
          branch_id: scope.branchId || member.branch_id || null,
          member_id: member.id,
          member_name: member.name,
          date: todayString,
          check_in_time: scanIso,
          method: 'face_recognition',
          confidence: confidence || 1.0,
          device_id: deviceId || 'browser-kiosk',
          notes: 'Client-side face recognition check-in',
        });

      if (insertErr) throw insertErr;

      // Increment attendance counter
      await supabaseAdmin
        .from('members')
        .update({
          attendance_count: (member.attendance_count || 0) + 1,
          last_attendance: scanIso,
        })
        .eq('id', member.id);

      return NextResponse.json({
        success: true,
        action: 'check_in',
        member_name: member.name,
        member_photo: member.photo_url,
        member_code: member.member_code,
        time: validScanDate.toLocaleTimeString('en-IN'),
        message: 'Checked in successfully',
      });
    }

    // Attendance record already exists for today
    if (existingAttendance.check_out_time) {
      // Already checked in and checked out
      return NextResponse.json({
        success: true,
        already_completed: true,
        action: 'already_completed',
        member_name: member.name,
        member_photo: member.photo_url,
        member_code: member.member_code,
        message: 'Already checked in and checked out for today',
      });
    }

    // Member has checked in, but not checked out
    const checkInMs = new Date(existingAttendance.check_in_time).getTime();
    const elapsedMinutes = (validScanDate.getTime() - checkInMs) / (1000 * 60);

    // If type is explicitly 'in', or if less than 5 minutes elapsed in auto mode
    if (type === 'in' || (type === 'auto' && elapsedMinutes < 5)) {
      return NextResponse.json({
        success: true,
        already_marked: true,
        action: 'check_in_duplicate',
        member_name: member.name,
        member_photo: member.photo_url,
        member_code: member.member_code,
        message: 'Already checked in today',
      });
    }

    // Second scan -> Mark Check-Out
    const { error: updateErr } = await supabaseAdmin
      .from('attendance')
      .update({
        check_out_time: scanIso,
      })
      .eq('id', existingAttendance.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      action: 'check_out',
      member_name: member.name,
      member_photo: member.photo_url,
      member_code: member.member_code,
      time: validScanDate.toLocaleTimeString('en-IN'),
      message: 'Checked out successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Face Check-in API failure:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
