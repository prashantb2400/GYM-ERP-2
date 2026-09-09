import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gymId, memberId, confidence, type = 'auto', deviceId } = body;

    if (!gymId || !memberId) {
      return NextResponse.json({ error: 'Missing required gymId or memberId' }, { status: 400 });
    }

    // 1. Verify member belongs to this gym and is active
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, name, member_code, status, photo_url, attendance_count')
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

    const todayString = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

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
      // First scan of the day -> Check-In
      const { error: insertErr } = await supabaseAdmin
        .from('attendance')
        .insert({
          gym_id: gymId,
          member_id: member.id,
          member_name: member.name,
          date: todayString,
          check_in_time: nowIso,
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
          last_attendance: nowIso,
        })
        .eq('id', member.id);

      return NextResponse.json({
        success: true,
        action: 'check_in',
        member_name: member.name,
        member_photo: member.photo_url,
        member_code: member.member_code,
        time: new Date().toLocaleTimeString('en-IN'),
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
    const elapsedMinutes = (Date.now() - checkInMs) / (1000 * 60);

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
        check_out_time: nowIso,
      })
      .eq('id', existingAttendance.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      action: 'check_out',
      member_name: member.name,
      member_photo: member.photo_url,
      member_code: member.member_code,
      time: new Date().toLocaleTimeString('en-IN'),
      message: 'Checked out successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Face Check-in API failure:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
