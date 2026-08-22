import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { memberCode, confidence, gymId, token, notes } = await request.json();

    if (!memberCode || !gymId || !token) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify secure connection token
    const expectedToken = process.env.CCTV_AUTH_TOKEN;
    if (!expectedToken) {
      return NextResponse.json({ error: 'CCTV integration is not configured' }, { status: 503 });
    }
    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized hardware handshake' }, { status: 401 });
    }

    // 1. Fetch corresponding member
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('gym_id', gymId)
      .eq('member_code', memberCode)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: 'Member profile not found for code' }, { status: 404 });
    }

    if (member.status !== 'active') {
      return NextResponse.json({ 
        error: 'Access denied: membership status is ' + member.status,
        member_name: member.name
      }, { status: 403 });
    }

    const todayString = new Date().toISOString().split('T')[0];

    // 2. Check if already marked for today to prevent multiple quick camera triggers
    const { data: existingAttendance } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('gym_id', gymId)
      .eq('member_id', member.id)
      .eq('date', todayString)
      .single();

    if (existingAttendance) {
      return NextResponse.json({ 
        success: true, 
        message: 'Attendance already marked for today', 
        member_name: member.name,
        already_marked: true
      });
    }

    // 3. Mark the check-in
    const { error: markErr } = await supabaseAdmin
      .from('attendance')
      .insert({
        gym_id: gymId,
        member_id: member.id,
        member_name: member.name,
        date: todayString,
        method: 'face_recognition',
        confidence: confidence || 1.0,
        notes: notes || 'Auto check-in via local CCTV Camera stream',
      });

    if (markErr) throw markErr;

    // 4. Increment check-in count on member record
    await supabaseAdmin
      .from('members')
      .update({
        attendance_count: (member.attendance_count || 0) + 1,
        last_attendance: new Date().toISOString(),
      })
      .eq('id', member.id);

    return NextResponse.json({
      success: true,
      member_name: member.name,
      member_code: member.member_code,
      checked_in_at: new Date().toLocaleTimeString('en-IN'),
    });
  } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('CCTV Face Check-in API failure:', err);
    return NextResponse.json({ error: msg || 'Internal check-in processor failure' }, { status: 500 });
  }
}
