import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // ── S0-1 FIX: Verify caller session and enforce owner-only access ──
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user: callerAuth }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !callerAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is an owner in the public.users table
    const { data: callerUser, error: callerErr } = await supabaseAdmin
      .from('users')
      .select('gym_id, role')
      .eq('auth_id', callerAuth.id)
      .maybeSingle();

    if (callerErr || !callerUser || callerUser.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: only gym owners can create staff accounts' }, { status: 403 });
    }

    const {
      name,
      email,
      phone,
      loginId,
      password,
      role,
      permissions,
      commissionRatePct,
    } = await request.json();

    // Always use the caller's own gymId — never trust gymId from client
    const gymId = callerUser.gym_id;

    if (!gymId || !name || !email || !loginId || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Only allow creating staff roles, never owner via this route
    const allowedRoles = ['trainer', 'receptionist'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role: can only create trainer or receptionist accounts' }, { status: 400 });
    }

    // Whitelist allowed permissions — strip wildcard '*' from staff
    const safePermissions = Array.isArray(permissions)
      ? permissions.filter((p: string) => p !== '*')
      : [];

    // 1. Create the user in Supabase Auth using the admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create auth user');
    }

    // 2. Insert the corresponding record in the public users table
    const { error: dbError } = await supabaseAdmin.from('users').insert({
      auth_id: authData.user.id,
      gym_id: gymId,
      name,
      email,
      phone: phone || null,
      login_id: loginId,
      role,
      permissions: safePermissions,
      commission_rate_pct: Number(commissionRatePct) || 0,
      created_by: callerUser ? callerAuth.id : null,
      is_active: true,
    });

    if (dbError) {
      // If db insert fails, clean up the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw dbError;
    }

    return NextResponse.json({ success: true, userId: authData.user.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Error creating staff account:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
