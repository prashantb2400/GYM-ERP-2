import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CRON_JOBS, executeCronJob } from '@/lib/cron/scheduler';
import { isCronAuthorized } from '@/lib/server/cronAuth';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job');

    // S0-8 FIX: Vercel Cron sends GET requests with ?job= param — execute the job
    if (jobId) {
      const result = await executeCronJob(jobId, supabaseAdmin);
      return NextResponse.json(result);
    }

    // No job param: return logs for manual dashboard inspection
    const { data: logs } = await supabaseAdmin
      .from('cron_logs')
      .select('*')
      .order('run_at', { ascending: false })
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
  if (!isCronAuthorized(request)) {
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
