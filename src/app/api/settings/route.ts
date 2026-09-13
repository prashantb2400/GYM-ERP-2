import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

/**
 * GET /api/settings
 * Retrieves gym workspace settings and active plans.
 * Powered by supabaseAdmin to guarantee zero client-side RLS recursion.
 */
export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // 1. Resolve caller's gym_id
    const { data: callerUser } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role, permissions')
      .eq('auth_id', user.id)
      .maybeSingle();

    let resolvedGymId = callerUser?.gym_id;

    if (!resolvedGymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ownedGym) {
        resolvedGymId = ownedGym.id;
      }
    }

    if (!resolvedGymId) {
      return NextResponse.json({ error: 'No gym workspace associated with this user' }, { status: 404 });
    }

    // 2. Fetch gym settings and active plans concurrently
    const [{ data: gym, error: gymError }, { data: plans, error: plansError }] = await Promise.all([
      supabaseAdmin
        .from('gyms')
        .select('*')
        .eq('id', resolvedGymId)
        .maybeSingle(),
      supabaseAdmin
        .from('plans')
        .select('id, name')
        .eq('gym_id', resolvedGymId)
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ]);

    if (gymError) {
      console.error('Failed to fetch gym in /api/settings:', gymError);
      return NextResponse.json({ error: gymError.message || 'Database error fetching gym' }, { status: 500 });
    }

    if (!gym) {
      return NextResponse.json({ error: 'Gym workspace record not found' }, { status: 404 });
    }

    const isOwner = callerUser?.role === 'owner' || (!callerUser && Boolean(resolvedGymId));
    const hasManagePerm = isOwner || callerUser?.permissions?.includes('settings.manage');

    // Redact sensitive secrets and credentials for non-owners
    const sanitizedGym = { ...gym };
    if (!isOwner && !hasManagePerm) {
      delete sanitizedGym.whatsapp_access_token;
      delete sanitizedGym.whatsapp_phone_number_id;
      delete sanitizedGym.razorpay_key_secret;
      delete sanitizedGym.cctv_ip;
      delete sanitizedGym.cctv_username;
      delete sanitizedGym.cctv_password;
      delete sanitizedGym.cctv_stream_url;
      delete sanitizedGym.pan;
      delete sanitizedGym.bank_details;

      if (sanitizedGym.settings && typeof sanitizedGym.settings === 'object') {
        const safeSettings = { ...sanitizedGym.settings };
        delete safeSettings.razorpay_secret;
        delete safeSettings.whatsapp_token;
        delete safeSettings.api_keys;
        sanitizedGym.settings = safeSettings;
      }
    }

    return NextResponse.json({
      success: true,
      gym: sanitizedGym,
      plans: plans || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('GET /api/settings failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/settings
 * Updates gym profile, branding, tax, and integration configurations.
 */
export async function PATCH(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // 1. Resolve caller and permissions
    const { data: callerUser } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role, permissions')
      .eq('auth_id', user.id)
      .maybeSingle();

    let resolvedGymId = callerUser?.gym_id;

    if (!resolvedGymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ownedGym) {
        resolvedGymId = ownedGym.id;
      }
    }

    if (!resolvedGymId) {
      return NextResponse.json({ error: 'No gym workspace associated with this user' }, { status: 404 });
    }

    const isOwner = callerUser?.role === 'owner' || (!callerUser && Boolean(resolvedGymId));
    const hasManagePerm = isOwner || callerUser?.permissions?.includes('settings.manage');

    if (!hasManagePerm) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage settings' }, { status: 403 });
    }

    // 2. Parse and sanitize payload
    const body = await request.json();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name === 'string' && body.name.trim()) {
      updatePayload.name = body.name.trim();
    }
    if (body.business_name !== undefined) {
      updatePayload.business_name = body.business_name ? String(body.business_name).trim() : null;
    }
    if (body.phone !== undefined) {
      updatePayload.phone = body.phone ? String(body.phone).trim() : null;
    }
    if (body.email !== undefined) {
      updatePayload.email = body.email ? String(body.email).trim() : null;
    }
    if (body.gstin !== undefined) {
      updatePayload.gstin = body.gstin ? String(body.gstin).trim() : null;
    }
    if (body.pan !== undefined) {
      updatePayload.pan = body.pan ? String(body.pan).trim() : null;
    }
    if (body.tagline !== undefined) {
      updatePayload.tagline = body.tagline ? String(body.tagline).trim() : null;
    }
    if (body.address && typeof body.address === 'object') {
      updatePayload.address = body.address;
    }
    if (body.working_hours && typeof body.working_hours === 'object') {
      updatePayload.working_hours = body.working_hours;
    }
    if (body.settings && typeof body.settings === 'object') {
      updatePayload.settings = body.settings;
    }

    // 3. Update gym record
    const { data: updatedGym, error: updateError } = await supabaseAdmin
      .from('gyms')
      .update(updatePayload)
      .eq('id', resolvedGymId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update gym in /api/settings:', updateError);
      return NextResponse.json({ error: updateError.message || 'Failed to update gym settings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      gym: updatedGym,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('PATCH /api/settings failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
