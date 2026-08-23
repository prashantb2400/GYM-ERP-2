import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { gymId, token } = await request.json();

    if (!gymId || !token) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // M-8 FIX: Require configured CCTV_AUTH_TOKEN in environment and verify with timing-safe comparison
    const expectedToken = process.env.CCTV_AUTH_TOKEN;
    if (!expectedToken) {
      console.error('CCTV ping failed: CCTV_AUTH_TOKEN environment variable not configured');
      return NextResponse.json({ error: 'CCTV ping service not configured' }, { status: 500 });
    }

    const providedBuf = Buffer.from(String(token));
    const expectedBuf = Buffer.from(expectedToken);
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return NextResponse.json({ error: 'Unauthorized handshake' }, { status: 401 });
    }

    // Update settings in gyms table
    const { data: gym, error: fetchError } = await supabaseAdmin
      .from('gyms')
      .select('settings')
      .eq('id', gymId)
      .single();

    if (fetchError || !gym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    const currentSettings = gym.settings || {};
    const updatedSettings = {
      ...currentSettings,
      last_cctv_ping: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from('gyms')
      .update({ settings: updatedSettings })
      .eq('id', gymId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, timestamp: updatedSettings.last_cctv_ping });
  } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('CCTV Heartbeat Exception:', err);
    return NextResponse.json({ error: msg || 'Internal error' }, { status: 500 });
  }
}
