import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/platform/auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';
import { getAuthUser } from '@/lib/server/auth-helper';

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

    const { user: sessionUser, error: authErr } = await getAuthUser(request);
    if (!sessionUser || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
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

    const branchOnly = searchParams.get('branchOnly') === 'true';

    // Fetch active members with enrolled face descriptors.
    // By default, loads active members across the entire gym so members can check in at any branch.
    // If branchOnly=true is explicitly requested, restricts to that branch.
    let query = supabaseAdmin
      .from('members')
      .select('id, name, member_code, photo_url, face_descriptor, branch_id')
      .eq('gym_id', scope.gymId)
      .eq('status', 'active')
      .eq('face_enrolled', true)
      .not('face_descriptor', 'is', null);

    if (branchOnly && scope.branchId) {
      query = query.eq('branch_id', scope.branchId);
    }

    const { data: members, error } = await query;

    if (error) throw error;

    const roster = (members || []).map(m => {
      let primaryDesc: number[] = [];
      let gallery: number[][] = [];

      const raw = m.face_descriptor;
      if (Array.isArray(raw)) {
        if (typeof raw[0] === 'number') {
          // Legacy single 128-d vector
          primaryDesc = raw;
          gallery = [raw];
        } else if (Array.isArray(raw[0])) {
          // Array of 128-d vectors
          gallery = raw;
          primaryDesc = raw[0];
        }
      } else if (raw && typeof raw === 'object') {
        // Structured object { primary, gallery }
        if (Array.isArray(raw.primary)) {
          primaryDesc = raw.primary;
        }
        if (Array.isArray(raw.gallery)) {
          gallery = raw.gallery;
        }
        if (gallery.length === 0 && primaryDesc.length > 0) {
          gallery = [primaryDesc];
        }
        if (primaryDesc.length === 0 && gallery.length > 0) {
          primaryDesc = gallery[0];
        }
      }

      return {
        memberId: m.id,
        name: m.name,
        memberCode: m.member_code,
        photoUrl: m.photo_url,
        descriptor: primaryDesc,
        descriptors: gallery,
        branchId: m.branch_id,
      };
    });

    return NextResponse.json(roster);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Face Roster API failure:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
