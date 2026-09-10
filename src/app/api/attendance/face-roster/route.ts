import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/platform/auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`face-roster:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedGymId = searchParams.get('gymId');
    const requestedBranchId = searchParams.get('branchId');

    // Tenant & Branch isolation: resolve scope from caller's account
    const scope = await getBranchScope(sessionUser.id, {
      requestedGymId,
      requestedBranchId,
    });

    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    // Fetch active members with enrolled face descriptors for this branch/gym
    let query = supabaseAdmin
      .from('members')
      .select('id, name, member_code, photo_url, face_descriptor, branch_id')
      .eq('gym_id', scope.gymId)
      .eq('status', 'active')
      .eq('face_enrolled', true)
      .not('face_descriptor', 'is', null);

    if (scope.branchId) {
      query = query.eq('branch_id', scope.branchId);
    }

    const { data: members, error } = await query;

    if (error) throw error;

    const roster = (members || []).map(m => ({
      memberId: m.id,
      name: m.name,
      memberCode: m.member_code,
      photoUrl: m.photo_url,
      descriptor: m.face_descriptor,
    }));

    return NextResponse.json(roster);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Face Roster API failure:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
