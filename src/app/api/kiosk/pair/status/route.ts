import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim().toUpperCase();
    const token = searchParams.get('token')?.trim();

    if (!code && !token) {
      return NextResponse.json({ error: 'Missing code or token' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('kiosk_devices')
      .select('id, gym_id, branch_id, device_name, device_token, status, pairing_expires_at, settings, gyms(id, name, business_name, logo_url), branches(id, name)');

    if (token) {
      query = query.eq('device_token', token);
    } else if (code) {
      query = query.eq('pairing_code', code);
    }

    const { data: device, error: devErr } = await query.maybeSingle();

    if (devErr || !device) {
      return NextResponse.json({ status: 'unpaired', error: 'Device record not found' }, { status: 404 });
    }

    if (device.status === 'revoked') {
      return NextResponse.json({ status: 'revoked', message: 'Device has been un-paired by gym administrator' });
    }

    if (device.status === 'pending') {
      // Check if code has expired
      if (device.pairing_expires_at && new Date(device.pairing_expires_at) < new Date()) {
        return NextResponse.json({ status: 'expired', message: 'Pairing code expired' });
      }
      return NextResponse.json({ status: 'pending' });
    }

    // Device is active! Update heartbeat
    await supabaseAdmin
      .from('kiosk_devices')
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq('id', device.id);

    const gymInfo = device.gyms as any;
    const branchInfo = device.branches as any;

    return NextResponse.json({
      status: 'active',
      deviceToken: device.device_token,
      deviceName: device.device_name,
      gymId: device.gym_id,
      gymName: gymInfo?.business_name || gymInfo?.name || 'Gym Center',
      gymLogo: gymInfo?.logo_url || null,
      branchId: device.branch_id,
      branchName: branchInfo?.name || null,
      settings: device.settings,
    });
  } catch (err: any) {
    console.error('Kiosk pair status error:', err);
    return NextResponse.json({ error: err.message || 'Status check failed' }, { status: 500 });
  }
}
