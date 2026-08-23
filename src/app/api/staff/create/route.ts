import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const {
      gymId,
      name,
      email,
      phone,
      loginId,
      password,
      role,
      permissions,
      commissionRatePct,
      createdBy,
    } = await request.json();

    if (!gymId || !name || !email || !loginId || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
      permissions,
      commission_rate_pct: Number(commissionRatePct) || 0,
      created_by: createdBy || null,
      is_active: true,
    });

    if (dbError) {
      // If db insert fails, clean up the auth user we just created to prevent orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw dbError;
    }

    return NextResponse.json({ success: true, userId: authData.user.id });
  } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Error creating staff account:', err);
    return NextResponse.json({ error: msg || 'Internal server error' }, { status: 500 });
  }
}
