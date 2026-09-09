import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

function isAuthorized(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  const expected = `Bearer ${secret}`;
  const authBuf = Buffer.from(authHeader);
  const expBuf = Buffer.from(expected);
  if (authBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(authBuf, expBuf);
}

export async function GET(_request: Request) {
  const headersList = await headers();
  const auth = headersList.get('authorization');

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
