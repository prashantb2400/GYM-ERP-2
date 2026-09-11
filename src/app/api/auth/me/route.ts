import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AuthUser, AuthMember } from '@/types/auth';

export async function GET(request: Request) {
  try {
    let authUser: any = null;

    // Check Bearer token from header first (immune to cookie issues)
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        try {
          const { data: { user: tokenUser } } = await supabaseAdmin.auth.getUser(token);
          if (tokenUser) {
            authUser = tokenUser;
          }
        } catch (tokenErr) {
          console.warn('Bearer token verification failed:', tokenErr);
        }
      }
    }

    // Fallback to cookie session
    if (!authUser) {
      try {
        const supabase = await createClient();
        const { data: { user: cookieUser } } = await supabase.auth.getUser();
        authUser = cookieUser;
      } catch (cookieErr) {
        console.warn('Cookie session retrieval failed:', cookieErr);
      }
    }

    if (!authUser) {
      return NextResponse.json({ user: null, member: null });
    }

    // 1. Query users table with supabaseAdmin (bypasses RLS, immune to recursion)
    let userData: any = null;
    const { data: userByAuth } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (userByAuth) {
      userData = userByAuth;
    } else if (authUser.email) {
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();

      if (userByEmail) {
        userData = userByEmail;
        await supabaseAdmin
          .from('users')
          .update({ auth_id: authUser.id })
          .eq('id', userByEmail.id);
      }
    }

    if (userData && userData.gym_id) {
      const userPayload: AuthUser = {
        id: userData.id,
        authId: userData.auth_id || authUser.id,
        gymId: userData.gym_id,
        branchId: userData.branch_id || null,
        name: userData.name,
        email: userData.email || authUser.email,
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
    let ownerGym: any = null;
    const { data: gymByOwner } = await supabaseAdmin
      .from('gyms')
      .select('id, name')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gymByOwner) {
      ownerGym = gymByOwner;
    } else if (authUser.email) {
      const { data: gymByEmail } = await supabaseAdmin
        .from('gyms')
        .select('id, name')
        .eq('email', authUser.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (gymByEmail) {
        ownerGym = gymByEmail;
        await supabaseAdmin
          .from('gyms')
          .update({ owner_id: authUser.id })
          .eq('id', gymByEmail.id);
      }
    }

    if (ownerGym) {
      const { data: primaryBranch } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('gym_id', ownerGym.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const ownerName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Gym Owner';

      // Atomic upsert on users table
      const { data: syncedUser } = await supabaseAdmin
        .from('users')
        .upsert({
          auth_id: authUser.id,
          gym_id: ownerGym.id,
          branch_id: primaryBranch?.id || null,
          name: userData?.name || ownerName,
          email: authUser.email,
          role: 'owner',
          permissions: ['*'],
          is_active: true,
        }, { onConflict: 'auth_id' })
        .select()
        .maybeSingle();

      return NextResponse.json({
        user: {
          id: syncedUser?.id || userData?.id || authUser.id,
          authId: authUser.id,
          gymId: ownerGym.id,
          branchId: primaryBranch?.id || null,
          name: syncedUser?.name || userData?.name || ownerName,
          email: authUser.email,
          role: 'owner',
          permissions: ['*'],
          photoUrl: syncedUser?.photo_url || null,
          isActive: true,
        },
        member: null,
      });
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
