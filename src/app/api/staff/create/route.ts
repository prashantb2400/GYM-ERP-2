import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }
    
    // Verify caller is an owner
    const { data: callerData } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role')
      .eq('auth_id', user.id)
      .single();
    
    if (!callerData || callerData.role !== 'owner') {
      return NextResponse.json({ error: 'Only gym owners can create staff' }, { status: 403 });
    }
    
    const {
      name,
      email,
      phone,
      loginId,
      password,
      role,
      permissions,
      branchId,
    } = await request.json();
    
    const gymId = callerData.gym_id; // Server-side resolved
    const createdBy = callerData.id; // Track who created (users.id FK)

    if (!name || !email || !loginId || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['receptionist', 'trainer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid staff role. Allowed: receptionist, trainer' }, { status: 400 });
    }

    // Resolve branch assignment
    let resolvedBranchId: string | null = null;
    if (branchId) {
      const { data: branch } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('id', branchId)
        .eq('gym_id', gymId)
        .single();

      if (!branch) {
        return NextResponse.json({ error: 'Invalid branch selected for this gym' }, { status: 400 });
      }
      resolvedBranchId = branch.id;
    } else {
      // Fallback to gym's primary branch
      const { data: primaryBranch } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('gym_id', gymId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      resolvedBranchId = primaryBranch?.id || null;
    }

    // 1. Create the user in Supabase Auth using the admin client
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createAuthError || !authData.user) {
      throw new Error(createAuthError?.message || 'Failed to create auth user');
    }

    // 2. Insert the corresponding record in the public users table
    const { error: dbError } = await supabaseAdmin.from('users').insert({
      auth_id: authData.user.id,
      gym_id: gymId,
      branch_id: resolvedBranchId,
      name,
      email,
      phone: phone || null,
      login_id: loginId,
      role,
      permissions,
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
