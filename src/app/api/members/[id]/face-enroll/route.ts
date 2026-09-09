import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/platform/auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`face-enroll:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const params = await props.params;
    const { id: memberId } = params;

    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve caller's gym for tenant isolation
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id, role')
      .eq('auth_id', sessionUser.id)
      .single();

    const callerGymId = userData?.gym_id;
    const isPlatformAdmin = !callerGymId ? await isSuperAdmin(sessionUser.id) : false;

    // Verify member exists and belongs to caller's gym
    let memberQuery = supabaseAdmin
      .from('members')
      .select('id, gym_id')
      .eq('id', memberId);

    if (!isPlatformAdmin) {
      if (!callerGymId) {
        return NextResponse.json({ error: 'Forbidden: No gym assigned to this user' }, { status: 403 });
      }
      memberQuery = memberQuery.eq('gym_id', callerGymId);
    }

    const { data: targetMember, error: memberErr } = await memberQuery.single();
    if (memberErr || !targetMember) {
      return NextResponse.json({ error: 'Member not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const { descriptor, consentGiven } = body;

    if (!consentGiven) {
      return NextResponse.json({ error: 'Explicit DPDP consent is mandatory before enrolling face descriptor' }, { status: 400 });
    }

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return NextResponse.json({ error: 'Invalid face descriptor: must be a 128-element float array' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    let updateQuery = supabaseAdmin
      .from('members')
      .update({
        face_enrolled: true,
        face_descriptor: descriptor,
        consent_given_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', memberId);

    if (!isPlatformAdmin && callerGymId) {
      updateQuery = updateQuery.eq('gym_id', callerGymId);
    }

    const { error: updateErr } = await updateQuery;
    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'Face descriptor enrolled successfully with verified consent',
      enrolled_at: nowIso,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Face enrollment failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`face-delete:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const params = await props.params;
    const { id: memberId } = params;

    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve caller's gym for tenant isolation
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id, role')
      .eq('auth_id', sessionUser.id)
      .single();

    const callerGymId = userData?.gym_id;
    const isPlatformAdmin = !callerGymId ? await isSuperAdmin(sessionUser.id) : false;

    // Verify member exists and belongs to caller's gym
    let memberQuery = supabaseAdmin
      .from('members')
      .select('id, gym_id')
      .eq('id', memberId);

    if (!isPlatformAdmin) {
      if (!callerGymId) {
        return NextResponse.json({ error: 'Forbidden: No gym assigned to this user' }, { status: 403 });
      }
      memberQuery = memberQuery.eq('gym_id', callerGymId);
    }

    const { data: targetMember, error: memberErr } = await memberQuery.single();
    if (memberErr || !targetMember) {
      return NextResponse.json({ error: 'Member not found or access denied' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    // Right to erasure: permanently delete descriptor
    let deleteQuery = supabaseAdmin
      .from('members')
      .update({
        face_enrolled: false,
        face_descriptor: null,
        consent_given_at: null,
        updated_at: nowIso,
      })
      .eq('id', memberId);

    if (!isPlatformAdmin && callerGymId) {
      deleteQuery = deleteQuery.eq('gym_id', callerGymId);
    }

    const { error: deleteErr } = await deleteQuery;
    if (deleteErr) throw deleteErr;

    return NextResponse.json({
      success: true,
      message: 'Face descriptor and biometric records permanently deleted',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Face descriptor deletion failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
