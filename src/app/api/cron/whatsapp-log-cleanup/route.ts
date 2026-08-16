import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

function isAuthorized(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  const headersList = await headers();
  const auth = headersList.get('authorization') ??
    new URL(request.url).searchParams.get('cron_secret');

  if (!isAuthorized(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  try {
    const { count, error } = await supabaseAdmin
      .from('whatsapp_logs')
      .delete({ count: 'exact' })
      .lt('sent_at', ninetyDaysAgo.toISOString());

    if (error) throw error;

    return NextResponse.json({
      success: true,
      deleted: count,
      cutoffDate: ninetyDaysAgo.toISOString(),
      message: `Deleted ${count} WhatsApp log entries older than 90 days`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
