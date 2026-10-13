import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword, signLocalToken } from '@/lib/server/local-auth';
import { STARTER_ROUTINES } from '@/lib/workout/exercise-types';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // 1. Guard check: only allow if database currently has 0 gyms
    const { count } = await supabaseAdmin
      .from('gyms')
      .select('id', { count: 'exact', head: true });

    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: 'GymERP is already initialized. Please log in.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { gym, owner, plans = [] } = body;

    if (!gym?.name || !owner?.email || !owner?.password) {
      return NextResponse.json(
        { error: 'Gym name, owner email, and password are required' },
        { status: 400 }
      );
    }

    const authId = crypto.randomUUID();
    const cleanEmail = owner.email.trim().toLowerCase();
    const cleanPassword = owner.password;
    const encryptedPassword = hashPassword(cleanPassword);

    // 2. Create Gym in public.gyms
    const { data: createdGym, error: gymErr } = await supabaseAdmin
      .from('gyms')
      .insert({
        name: gym.name.trim(),
        business_name: gym.businessName?.trim() || gym.name.trim(),
        phone: gym.phone?.trim() || '',
        email: cleanEmail,
        address: {
          city: gym.city || '',
          state: gym.state || '',
        },
        gstin: gym.gstin?.trim() || null,
        pan: gym.pan?.trim() || null,
        subscription_tier: 'enterprise',
        is_setup_complete: true,
        settings: {
          upi_vpa: gym.upiVpa?.trim() || '',
          whatsapp_enabled: true,
          biometric_enabled: true,
        },
      })
      .select()
      .single();

    if (gymErr || !createdGym) {
      console.error('Failed to create gym:', gymErr);
      return NextResponse.json({ error: gymErr?.message || 'Failed to create gym' }, { status: 500 });
    }

    const gymId = createdGym.id;

    // 3. Create Default Primary Branch in public.branches
    let branchId: string | null = null;
    const { data: createdBranch, error: branchErr } = await supabaseAdmin
      .from('branches')
      .insert({
        gym_id: gymId,
        name: `${gym.name.trim()} Main Branch`,
        phone: gym.phone?.trim() || '',
        address: {
          city: gym.city || '',
          state: gym.state || '',
        },
        is_active: true,
      })
      .select()
      .single();

    if (!branchErr && createdBranch) {
      branchId = createdBranch.id;
    } else if (branchErr) {
      console.warn('Branch creation warning in setup init:', branchErr);
    }

    // 4. Create Counter record
    await supabaseAdmin
      .from('counters')
      .insert({
        gym_id: gymId,
        member_count: 0,
        invoice_count: 0,
      });

    // 5. Create Subscription record
    await supabaseAdmin
      .from('subscriptions')
      .insert({
        gym_id: gymId,
        tier: 'enterprise',
        max_members: 9999,
        is_active: true,
      });

    // 6. Create auth.users compatibility row
    try {
      await supabaseAdmin
        .from('auth.users' as any)
        .insert({
          id: authId,
          email: cleanEmail,
          encrypted_password: encryptedPassword,
          raw_user_meta_data: { full_name: owner.name || 'Owner' },
        });
    } catch (authErr) {
      console.warn('Note: auth.users insertion bypassed:', authErr);
    }

    // 7. Create public.users row with branch linkage
    const { error: userErr } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authId,
        gym_id: gymId,
        branch_id: branchId,
        name: owner.name?.trim() || 'Gym Owner',
        email: cleanEmail,
        phone: owner.phone?.trim() || gym.phone?.trim() || '',
        role: 'owner',
        permissions: ['*'],
        is_active: true,
      });

    if (userErr) {
      console.error('Failed to create owner user:', userErr);
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }

    // Link owner_id on gym
    await supabaseAdmin
      .from('gyms')
      .update({ owner_id: authId })
      .eq('id', gymId);

    // 8. Create Membership Plans
    const plansToInsert = Array.isArray(plans) && plans.length > 0
      ? plans.map((p: any, idx: number) => ({
          gym_id: gymId,
          name: p.name || 'Standard Plan',
          duration_days: Number(p.durationDays) || 30,
          price: Number(p.price) || 1000,
          features: Array.isArray(p.features) ? p.features : ['Full Gym Access', 'Locker Room'],
          is_active: true,
          display_order: idx + 1,
        }))
      : [
          { gym_id: gymId, name: 'Monthly Membership', duration_days: 30, price: 1200, features: ['Full Gym Access'], is_active: true, display_order: 1 },
          { gym_id: gymId, name: 'Quarterly Membership', duration_days: 90, price: 3000, features: ['Full Gym Access', 'Fitness Assessment'], is_active: true, display_order: 2 },
          { gym_id: gymId, name: 'Annual Membership', duration_days: 365, price: 10000, features: ['Full Gym Access', 'Diet Plan', 'Locker Room'], is_active: true, display_order: 3 },
        ];

    await supabaseAdmin
      .from('plans')
      .insert(plansToInsert);

    // 9. Seed Starter Workout Routines (openGym catalogue)
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

      await supabaseAdmin
        .from('workout_routines')
        .insert(routinesToInsert);
    } catch (routineErr) {
      console.warn('Failed to seed starter workout routines in setup init:', routineErr);
    }

    // 10. Provision Default Active Kiosk Device
    let kioskToken = `kiosk-${crypto.randomBytes(12).toString('hex')}`;
    let pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const { data: kioskDevice } = await supabaseAdmin
        .from('kiosk_devices')
        .insert({
          gym_id: gymId,
          branch_id: branchId,
          device_name: 'Reception Tablet Kiosk',
          device_token: kioskToken,
          pairing_code: pairingCode,
          status: 'active',
          settings: { voice_enabled: true, language: 'en-IN', print_mode: 'thermal' },
        })
        .select()
        .single();

      if (kioskDevice?.device_token) {
        kioskToken = kioskDevice.device_token;
      }
    } catch (kioskErr) {
      console.warn('Failed to provision default kiosk device in setup init:', kioskErr);
    }

    // 11. Sign JWT Session token
    const token = await signLocalToken({
      id: authId,
      email: cleanEmail,
      gym_id: gymId,
      role: 'owner',
      name: owner.name?.trim() || 'Gym Owner',
    });

    return NextResponse.json({
      success: true,
      gymId,
      branchId,
      kioskToken,
      pairingCode,
      token,
      user: {
        id: authId,
        email: cleanEmail,
        name: owner.name?.trim() || 'Gym Owner',
        role: 'owner',
        gymId,
        branchId,
      },
    });
  } catch (err: any) {
    console.error('Setup initialization error:', err);
    return NextResponse.json({ error: err.message || 'Setup initialization failed' }, { status: 500 });
  }
}
