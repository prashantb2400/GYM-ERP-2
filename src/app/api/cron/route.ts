import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CRON_JOBS, executeCronJob } from '@/lib/cron/scheduler';

import crypto from 'crypto';

/** Verify the request is from Vercel Cron or an authorized admin call */
function isCronAuthorized(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  const expected = `Bearer ${secret}`;
  const authBuf = Buffer.from(authHeader);
  const expBuf = Buffer.from(expected);
  if (authBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(authBuf, expBuf);
}

export async function GET(request: Request) {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (!isCronAuthorized(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: logs } = await supabaseAdmin
      .from('cron_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      configs: CRON_JOBS,
      recentLogs: logs || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (!isCronAuthorized(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job');

    if (!jobId) {
      return NextResponse.json({ error: 'Missing job parameter' }, { status: 400 });
    }

    const result = await executeCronJob(jobId, supabaseAdmin);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
