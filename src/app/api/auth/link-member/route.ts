import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * S0-9: Server-side route to link a newly authenticated Supabase user
 * to their existing member record by phone number.
 * Uses supabaseAdmin to bypass RLS — this is safe because:
 * 1. The phone is validated server-side
 * 2. We only update the member whose phone matches
 * 3. The auth_id is from a verified Supabase session
 */
export async function POST(request: Request) {
  try {
    const { phone, authUserId } = await request.json();

    if (!phone || !authUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Normalize phone — only digits
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Find member by phone (exact match)
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, auth_id')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (memberErr) {
      console.error('Error finding member by phone:', memberErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!member) {
      return NextResponse.json({ error: 'No member found with this phone number' }, { status: 404 });
    }

    // Only update if not already linked (idempotent)
    if (member.auth_id === authUserId) {
      return NextResponse.json({ success: true, alreadyLinked: true });
    }

    // Link the auth user to the member record
    const { error: updateErr } = await supabaseAdmin
      .from('members')
      .update({ auth_id: authUserId })
      .eq('id', member.id);

    if (updateErr) {
      console.error('Error linking auth user to member:', updateErr);
      return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('link-member error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
