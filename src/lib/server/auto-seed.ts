import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword, signLocalToken } from '@/lib/server/local-auth';
import { STARTER_ROUTINES } from '@/lib/workout/exercise-types';

export interface AutoSeedResult {
  seeded: boolean;
  message?: string;
  gymId?: string;
  branchId?: string;
  ownerId?: string;
  email?: string;
  token?: string;
  kioskToken?: string;
  pairingCode?: string;
  routinesCount?: number;
}

export function isAutoSeedEnabled(): boolean {
  const envVal = process.env.AUTO_SEED_DEMO_GYM?.toLowerCase().trim();
  return envVal === 'true' || envVal === '1' || envVal === 'yes';
}

export const DEMO_GYM_DEFAULTS = {
  gymName: 'Iron Forge Fitness Club',
  businessName: 'Iron Forge Fitness Club Private Limited',
  phone: '+91 98765 43210',
  email: 'admin@gymerp.local',
  password: 'admin123',
  city: 'Mumbai',
  state: 'Maharashtra',
  upiVpa: 'ironforge@okhdfcbank',
  branchName: 'Iron Forge Downtown',
  kioskDeviceName: 'Front Desk Reception Kiosk',
  kioskDeviceToken: 'kiosk-demo-terminal-local',
  kioskPairingCode: '123456',
};

export async function checkAndAutoSeedDemoGym(options?: { force?: boolean }): Promise<AutoSeedResult> {
  const force = options?.force ?? false;

  // 1. Check if database already has gyms
  const { count, error: countErr } = await supabaseAdmin
    .from('gyms')
    .select('id', { count: 'exact', head: true });

  const existingCount = count || 0;
  if (!force && existingCount > 0) {
    return {
      seeded: false,
      message: 'GymERP is already initialized with existing gym records',
    };
  }

  // 2. Verify auto-seed enabled flag (unless forced)
  if (!force && !isAutoSeedEnabled()) {
    return {
      seeded: false,
      message: 'AUTO_SEED_DEMO_GYM environment flag is not enabled',
    };
  }

  const cleanEmail = DEMO_GYM_DEFAULTS.email.toLowerCase().trim();
  const encryptedPassword = hashPassword(DEMO_GYM_DEFAULTS.password);
  const authId = crypto.randomUUID();

  // 3. Create Demo Gym in public.gyms
  const { data: createdGym, error: gymErr } = await supabaseAdmin
    .from('gyms')
    .insert({
      name: DEMO_GYM_DEFAULTS.gymName,
      business_name: DEMO_GYM_DEFAULTS.businessName,
      phone: DEMO_GYM_DEFAULTS.phone,
      email: cleanEmail,
      address: {
        city: DEMO_GYM_DEFAULTS.city,
        state: DEMO_GYM_DEFAULTS.state,
      },
      subscription_tier: 'enterprise',
      is_setup_complete: true,
      settings: {
        upi_vpa: DEMO_GYM_DEFAULTS.upiVpa,
        whatsapp_enabled: true,
        biometric_enabled: true,
      },
    })
    .select()
    .single();

  if (gymErr || !createdGym) {
    console.error('Failed to create demo gym:', gymErr);
    return {
      seeded: false,
      message: gymErr?.message || 'Failed to create demo gym record',
    };
  }

  const gymId = createdGym.id;

  // 4. Create Primary Branch in public.branches
  let branchId: string | null = null;
  const { data: createdBranch, error: branchErr } = await supabaseAdmin
    .from('branches')
    .insert({
      gym_id: gymId,
      name: DEMO_GYM_DEFAULTS.branchName,
      phone: DEMO_GYM_DEFAULTS.phone,
      address: {
        city: DEMO_GYM_DEFAULTS.city,
        state: DEMO_GYM_DEFAULTS.state,
      },
      is_active: true,
    })
    .select()
    .single();

  if (!branchErr && createdBranch) {
    branchId = createdBranch.id;
  } else if (branchErr) {
    console.warn('Branch creation warning in auto-seed:', branchErr);
  }

  // 5. Create Counter record
  await supabaseAdmin
    .from('counters')
    .insert({
      gym_id: gymId,
      member_count: 0,
      invoice_count: 0,
    });

  // 6. Create Subscription record
  await supabaseAdmin
    .from('subscriptions')
    .insert({
      gym_id: gymId,
      tier: 'enterprise',
      max_members: 9999,
      is_active: true,
    });

  // 7. Insert auth.users row (compatibility layer)
  try {
    await supabaseAdmin
      .from('auth.users' as any)
      .insert({
        id: authId,
        email: cleanEmail,
        encrypted_password: encryptedPassword,
        raw_user_meta_data: { full_name: 'Iron Forge Admin' },
      });
  } catch (authErr) {
    console.warn('Note: auth.users insertion bypassed in auto-seed:', authErr);
  }

  // 8. Create public.users row
  const { error: userErr } = await supabaseAdmin
    .from('users')
    .insert({
      auth_id: authId,
      gym_id: gymId,
      branch_id: branchId,
      name: 'Iron Forge Admin',
      email: cleanEmail,
      phone: DEMO_GYM_DEFAULTS.phone,
      role: 'owner',
      permissions: ['*'],
      is_active: true,
    });

  if (userErr) {
    console.error('Failed to create demo owner user:', userErr);
  }

  // Link owner_id to gym
  await supabaseAdmin
    .from('gyms')
    .update({ owner_id: authId })
    .eq('id', gymId);

  // 9. Create Default Membership Plans
  const defaultPlans = [
    { gym_id: gymId, name: 'Monthly Membership', duration_days: 30, price: 1200, features: ['Full Gym Access', 'Locker Room'], is_active: true, display_order: 1 },
    { gym_id: gymId, name: 'Quarterly Membership', duration_days: 90, price: 3000, features: ['Full Gym Access', 'Fitness Assessment', 'Locker Room'], is_active: true, display_order: 2 },
    { gym_id: gymId, name: 'Annual VIP Membership', duration_days: 365, price: 10000, features: ['Full Gym Access', 'Diet Plan', 'Locker Room', 'Steam Bath Access'], is_active: true, display_order: 3 },
  ];

  await supabaseAdmin
    .from('plans')
    .insert(defaultPlans);

  // 10. Seed Starter Workout Routines (openGym catalogue)
  let routinesCount = 0;
  try {
    const routinesToInsert = STARTER_ROUTINES.map((routine) => ({
      gym_id: gymId,
      branch_id: branchId,
      created_by: authId,
      name: routine.name,
      split_type: routine.splitType,
      days_per_week: routine.daysPerWeek,
      description: routine.description,
      schedule: routine.days,
    }));

    const { error: routineErr } = await supabaseAdmin
      .from('workout_routines')
      .insert(routinesToInsert);

    if (!routineErr) {
      routinesCount = routinesToInsert.length;
    }
  } catch (routineErr) {
    console.warn('Failed to seed starter workout routines in auto-seed:', routineErr);
  }

  // 11. Provision Default Active Kiosk Device
  try {
    await supabaseAdmin
      .from('kiosk_devices')
      .insert({
        gym_id: gymId,
        branch_id: branchId,
        device_name: DEMO_GYM_DEFAULTS.kioskDeviceName,
        device_token: DEMO_GYM_DEFAULTS.kioskDeviceToken,
        pairing_code: DEMO_GYM_DEFAULTS.kioskPairingCode,
        status: 'active',
        settings: { voice_enabled: true, language: 'en-IN', print_mode: 'thermal' },
      });
  } catch (kioskErr) {
    console.warn('Failed to insert default kiosk device in auto-seed:', kioskErr);
  }

  // 12. Sign local JWT session token
  const token = await signLocalToken({
    id: authId,
    email: cleanEmail,
    gym_id: gymId,
    role: 'owner',
    name: 'Iron Forge Admin',
  });

  return {
    seeded: true,
    gymId,
    branchId: branchId || undefined,
    ownerId: authId,
    email: cleanEmail,
    token,
    kioskToken: DEMO_GYM_DEFAULTS.kioskDeviceToken,
    pairingCode: DEMO_GYM_DEFAULTS.kioskPairingCode,
    routinesCount,
  };
}
