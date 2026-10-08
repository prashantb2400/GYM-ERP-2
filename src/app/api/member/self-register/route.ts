import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`member-self-register:${ip}`, 15, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 60) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action = 'register', gymId, name, phone, dob, gender, authId } = body;

    if (!gymId || typeof gymId !== 'string') {
      return NextResponse.json({ error: 'Please select a valid gym' }, { status: 400 });
    }

    const cleanPhone = typeof phone === 'string' ? phone.replace(/\D/g, '').slice(-10) : '';
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please provide a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    // Verify gym exists
    const { data: gym, error: gymError } = await supabaseAdmin
      .from('gyms')
      .select('id, name')
      .eq('id', gymId)
      .maybeSingle();

    if (gymError || !gym) {
      return NextResponse.json({ error: 'Selected gym was not found' }, { status: 404 });
    }

    // Check if phone number is already registered at this gym
    const { data: existingMember } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('gym_id', gymId)
      .eq('phone', cleanPhone)
      .limit(1)
      .maybeSingle();

    if (action === 'check') {
      return NextResponse.json({
        available: !existingMember,
        alreadyRegistered: Boolean(existingMember),
      });
    }

    if (existingMember) {
      return NextResponse.json(
        { error: 'This phone number is already registered at this gym.' },
        { status: 409 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Please enter your full name' }, { status: 400 });
    }

    // 1. Resolve gym primary branch
    let branchId: string | null = null;
    const { data: primaryBranch } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (primaryBranch) {
      branchId = primaryBranch.id;
    } else {
      // Create fallback branch if none exists
      const { data: createdBranch } = await supabaseAdmin
        .from('branches')
        .insert({
          gym_id: gymId,
          name: `${gym.name || 'Main'} Branch`,
          is_active: true,
        })
        .select('id')
        .maybeSingle();
      branchId = createdBranch?.id || null;
    }

    // 2. Generate member code safely
    let memberCode = '';
    try {
      const { data: codeData, error: codeError } = await supabaseAdmin.rpc('generate_member_code', {
        p_gym_id: gymId,
      });
      if (!codeError && typeof codeData === 'string' && codeData) {
        memberCode = codeData;
      }
    } catch (rpcErr) {
      console.warn('generate_member_code RPC call failed, falling back to counter query:', rpcErr);
    }

    if (!memberCode) {
      const { count } = await supabaseAdmin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId);
      const nextNum = (count || 0) + 1;
      memberCode = `GYM${String(nextNum).padStart(4, '0')}`;
    }

    // 3. Create member record with status 'pending'
    const newMemberPayload = {
      auth_id: authId || null,
      gym_id: gymId,
      branch_id: branchId,
      member_code: memberCode,
      qr_token: crypto.randomUUID(),
      name: name.trim(),
      phone: cleanPhone,
      dob: dob || null,
      gender: gender && ['male', 'female', 'other'].includes(gender) ? gender : null,
      status: 'pending',
      is_active: false,
    };

    const { data: insertedMember, error: insertError } = await supabaseAdmin
      .from('members')
      .insert(newMemberPayload)
      .select('id, member_code, name')
      .single();

    if (insertError) {
      console.error('Member self-registration insert failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to create member record. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      member: {
        id: insertedMember.id,
        memberCode: insertedMember.member_code,
        name: insertedMember.name,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('API /api/member/self-register error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
