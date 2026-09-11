import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/platform/auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';
import { getAuthUser } from '@/lib/server/auth-helper';

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
    const { descriptor, descriptors, consentGiven } = body;

    if (!consentGiven) {
      return NextResponse.json({ error: 'Explicit DPDP consent is mandatory before enrolling face descriptor' }, { status: 400 });
    }

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return NextResponse.json({ error: 'Invalid face descriptor: must be a 128-element float array' }, { status: 400 });
    }

    let gallery: number[][] = [descriptor];
    if (descriptors && Array.isArray(descriptors) && descriptors.length > 0) {
      for (const d of descriptors) {
        if (!Array.isArray(d) || d.length !== 128) {
          return NextResponse.json({ error: 'Invalid gallery descriptor: each pose must be a 128-element float array' }, { status: 400 });
        }
      }
      gallery = descriptors;
    }

    const nowIso = new Date().toISOString();

    const { error: updateErr } = await supabaseAdmin
      .from('members')
      .update({
        face_enrolled: true,
        face_descriptor: {
          primary: descriptor,
          gallery,
          enrolled_at: nowIso,
        },
        consent_given_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', memberId)
      .eq('gym_id', scope.gymId);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'Face descriptor enrolled successfully with verified consent',
      enrolled_at: nowIso,
      poses_count: gallery.length,
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

    // Branch isolation: staff can only delete biometrics for members of their branch
    if (scope.branchId && targetMember.branch_id && targetMember.branch_id !== scope.branchId) {
      return NextResponse.json({ error: 'Forbidden: Member belongs to a different branch' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();

    // Right to erasure: permanently delete descriptor
    const { error: deleteErr } = await supabaseAdmin
      .from('members')
      .update({
        face_enrolled: false,
        face_descriptor: null,
        consent_given_at: null,
        updated_at: nowIso,
      })
      .eq('id', memberId)
      .eq('gym_id', scope.gymId);

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
