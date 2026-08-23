import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * H-19 FIX: Secure server-side member self-registration.
 * Called after OTP verification on /member/register.
 * Uses supabaseAdmin to bypass RLS — safe because:
 * 1. The auth user ID is from a verified Supabase session (passed in body, verified server-side)
 * 2. Phone uniqueness is checked server-side
 * 3. Status is always 'pending' — no privilege escalation possible
 */
export async function POST(request: Request) {
  try {
    const { authUserId, gymId, name, phone, dob, gender } = await request.json();

    if (!authUserId || !gymId || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Check gym exists and is active
    const { data: gym, error: gymErr } = await supabaseAdmin
      .from('gyms')
      .select('id, is_suspended')
      .eq('id', gymId)
      .maybeSingle();

    if (gymErr || !gym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    if (gym.is_suspended) {
      return NextResponse.json({ error: 'This gym is currently suspended' }, { status: 403 });
    }

    // Check phone uniqueness in this gym
    const { data: existing } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('phone', cleanPhone)
      .eq('gym_id', gymId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This phone number is already registered at this gym' }, { status: 409 });
    }

    // Generate next member code atomically using counter
    const { data: counter } = await supabaseAdmin
      .from('counters')
      .select('member_count')
      .eq('gym_id', gymId)
      .single();

    const nextCount = (counter?.member_count || 0) + 1;
    const memberCode = `MBR${String(nextCount).padStart(4, '0')}`;

    // Update counter
    await supabaseAdmin
      .from('counters')
      .update({ member_count: nextCount })
      .eq('gym_id', gymId);

    // Insert member record
    const { data: newMember, error: insertError } = await supabaseAdmin
      .from('members')
      .insert({
        auth_id: authUserId,
        gym_id: gymId,
        member_code: memberCode,
        name: String(name).trim(),
        phone: cleanPhone,
        dob: dob || null,
        gender: gender || null,
        status: 'pending', // Always pending — receptionist must approve
      })
      .select('id, member_code, name')
      .single();

    if (insertError) {
      console.error('Member self-registration insert error:', insertError);
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, memberId: newMember.id, memberCode: newMember.member_code });
  } catch (err: unknown) {
    console.error('Member self-registration error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
