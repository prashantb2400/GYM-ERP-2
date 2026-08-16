import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { gymId, token } = await request.json();

    if (!gymId || !token) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Verify token
    const expectedToken = process.env.CCTV_AUTH_TOKEN || 'cctv_secret_token';
    if (token !== expectedToken) {
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
