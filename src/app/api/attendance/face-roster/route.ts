import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/platform/auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

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

    // Tenant isolation: resolve gym_id from caller's account
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id, role')
      .eq('auth_id', sessionUser.id)
      .single();

    let gymId = userData?.gym_id;

    if (!gymId) {
      // Check if superadmin
      const superAdmin = await isSuperAdmin(sessionUser.id);
      if (superAdmin && requestedGymId) {
        gymId = requestedGymId;
      } else {
        return NextResponse.json({ error: 'Forbidden: No gym assigned to this account' }, { status: 403 });
      }
    } else if (requestedGymId && requestedGymId !== gymId) {
      // If caller specifies a different gymId, check if superadmin
      const superAdmin = await isSuperAdmin(sessionUser.id);
      if (!superAdmin) {
        return NextResponse.json({ error: 'Forbidden: Cross-tenant access denied' }, { status: 403 });
      }
      gymId = requestedGymId;
    }

    // Fetch active members with enrolled face descriptors for this gym only
    const { data: members, error } = await supabaseAdmin
      .from('members')
      .select('id, name, member_code, photo_url, face_descriptor')
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .eq('face_enrolled', true)
      .not('face_descriptor', 'is', null);

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
