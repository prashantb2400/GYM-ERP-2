import { NextResponse } from 'next/server';
import { waClient } from '@/lib/whatsapp/client';
import { TemplateParam } from '@/lib/whatsapp/types';
import { requireGymStaff } from '@/lib/server/requireGymStaff';
import { supabaseAdmin } from '@/lib/supabase/admin';

// H-15: Max recipients per broadcast request to prevent timeout (Vercel 60s limit)
const MAX_BROADCAST_RECIPIENTS = 50;

export async function POST(request: Request) {
  try {
    const staff = await requireGymStaff();
    if (staff instanceof Response) return staff;

    const body = await request.json();
    const { phones, templateName, paramsPerPhone } = body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid phones array' }, { status: 400 });
    }
    if (!templateName) {
      return NextResponse.json({ error: 'Missing templateName' }, { status: 400 });
    }
    if (!paramsPerPhone || !Array.isArray(paramsPerPhone) || paramsPerPhone.length !== phones.length) {
      return NextResponse.json({ error: 'Missing or invalid paramsPerPhone array' }, { status: 400 });
    }

    // H-15 FIX: Enforce per-request recipient limit to prevent serverless timeout
    if (phones.length > MAX_BROADCAST_RECIPIENTS) {
      return NextResponse.json(
        { error: `Broadcast limited to ${MAX_BROADCAST_RECIPIENTS} recipients per request. Split into batches.` },
        { status: 400 }
      );
    }

    // H-15 FIX: Check gym's WhatsApp plan quota before sending
    const { data: gymSub } = await supabaseAdmin
      .from('platform_subscriptions')
      .select('whatsapp_quota_remaining, plan_id')
      .eq('gym_id', staff.gymId)
      .maybeSingle();

    // If quota tracking exists, enforce it
    if (gymSub && typeof gymSub.whatsapp_quota_remaining === 'number') {
      if (gymSub.whatsapp_quota_remaining < phones.length) {
        return NextResponse.json(
          { error: `Insufficient WhatsApp quota. Available: ${gymSub.whatsapp_quota_remaining}, Requested: ${phones.length}` },
          { status: 429 }
        );
      }
    }

    const results = await waClient.broadcastTemplate(
      phones,
      templateName,
      paramsPerPhone as TemplateParam[][],
      staff.gymId
    );

    // Deduct quota if tracking enabled
    if (gymSub && typeof gymSub.whatsapp_quota_remaining === 'number') {
      const successCount = results.filter((r: any) => r.success).length;
      await supabaseAdmin
        .from('platform_subscriptions')
        .update({ whatsapp_quota_remaining: gymSub.whatsapp_quota_remaining - successCount })
        .eq('gym_id', staff.gymId);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
