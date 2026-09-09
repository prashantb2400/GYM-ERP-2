import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId');

    if (!gymId) {
      return NextResponse.json({ error: 'Missing gymId parameter' }, { status: 400 });
    }

    // Fetch active members with enrolled face descriptors
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
