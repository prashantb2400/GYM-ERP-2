import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`public-gyms-list:${ip}`, 30, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 60) } }
      );
    }

    const { data: gyms, error } = await supabaseAdmin
      .from('gyms')
      .select('id, name, city')
      .order('name', { ascending: true });

    if (error) {
      console.error('Fetch public gyms error:', error);
      return NextResponse.json({ error: 'Failed to fetch gyms list' }, { status: 500 });
    }

    return NextResponse.json({ gyms: gyms || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    console.error('API /api/gyms/public error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
