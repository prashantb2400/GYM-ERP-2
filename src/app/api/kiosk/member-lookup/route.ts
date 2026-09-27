import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { verifyKioskOrAuth } from '@/lib/server/kiosk-auth';
import { validateBody } from '@/lib/server/validate';
import { kioskMemberLookupSchema } from '@/lib/schemas/kiosk';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`kiosk-lookup:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many lookup requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const validation = await validateBody(request, kioskMemberLookupSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { gymId, query } = validation.data;

    // Enforce mandatory kiosk device authentication or staff/owner session
    const authResult = await verifyKioskOrAuth(request, gymId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const cleanQuery = String(query).trim();

    // Query member
    const { data: member, error: mErr } = await supabaseAdmin
      .from('members')
      .select('id, name, member_code, phone, status, photo_url, current_plan_id, plan_start_date, plan_end_date, total_due, attendance_count, last_attendance, locker_number, plans(id, name, duration_days, price)')
      .eq('gym_id', gymId)
      .or(`phone.eq.${cleanQuery},member_code.ilike.${cleanQuery}`)
      .limit(1)
      .maybeSingle();

    if (mErr || !member) {
      return NextResponse.json(
        { error: 'No member found matching this phone number or Member ID.' },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    let daysRemaining = 0;
    if (member.plan_end_date) {
      const expiry = new Date(member.plan_end_date);
      const diffMs = expiry.getTime() - new Date(today).getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Fetch available plans for renewal
    const { data: availablePlans } = await supabaseAdmin
      .from('plans')
      .select('id, name, duration_days, price, features')
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // Mask phone number for privacy display on public kiosk
    const rawPhone = member.phone || '';
    const maskedPhone = rawPhone.length >= 10
      ? `${rawPhone.slice(0, 2)}******${rawPhone.slice(-2)}`
      : '***';

    return NextResponse.json({
      member: {
        id: member.id,
        name: member.name,
        memberCode: member.member_code,
        phone: maskedPhone,
        status: member.status,
        photoUrl: member.photo_url,
        currentPlanName: (member.plans as any)?.name || 'Custom Plan',
        planStartDate: member.plan_start_date,
        planEndDate: member.plan_end_date,
        daysRemaining,
        totalDue: Number(member.total_due || 0),
        attendanceCount: member.attendance_count || 0,
        lockerNumber: member.locker_number,
      },
      availablePlans: availablePlans || [],
    });
  } catch (err: any) {
    console.error('Member lookup error:', err);
    return NextResponse.json({ error: err.message || 'Lookup failed' }, { status: 500 });
  }
}
