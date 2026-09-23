import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

export interface KioskAuthSuccess {
  authorized: true;
  authType: 'session' | 'device';
  gymId: string;
  branchId: string | null;
  deviceId?: string;
  error?: undefined;
}

export interface KioskAuthFailure {
  authorized: false;
  response: NextResponse;
  error: string;
}

export type KioskAuthResult = KioskAuthSuccess | KioskAuthFailure;

/**
 * Validates that an incoming kiosk request originates from:
 * 1. An authenticated user (staff, owner, or superadmin) with access to the gym, OR
 * 2. An authorized, active hardware kiosk device identified by `x-device-token`.
 *
 * If neither is present or valid, returns an unauthorized 401 response.
 */
export async function verifyKioskOrAuth(
  request: Request,
  targetGymId?: string | null
): Promise<KioskAuthResult> {
  // 1. Check for authenticated user session
  try {
    const { user } = await getAuthUser(request);
    if (user) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, gym_id, branch_id, role')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (userData?.gym_id) {
        if (!targetGymId || userData.gym_id === targetGymId) {
          return {
            authorized: true,
            authType: 'session',
            gymId: userData.gym_id,
            branchId: userData.branch_id || null,
          };
        }
      }

      // Check if user is gym owner
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownedGym?.id) {
        if (!targetGymId || ownedGym.id === targetGymId) {
          return {
            authorized: true,
            authType: 'session',
            gymId: ownedGym.id,
            branchId: null,
          };
        }
      }

      // Check if user is active superadmin
      const { data: superAdmin } = await supabaseAdmin
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (superAdmin && targetGymId) {
        return {
          authorized: true,
          authType: 'session',
          gymId: targetGymId,
          branchId: null,
        };
      }
    }
  } catch (authErr) {
    console.warn('Kiosk session check exception:', authErr);
  }

  // 2. Check for hardware device token header
  const deviceToken = request.headers.get('x-device-token');
  if (deviceToken) {
    let query = supabaseAdmin
      .from('kiosk_devices')
      .select('id, gym_id, branch_id, status')
      .eq('device_token', deviceToken)
      .eq('status', 'active');

    if (targetGymId) {
      query = query.eq('gym_id', targetGymId);
    }

    const { data: device, error } = await query.maybeSingle();

    if (!error && device?.id && device?.gym_id) {
      return {
        authorized: true,
        authType: 'device',
        deviceId: device.id,
        gymId: device.gym_id,
        branchId: device.branch_id || null,
      };
    }

    return {
      authorized: false,
      error: 'Unauthorized or deactivated kiosk device',
      response: NextResponse.json(
        { error: 'Unauthorized or deactivated kiosk terminal' },
        { status: 401 }
      ),
    };
  }

  // Neither session nor device token provided
  return {
    authorized: false,
    error: 'Authentication required. Provide valid user session or x-device-token header.',
    response: NextResponse.json(
      { error: 'Unauthorized kiosk request. Valid device token or session required.' },
      { status: 401 }
    ),
  };
}
