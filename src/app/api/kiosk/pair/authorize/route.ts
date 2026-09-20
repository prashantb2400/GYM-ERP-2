import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // 1. Verify caller is authenticated staff/owner
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    // 2. Resolve caller's gym_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id, role')
      .eq('auth_id', user.id)
      .maybeSingle();

    let gymId = userData?.gym_id;
    if (!gymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      gymId = ownedGym?.id;
    }

    if (!gymId) {
      return NextResponse.json({ error: 'No gym workspace found for your account' }, { status: 403 });
    }

    const { pairingCode, branchId, deviceName } = await request.json();

    if (!pairingCode) {
      return NextResponse.json({ error: 'Pairing code is required' }, { status: 400 });
    }

    const cleanCode = String(pairingCode).trim().toUpperCase();

    // 3. Find pending device
    const { data: device, error: devErr } = await supabaseAdmin
      .from('kiosk_devices')
      .select('id, pairing_expires_at, status')
      .eq('pairing_code', cleanCode)
      .eq('status', 'pending')
      .maybeSingle();

    if (devErr || !device) {
      return NextResponse.json(
        { error: 'Invalid or expired pairing code. Please refresh code on tablet.' },
        { status: 404 }
      );
    }

    if (device.pairing_expires_at && new Date(device.pairing_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This pairing code has expired. Please refresh the code on tablet.' },
        { status: 410 }
      );
    }

    // 4. Issue permanent device token
    const permanentToken = `ktok_${crypto.randomUUID()}`;

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('kiosk_devices')
      .update({
        gym_id: gymId,
        branch_id: branchId || null,
        device_name: deviceName || 'Reception Tablet Kiosk',
        device_token: permanentToken,
        status: 'active',
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', device.id)
      .select('id, device_name, status')
      .single();

    if (updErr) throw updErr;

    // Fetch gym name for confirmation
    const { data: gym } = await supabaseAdmin
      .from('gyms')
      .select('name')
      .eq('id', gymId)
      .single();

    return NextResponse.json({
      success: true,
      message: `Tablet successfully paired to ${gym?.name || 'Gym'}`,
      device: updated,
    });
  } catch (err: any) {
    console.error('Kiosk pair authorize error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to authorize tablet' },
      { status: 500 }
    );
  }
}
