import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { executeCronJob } from '@/lib/cron/scheduler';
import { isCronAuthorized } from '@/lib/server/cronAuth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { jobId } = await params;
    const { data: logs } = await supabaseAdmin
      .from('cron_logs')
      .select('*')
      .eq('job_name', jobId)
      .order('run_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ logs: logs || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { jobId } = await params;
    const result = await executeCronJob(jobId, supabaseAdmin);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
