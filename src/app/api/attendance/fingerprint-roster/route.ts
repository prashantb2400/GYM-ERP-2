import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`fp-roster:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const { user: sessionUser, error: authErr } = await getAuthUser(request);
    if (!sessionUser || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedGymId = searchParams.get('gymId');
    const requestedBranchId = searchParams.get('branchId');

    const scope = await getBranchScope(sessionUser.id, {
      requestedGymId,
      requestedBranchId,
    });

    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const branchOnly = searchParams.get('branchOnly') === 'true';

    let query = supabaseAdmin
      .from('members')
      .select('id, name, member_code, photo_url, status, plan_end_date, total_due, branch_id, fingerprint_template, fingerprint_finger, fingerprint_quality')
      .eq('gym_id', scope.gymId)
      .eq('status', 'active')
      .not('fingerprint_template', 'is', null);

    if (branchOnly && scope.branchId) {
      query = query.eq('branch_id', scope.branchId);
    }

    const { data: members, error } = await query;
    if (error) throw error;

    const roster = (members || []).map((m) => ({
      id: m.id,
      name: m.name,
      member_code: m.member_code,
      photo_url: m.photo_url,
      status: m.status,
      plan_end_date: m.plan_end_date,
      total_due: m.total_due,
      branch_id: m.branch_id,
      fingerprint_template: m.fingerprint_template,
      fingerprint_finger: m.fingerprint_finger,
      fingerprint_quality: m.fingerprint_quality,
    }));

    return NextResponse.json({
      success: true,
      count: roster.length,
      roster,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch fingerprint roster';
    console.error('Fingerprint roster error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
