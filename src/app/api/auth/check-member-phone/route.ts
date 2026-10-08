import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`check-member-phone:${ip}`, 20, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 60) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawPhone = typeof body.phone === 'string' ? body.phone : '';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please provide a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    // Query members table via supabaseAdmin to bypass RLS for pre-auth lookup
    const { data: member, error: dbError } = await supabaseAdmin
      .from('members')
      .select('id, gym_id, is_active')
      .eq('phone', cleanPhone)
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error('Check member phone DB error:', dbError);
      return NextResponse.json(
        { error: 'Database check failed. Please try again.' },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json({ registered: false });
    }

    return NextResponse.json({
      registered: true,
      isActive: member.is_active ?? true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    console.error('API /api/auth/check-member-phone error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
