import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';
import { validateBody } from '@/lib/server/validate';
import { createStaffSchema } from '@/lib/schemas/staff';

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }
    
    // Verify caller is an owner (check both users table and gyms table)
    const { data: callerData } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role')
      .eq('auth_id', user.id)
      .maybeSingle();

    let gymId = callerData?.gym_id;
    let isOwner = callerData?.role === 'owner';
    const createdBy = callerData?.id || null;

    if (!isOwner || !gymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ownedGym) {
        gymId = ownedGym.id;
        isOwner = true;
      }
    }
    
    if (!isOwner || !gymId) {
      return NextResponse.json({ error: 'Only gym owners can create staff accounts' }, { status: 403 });
    }
    
    const validation = await validateBody(request, createStaffSchema);
    if (!validation.success) {
      return validation.response;
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
    } = validation.data;

    // Check if Login ID is already taken
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('login_id', loginId.trim())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: `Login ID "${loginId.trim()}" is already taken. Please choose another.` }, { status: 409 });
    }

    // Resolve branch assignment
    let resolvedBranchId: string | null = null;
    if (branchId) {
      const { data: branch } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('id', branchId)
        .eq('gym_id', gymId)
        .maybeSingle();

      resolvedBranchId = branch?.id || null;
    }

    if (!resolvedBranchId) {
      // Fallback to gym's primary branch
      const { data: primaryBranch } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('gym_id', gymId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      resolvedBranchId = primaryBranch?.id || null;
    }

    // Resolve staff email (fallback to internal deterministic email if duplicate or blank)
    let staffEmail = email?.trim() || `staff_${loginId.trim().toLowerCase()}_${gymId.slice(0, 8)}@gymerp.internal`;
    let authData: any = null;

    const authRes = await supabaseAdmin.auth.admin.createUser({
      email: staffEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: { full_name: name.trim() },
    });

    if (authRes.error) {
      if (authRes.error.message?.toLowerCase().includes('already') || authRes.error.message?.toLowerCase().includes('registered')) {
        // Fallback to timestamped unique internal email
        staffEmail = `staff_${loginId.trim().toLowerCase()}_${Date.now()}@gymerp.internal`;
        const retryAuth = await supabaseAdmin.auth.admin.createUser({
          email: staffEmail,
          password: password.trim(),
          email_confirm: true,
          user_metadata: { full_name: name.trim() },
        });
        if (retryAuth.error) throw retryAuth.error;
        authData = retryAuth.data;
      } else {
        throw new Error(authRes.error.message || 'Failed to create auth user');
      }
    } else {
      authData = authRes.data;
    }

    if (!authData?.user) {
      throw new Error('Failed to generate staff authentication credentials');
    }

    // Insert user record into public.users
    const { data: newDbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authData.user.id,
        gym_id: gymId,
        branch_id: resolvedBranchId,
        name: name.trim(),
        email: staffEmail,
        phone: phone?.trim() || null,
        login_id: loginId.trim(),
        role,
        permissions: permissions || [],
        created_by: createdBy || null,
        is_active: true,
      })
      .select('*')
      .single();

    if (dbError) {
      // Clean up orphaned auth user on database failure
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => null);
      console.error('Failed to insert staff user into DB:', dbError);
      return NextResponse.json(
        { error: dbError.message || 'Database error creating staff user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user: newDbUser });
  } catch (err: unknown) {
    const msg =
      (err as any)?.message || (err instanceof Error ? err.message : 'Internal server error creating staff account');
    console.error('Error creating staff account:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
