import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`kiosk-lead:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many submissions. Please speak to our front desk staff.' },
        { status: 429 }
      );
    }

    const { gymId, branchId, name, phone, email, goal, preferredSlot } = await request.json();

    if (!gymId || !name || !phone) {
      return NextResponse.json({ error: 'Name and 10-digit phone number are required.' }, { status: 400 });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit phone number.' }, { status: 400 });
    }

    const passCode = `PASS-${Math.floor(1000 + Math.random() * 9000)}`;
    const notes = `Walk-in Kiosk Registration. Pass: ${passCode}. Goal: ${goal || 'General Fitness'}. Slot: ${preferredSlot || 'Anytime'}.`;

    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .insert({
        gym_id: gymId,
        branch_id: branchId || null,
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : null,
        interest: 'membership',
        source: 'kiosk',
        status: 'new',
        notes,
      })
      .select()
      .single();

    if (leadErr) {
      console.warn('Could not insert into leads table (table may not exist yet):', leadErr.message);
    }

    return NextResponse.json({
      success: true,
      passCode,
      message: 'Welcome! Your 1-Day Trial Pass has been activated.',
      guestName: name.trim(),
      phone: cleanPhone,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (err: any) {
    console.error('Kiosk lead error:', err);
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
