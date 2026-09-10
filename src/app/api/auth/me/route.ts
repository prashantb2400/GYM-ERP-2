import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AuthUser, AuthMember } from '@/types/auth';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ user: null, member: null });
    }

    // 1. Query users table with supabaseAdmin (bypasses RLS, immune to recursion)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (userData && userData.gym_id) {
      const userPayload: AuthUser = {
        id: userData.id,
        authId: userData.auth_id,
        gymId: userData.gym_id,
        branchId: userData.branch_id || null,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        permissions: userData.permissions || [],
        photoUrl: userData.photo_url || null,
        isActive: userData.is_active ?? true,
      };

      if (userData.role === 'trainer') {
        userPayload.staffRecordId = userData.id;
      }

      return NextResponse.json({ user: userPayload, member: null });
    }

    // 2. Auto-heal: Check if a gym workspace was created for this owner
    const { data: ownerGym } = await supabaseAdmin
      .from('gyms')
      .select('id, name')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ownerGym) {
      const { data: primaryBranch } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('gym_id', ownerGym.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const ownerName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Gym Owner';

      if (userData) {
        // Update existing user with gym_id
        await supabaseAdmin
          .from('users')
          .update({
            gym_id: ownerGym.id,
            branch_id: primaryBranch?.id || null,
            role: 'owner',
            permissions: ['*'],
            is_active: true,
          })
          .eq('id', userData.id);

        return NextResponse.json({
          user: {
            id: userData.id,
            authId: userData.auth_id,
            gymId: ownerGym.id,
            branchId: primaryBranch?.id || null,
            name: userData.name || ownerName,
            email: userData.email || authUser.email,
            role: 'owner',
            permissions: ['*'],
            photoUrl: userData.photo_url || null,
            isActive: true,
          },
          member: null,
        });
      } else {
        // Insert new user row
        const { data: newUser } = await supabaseAdmin
          .from('users')
          .insert({
            auth_id: authUser.id,
            gym_id: ownerGym.id,
            branch_id: primaryBranch?.id || null,
            name: ownerName,
            email: authUser.email,
            role: 'owner',
            permissions: ['*'],
            is_active: true,
          })
          .select()
          .single();

        if (newUser) {
          return NextResponse.json({
            user: {
              id: newUser.id,
              authId: newUser.auth_id,
              gymId: newUser.gym_id,
              branchId: newUser.branch_id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
              permissions: newUser.permissions || [],
              photoUrl: newUser.photo_url,
              isActive: newUser.is_active,
            },
            member: null,
          });
        }
      }
    }

    // 3. Query members table for member portal
    const cleanPhone = authUser.phone ? authUser.phone.replace(/\D/g, '').slice(-10) : null;
    let memberQuery = supabaseAdmin.from('members').select('*');
    if (cleanPhone && authUser.email) {
      memberQuery = memberQuery.or(`auth_id.eq.${authUser.id},phone.eq.${cleanPhone},email.eq.${authUser.email}`);
    } else if (cleanPhone) {
      memberQuery = memberQuery.or(`auth_id.eq.${authUser.id},phone.eq.${cleanPhone}`);
    } else if (authUser.email) {
      memberQuery = memberQuery.or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`);
    } else {
      memberQuery = memberQuery.eq('auth_id', authUser.id);
    }

    const { data: memberData } = await memberQuery.limit(1).maybeSingle();

    if (memberData) {
      if (!memberData.auth_id) {
        await supabaseAdmin.from('members').update({ auth_id: authUser.id }).eq('id', memberData.id);
      }
      const memberPayload: AuthMember = {
        id: memberData.id,
        authId: memberData.auth_id || authUser.id,
        gymId: memberData.gym_id,
        branchId: memberData.branch_id,
        name: memberData.name,
        phone: memberData.phone,
        memberCode: memberData.member_code,
        photoUrl: memberData.photo_url,
      };
      return NextResponse.json({ user: null, member: memberPayload });
    }

    // 4. Default: User exists but has no gym setup yet (new owner pre-onboarding)
    const isNewOwner = authUser.app_metadata?.provider === 'google' || authUser.user_metadata?.iss || !!authUser.email;
    if (isNewOwner) {
      const fallbackUser: AuthUser = {
        id: authUser.id,
        authId: authUser.id,
        gymId: '',
        branchId: null,
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Gym Owner',
        email: authUser.email || null,
        role: 'owner',
        permissions: ['settings.manage', 'settings.view'],
        photoUrl: authUser.user_metadata?.avatar_url || null,
        isActive: true,
      };
      return NextResponse.json({ user: fallbackUser, member: null });
    }

    return NextResponse.json({ user: null, member: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Auth session retrieval failure';
    console.error('API /api/auth/me error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
