import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { verifyKioskOrAuth } from '@/lib/server/kiosk-auth';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`kiosk-checkin:${ip}`, 120, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many check-in requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const { gymId, branchId, query, method = 'keypad' } = await request.json();

    if (!gymId || !query) {
      return NextResponse.json({ error: 'Missing gymId or identifier query' }, { status: 400 });
    }

    // Enforce mandatory kiosk device authentication or staff/owner session
    const authResult = await verifyKioskOrAuth(request, gymId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const cleanQuery = String(query).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQuery);

    // 1. Locate member
    let memberQuery = supabaseAdmin
      .from('members')
      .select('id, name, member_code, phone, status, photo_url, plan_start_date, plan_end_date, total_due, attendance_count, locker_number, branch_id')
      .eq('gym_id', gymId);

    if (isUuid) {
      memberQuery = memberQuery.or(`id.eq.${cleanQuery},qr_token.eq.${cleanQuery}`);
    } else {
      memberQuery = memberQuery.or(`phone.eq.${cleanQuery},member_code.ilike.${cleanQuery},qr_token.eq.${cleanQuery}`);
    }

    const { data: member, error: memberErr } = await memberQuery.limit(1).maybeSingle();

    if (memberErr || !member) {
      return NextResponse.json(
        { error: 'Member not found. Please verify your phone number or Member ID.' },
        { status: 404 }
      );
    }

    // 2. Check membership status
    const today = new Date().toISOString().split('T')[0];
    let daysRemaining = 0;
    if (member.plan_end_date) {
      const expiry = new Date(member.plan_end_date);
      const diffMs = expiry.getTime() - new Date(today).getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    if (member.status === 'expired' || (member.plan_end_date && member.plan_end_date < today)) {
      return NextResponse.json({
        state: 'expired',
        message: 'Membership has expired. Please renew at the kiosk or front desk.',
        member: {
          id: member.id,
          name: member.name,
          memberCode: member.member_code,
          photoUrl: member.photo_url,
          status: 'expired',
          daysRemaining: 0,
          totalDue: member.total_due || 0,
          lockerNumber: member.locker_number,
        },
      });
    }

    if (member.status === 'frozen') {
      return NextResponse.json({
        state: 'frozen',
        message: 'Membership is currently on hold / frozen.',
        member: {
          id: member.id,
          name: member.name,
          memberCode: member.member_code,
          photoUrl: member.photo_url,
          status: 'frozen',
          daysRemaining,
          totalDue: member.total_due || 0,
        },
      });
    }

    // 3. Check if already checked in today
    const { data: existingAttendance } = await supabaseAdmin
      .from('attendance')
      .select('id, check_in_time')
      .eq('gym_id', gymId)
      .eq('member_id', member.id)
      .eq('date', today)
      .maybeSingle();

    if (existingAttendance) {
      return NextResponse.json({
        state: 'already',
        alreadyMarked: true,
        message: `Already checked in today at ${existingAttendance.check_in_time}`,
        member: {
          id: member.id,
          name: member.name,
          memberCode: member.member_code,
          photoUrl: member.photo_url,
          status: member.status,
          daysRemaining,
          totalDue: member.total_due || 0,
          lockerNumber: member.locker_number,
        },
      });
    }

    // 4. Record new attendance
    const attendanceMethod =
      method === 'qr_scan'
        ? 'qr_scan'
        : method === 'face_recognition'
        ? 'face_recognition'
        : 'manual';

    const { error: insErr } = await supabaseAdmin.from('attendance').insert({
      gym_id: gymId,
      branch_id: branchId || member.branch_id || null,
      member_id: member.id,
      member_name: member.name,
      date: today,
      method: attendanceMethod,
      notes: `Kiosk self check-in via ${method}`,
    });

    if (insErr) throw insErr;

    // 5. Increment member attendance stats
    await supabaseAdmin
      .from('members')
      .update({
        attendance_count: (member.attendance_count || 0) + 1,
        last_attendance: new Date().toISOString(),
      })
      .eq('id', member.id);

    return NextResponse.json({
      state: 'success',
      alreadyMarked: false,
      message: 'Check-in successful! Have a great workout!',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      member: {
        id: member.id,
        name: member.name,
        memberCode: member.member_code,
        photoUrl: member.photo_url,
        status: member.status,
        daysRemaining,
        totalDue: member.total_due || 0,
        lockerNumber: member.locker_number,
        attendanceCount: (member.attendance_count || 0) + 1,
      },
    });
  } catch (err: any) {
    console.error('Kiosk check-in error:', err);
    return NextResponse.json({ error: err.message || 'Check-in failed' }, { status: 500 });
  }
}
