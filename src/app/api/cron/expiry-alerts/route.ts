import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isCronAuthorized } from '@/lib/server/cronAuth';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Get all active members expiring in the next 7 days
    const { data: membersExpiring, error } = await supabaseAdmin
      .from('members')
      .select('id, name, phone, whatsapp_phone, plan_end_date, gym_id')
      .eq('status', 'active')
      .gte('plan_end_date', today.toISOString())
      .lte('plan_end_date', nextWeek.toISOString())
      .limit(500);

    if (error) throw error;

    let sent = 0;
    let failed = 0;

    for (const member of (membersExpiring || [])) {
      const phone = member.whatsapp_phone || member.phone;
      if (!phone) { failed++; continue; }

      const endDate = new Date(member.plan_end_date);
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Log the WhatsApp dispatch (actual sending done by WhatsApp API)
      const { error: logError } = await supabaseAdmin
        .from('whatsapp_logs')
        .insert({
          gym_id: member.gym_id,
          member_id: member.id,
          recipient_phone: phone,
          recipient_name: member.name,
          message_type: 'template',
          template_name: 'plan_expiry_reminder',
          sent_at: new Date().toISOString(),
          status: 'sent',
          wa_message_id: `cron_exp_${Date.now()}_${member.id.slice(0, 8)}`,
        });

      if (logError) { failed++; } else { sent++; }
      
      // Rate limiting: 5 per second
      if (sent % 5 === 0) await new Promise(r => setTimeout(r, 1000));
    }

    return NextResponse.json({ success: true, processed: membersExpiring?.length || 0, sent, failed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
