import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

function isAuthorized(authHeader: string | null, querySecret: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (querySecret && querySecret === secret) return true;
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const querySecret = new URL(request.url).searchParams.get('cron_secret');

  if (!isAuthorized(authHeader, querySecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all active members with dues > 0 across all gyms
    const { data: membersWithDues, error } = await supabaseAdmin
      .from('members')
      .select('id, name, phone, whatsapp_phone, total_due, gym_id, gyms(name)')
      .eq('status', 'active')
      .gt('total_due', 0)
      .limit(500); // Process max 500 per run to avoid timeout

    if (error) throw error;

    let sent = 0;
    let failed = 0;

    for (const member of (membersWithDues || [])) {
      const phone = member.whatsapp_phone || member.phone;
      if (!phone) { failed++; continue; }

      // Log the WhatsApp dispatch (actual sending done by WhatsApp API)
      const { error: logError } = await supabaseAdmin
        .from('whatsapp_logs')
        .insert({
          gym_id: member.gym_id,
          member_id: member.id,
          phone,
          template_name: 'due_payment_reminder',
          variables: { member_name: member.name, amount_due: `₹${member.total_due}` },
          sent_at: new Date().toISOString(),
          status: 'queued',
          wa_message_id: `cron_due_${Date.now()}_${member.id.slice(0, 8)}`,
        });

      if (logError) { failed++; } else { sent++; }
      
      // Rate limiting: 5 per second
      if (sent % 5 === 0) await new Promise(r => setTimeout(r, 1000));
    }

    return NextResponse.json({ success: true, processed: membersWithDues?.length || 0, sent, failed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
