import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedGymId = searchParams.get('gymId');
    const requestedBranchId = searchParams.get('branchId');

    let gymId = requestedGymId;

    // 1. Try resolving from authenticated session if available
    if (!gymId) {
      const { user } = await getAuthUser(request);
      if (user) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('gym_id')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (userData?.gym_id) {
          gymId = userData.gym_id;
        } else {
          const { data: ownedGym } = await supabaseAdmin
            .from('gyms')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle();
          if (ownedGym) gymId = ownedGym.id;
        }
      }
    }

    // 2. Try resolving from paired device token header if available
    if (!gymId) {
      const deviceToken = request.headers.get('x-device-token');
      if (deviceToken) {
        const { data: dev } = await supabaseAdmin
          .from('kiosk_devices')
          .select('gym_id')
          .eq('device_token', deviceToken)
          .eq('status', 'active')
          .maybeSingle();

        if (dev?.gym_id) {
          gymId = dev.gym_id;
        }
      }
    }

    if (!gymId) {
      return NextResponse.json({ error: 'gymId parameter or paired device token required' }, { status: 400 });
    }

    // Fetch gym data
    const { data: gym, error: gymErr } = await supabaseAdmin
      .from('gyms')
      .select('id, name, business_name, phone, email, logo_url, tagline, working_hours, address, settings')
      .eq('id', gymId)
      .single();

    if (gymErr || !gym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    // Fetch branch info if requested
    let branchName: string | null = null;
    if (requestedBranchId) {
      const { data: branch } = await supabaseAdmin
        .from('branches')
        .select('name')
        .eq('id', requestedBranchId)
        .eq('gym_id', gymId)
        .maybeSingle();
      if (branch) branchName = branch.name;
    }

    // Fetch popular/active plans for renewal display
    const { data: plans } = await supabaseAdmin
      .from('plans')
      .select('id, name, duration_days, price, features, is_popular')
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(4);

    return NextResponse.json({
      gymId: gym.id,
      gymName: gym.name,
      businessName: gym.business_name || gym.name,
      tagline: gym.tagline || 'Crush Your Goals Every Day',
      logoUrl: gym.logo_url || null,
      phone: gym.phone || null,
      address: gym.address || null,
      branchName: branchName,
      branchId: requestedBranchId || null,
      workingHours: gym.working_hours || { open: '06:00', close: '22:00' },
      plans: plans || [],
      features: {
        keypad: true,
        qr: true,
        face: Boolean(gym.settings?.biometric_enabled ?? true),
        walkInLead: true,
        upiPayments: true,
      },
      announcement: 'Hydrate, stay consistent, and tag us in your workout stories today!',
    });
  } catch (err: any) {
    console.error('Kiosk config error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load kiosk config' }, { status: 500 });
  }
}
