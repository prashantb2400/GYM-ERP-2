import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find member record for this auth user
  const { data: memberData } = await supabaseAdmin
    .from('members')
    .select('id, gym_id')
    .eq('auth_id', user.id)
    .single();

  if (!memberData) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  try {
    // Anonymize rather than hard-delete (preserve billing records)
    await supabaseAdmin
      .from('members')
      .update({
        name: 'Deleted User',
        phone: '0000000000',
        email: null,
        photo_url: null,
        dob: null,
        address: null,
        emergency_contact: {},
        health_goals: [],
        medical_conditions: null,
        auth_id: null,
      })
      .eq('id', memberData.id);

    // Delete WhatsApp logs for this member
    await supabaseAdmin.from('whatsapp_logs').delete().eq('member_id', memberData.id);

    // Delete auth account
    await supabaseAdmin.auth.admin.deleteUser(user.id);

    return NextResponse.json({ success: true, message: 'Your personal data has been deleted.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Deletion failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
