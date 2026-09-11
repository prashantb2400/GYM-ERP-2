import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`fingerprint-enroll:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const params = await props.params;
    const { id: memberId } = params;

    const { user: sessionUser, error: authErr } = await getAuthUser(request);
    if (!sessionUser || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    // Resolve caller's scope for tenant & branch isolation
    const scope = await getBranchScope(sessionUser.id);
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    // Verify member exists and belongs to caller's gym
    const { data: targetMember, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, gym_id, branch_id')
      .eq('id', memberId)
      .eq('gym_id', scope.gymId)
      .single();

    if (memberErr || !targetMember) {
      return NextResponse.json({ error: 'Member not found or access denied' }, { status: 404 });
    }

    // Branch isolation: staff can only enroll biometrics for members of their branch
    if (scope.branchId && targetMember.branch_id && targetMember.branch_id !== scope.branchId) {
      return NextResponse.json({ error: 'Forbidden: Member belongs to a different branch' }, { status: 403 });
    }

    const body = await request.json();
    const { template, finger = 'right_thumb', quality = 80, consentGiven } = body;

    if (!consentGiven) {
      return NextResponse.json(
        { error: 'Explicit DPDP consent is mandatory before enrolling biometric fingerprint' },
        { status: 400 }
      );
    }

    if (!template || !template.minutiae || !Array.isArray(template.minutiae) || template.minutiae.length < 6) {
      return NextResponse.json(
        { error: 'Invalid fingerprint template: Insufficient minutiae points captured' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: updateErr } = await supabaseAdmin
      .from('members')
      .update({
        biometric_enrolled: true,
        fingerprint_template: template,
        fingerprint_finger: finger,
        fingerprint_quality: quality,
        fingerprint_enrolled_at: nowIso,
        consent_given_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', memberId)
      .eq('gym_id', scope.gymId);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'Fingerprint enrolled successfully with verified DPDP consent',
      enrolled_at: nowIso,
      finger,
      quality,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Fingerprint enrollment failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`fingerprint-delete:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const params = await props.params;
    const { id: memberId } = params;

    const { user: sessionUser, error: authErr } = await getAuthUser(request);
    if (!sessionUser || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const scope = await getBranchScope(sessionUser.id);
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const { data: targetMember, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, gym_id, branch_id')
      .eq('id', memberId)
      .eq('gym_id', scope.gymId)
      .single();

    if (memberErr || !targetMember) {
      return NextResponse.json({ error: 'Member not found or access denied' }, { status: 404 });
    }

    if (scope.branchId && targetMember.branch_id && targetMember.branch_id !== scope.branchId) {
      return NextResponse.json({ error: 'Forbidden: Member belongs to a different branch' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();

    // Right to erasure: permanently wipe biometric fingerprint data
    const { error: deleteErr } = await supabaseAdmin
      .from('members')
      .update({
        biometric_enrolled: false,
        fingerprint_template: null,
        fingerprint_finger: null,
        fingerprint_quality: null,
        fingerprint_enrolled_at: null,
        updated_at: nowIso,
      })
      .eq('id', memberId)
      .eq('gym_id', scope.gymId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({
      success: true,
      message: 'Biometric fingerprint template permanently deleted under DPDP Act right to erasure',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Fingerprint template deletion failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
