import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    // Check if user already has an assigned gym
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (existingUser?.gym_id) {
      return NextResponse.json({
        success: true,
        gymId: existingUser.gym_id,
        message: 'Gym workspace already exists',
      });
    }

    const {
      gymName,
      phone,
      email,
      tagline,
      city,
      state,
    } = await request.json();

    if (!gymName || !gymName.trim()) {
      return NextResponse.json({ error: 'Gym Name is required' }, { status: 400 });
    }

    const contactEmail = email?.trim() || user.email || null;
    const contactPhone = phone?.trim() || null;
    const addressObj = {
      city: city?.trim() || '',
      state: state?.trim() || '',
    };

    // 1. Create Gym workspace
    const { data: gymData, error: gymError } = await supabaseAdmin
      .from('gyms')
      .insert({
        name: gymName.trim(),
        phone: contactPhone,
        email: contactEmail,
        tagline: tagline?.trim() || null,
        address: addressObj,
        owner_id: user.id,
        subscription_tier: 'free',
        is_setup_complete: true,
      })
      .select()
      .single();

    if (gymError || !gymData) {
      console.error('Error creating gym workspace:', gymError);
      return NextResponse.json({ error: gymError?.message || 'Failed to create gym workspace' }, { status: 500 });
    }

    const gymId = gymData.id;

    // 2. Create Default Main Branch
    const { data: branchData, error: branchError } = await supabaseAdmin
      .from('branches')
      .insert({
        gym_id: gymId,
        name: `${gymName.trim()} Main Branch`,
        phone: contactPhone,
        address: addressObj,
        is_active: true,
      })
      .select()
      .single();

    if (branchError) {
      console.error('Failed to create default branch:', branchError);
    }

    const branchId = branchData?.id || null;

    // 3. Create Counters row
    const { error: counterError } = await supabaseAdmin
      .from('counters')
      .insert({
        gym_id: gymId,
        member_count: 0,
        invoice_count: 0,
      });

    if (counterError) {
      console.error('Failed to initialize counters:', counterError);
    }

    // 4. Create Subscriptions row
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        gym_id: gymId,
        tier: 'free',
        max_members: 50,
        is_active: true,
      });

    if (subError) {
      console.error('Failed to create initial subscription:', subError);
    }

    // 5. Setup Platform Subscription (14-day Pro trial)
    try {
      const { data: proPlan } = await supabaseAdmin
        .from('platform_plans')
        .select('id')
        .eq('slug', 'pro')
        .maybeSingle();

      const { data: freePlan } = await supabaseAdmin
        .from('platform_plans')
        .select('id')
        .eq('slug', 'free')
        .maybeSingle();

      const planId = proPlan?.id || freePlan?.id;
      if (planId) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);

        await supabaseAdmin
          .from('platform_subscriptions')
          .insert({
            gym_id: gymId,
            plan_id: planId,
            status: proPlan ? 'trialing' : 'active',
            billing_cycle: 'monthly',
            current_period_start: new Date().toISOString(),
            current_period_end: trialEnd.toISOString(),
            trial_end: proPlan ? trialEnd.toISOString() : null,
          });
      }
    } catch (platformSubErr) {
      console.error('Failed to assign platform subscription trial:', platformSubErr);
    }

    // 6. Create or Update Owner User Profile in public.users
    const ownerName = user.user_metadata?.full_name || contactEmail?.split('@')[0] || 'Gym Owner';

    if (existingUser) {
      const { error: updateErr } = await supabaseAdmin
        .from('users')
        .update({
          gym_id: gymId,
          branch_id: branchId,
          name: ownerName,
          email: contactEmail,
          role: 'owner',
          permissions: ['*'],
          is_active: true,
        })
        .eq('id', existingUser.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from('users')
        .insert({
          auth_id: user.id,
          gym_id: gymId,
          branch_id: branchId,
          name: ownerName,
          email: contactEmail,
          role: 'owner',
          permissions: ['*'],
          is_active: true,
        });

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({
      success: true,
      gymId: gymId,
      branchId: branchId,
      message: 'Gym workspace initialized successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred during onboarding';
    console.error('Onboarding API failure:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
