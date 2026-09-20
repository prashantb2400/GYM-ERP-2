import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    // Resolve gym
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id')
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
      return NextResponse.json({ error: 'No gym workspace found' }, { status: 403 });
    }

    const { data: devices, error: devErr } = await supabaseAdmin
      .from('kiosk_devices')
      .select('id, device_name, status, last_heartbeat_at, created_at, branches(id, name)')
      .eq('gym_id', gymId)
      .neq('status', 'pending')
      .order('created_at', { ascending: false });

    if (devErr) throw devErr;

    return NextResponse.json({
      success: true,
      devices: devices || [],
    });
  } catch (err: any) {
    console.error('List kiosk devices error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list devices' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const { deviceId } = await request.json();
    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    // Resolve gym
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id')
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
      return NextResponse.json({ error: 'No gym workspace found' }, { status: 403 });
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('kiosk_devices')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', deviceId)
      .eq('gym_id', gymId)
      .select('id, status')
      .maybeSingle();

    if (updErr || !updated) {
      return NextResponse.json({ error: 'Device not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Tablet device revoked successfully',
      device: updated,
    });
  } catch (err: any) {
    console.error('Revoke kiosk device error:', err);
    return NextResponse.json({ error: err.message || 'Failed to revoke device' }, { status: 500 });
  }
}
