import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AuthUser, AuthMember, DEFAULT_PERMISSIONS, UserRole } from '@/types/auth';

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
    }

    // If no user found by auth_id, or if userData exists but has no gym_id, check by email
    const isEmailVerified = Boolean(
      authUser.email_confirmed_at || 
      authUser.confirmed_at || 
      authUser.app_metadata?.provider === 'google'
    );

    if ((!userData || !userData.gym_id) && authUser.email && isEmailVerified) {
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('*')
        .ilike('email', authUser.email.trim())
        .maybeSingle();

      if (userByEmail) {
        // Prevent hijacking: only link if auth_id was unassigned
        if (!userByEmail.auth_id) {
          await supabaseAdmin
            .from('users')
            .update({ auth_id: authUser.id })
            .eq('id', userByEmail.id);
          userData = { ...userByEmail, auth_id: authUser.id };
        } else if (userByEmail.auth_id === authUser.id) {
          userData = userByEmail;
        }
      }
    }

    // 2. If userData already has a gym_id, verify that gym exists
    if (userData && userData.gym_id) {
      const { data: verifiedGym } = await supabaseAdmin
        .from('gyms')
        .select('id, name, owner_id')
        .eq('id', userData.gym_id)
        .maybeSingle();

      if (verifiedGym) {
        // Ensure owner_id is set to this user if it was null
        if (userData.role === 'owner' && !verifiedGym.owner_id) {
          await supabaseAdmin
            .from('gyms')
            .update({ owner_id: authUser.id })
            .eq('id', verifiedGym.id);
        }

        const userPayload: AuthUser = {
          id: userData.id,
          authId: userData.auth_id || authUser.id,
          gymId: userData.gym_id,
          branchId: userData.branch_id || null,
          name: userData.name,
          email: userData.email || authUser.email,
          role: userData.role,
          permissions: (Array.isArray(userData.permissions) && userData.permissions.length > 0)
            ? userData.permissions
            : (DEFAULT_PERMISSIONS[userData.role as UserRole] || []),
          photoUrl: userData.photo_url || null,
          isActive: userData.is_active ?? true,
        };

        if (userData.role === 'trainer') {
          userPayload.staffRecordId = userData.id;
        }

        return NextResponse.json({ user: userPayload, member: null, needsOnboarding: false });
      }
    }

    // 3. Auto-heal: Check if a gym workspace exists for this owner
    let ownerGym: any = null;

    // 3a. Search by gyms.owner_id
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
      // 3b. Search by gyms.email
      const { data: gymByEmail } = await supabaseAdmin
        .from('gyms')
        .select('id, name')
        .ilike('email', authUser.email.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (gymByEmail) {
        ownerGym = gymByEmail;
      }
    }

    // 3c. Search for unowned gym (e.g. seeded demo gym or pre-created workspace)
    if (!ownerGym) {
      const { data: unownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id, name')
        .is('owner_id', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (unownedGym) {
        ownerGym = unownedGym;
      }
    }

    if (ownerGym) {
      // Claim/adopt gym for this owner
      await supabaseAdmin
        .from('gyms')
        .update({ owner_id: authUser.id, is_setup_complete: true })
        .eq('id', ownerGym.id);

      // Resolve or create primary branch
      let branchId: string | null = null;
      const { data: primaryBranch } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('gym_id', ownerGym.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (primaryBranch) {
        branchId = primaryBranch.id;
      } else {
        const { data: newBranch } = await supabaseAdmin
          .from('branches')
          .insert({
            gym_id: ownerGym.id,
            name: `${ownerGym.name || 'Main'} Branch`,
            is_active: true,
          })
          .select('id')
          .single();
        branchId = newBranch?.id || null;
      }

      // Ensure counters
      const { data: existingCounter } = await supabaseAdmin
        .from('counters')
        .select('id')
        .eq('gym_id', ownerGym.id)
        .maybeSingle();

      if (!existingCounter) {
        await supabaseAdmin.from('counters').insert({
          gym_id: ownerGym.id,
          member_count: 0,
          invoice_count: 0,
        });
      }

      // Ensure subscriptions
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('gym_id', ownerGym.id)
        .maybeSingle();

      if (!existingSub) {
        await supabaseAdmin.from('subscriptions').insert({
          gym_id: ownerGym.id,
          tier: 'free',
          max_members: 50,
          is_active: true,
        });
      }

      const ownerName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Gym Owner';

      // Atomic upsert or update on users table
      let syncedUser: any = null;
      if (userData?.id) {
        const { data: updated } = await supabaseAdmin
          .from('users')
          .update({
            auth_id: authUser.id,
            gym_id: ownerGym.id,
            branch_id: branchId,
            role: 'owner',
            permissions: ['*'],
            is_active: true,
          })
          .eq('id', userData.id)
          .select()
          .maybeSingle();
        syncedUser = updated;
      } else {
        const { data: byEmail } = await supabaseAdmin
          .from('users')
          .select('id')
          .ilike('email', authUser.email || '')
          .maybeSingle();

        if (byEmail?.id) {
          const { data: updated } = await supabaseAdmin
            .from('users')
            .update({
              auth_id: authUser.id,
              gym_id: ownerGym.id,
              branch_id: branchId,
              role: 'owner',
              permissions: ['*'],
              is_active: true,
            })
            .eq('id', byEmail.id)
            .select()
            .maybeSingle();
          syncedUser = updated;
        } else {
          const { data: inserted } = await supabaseAdmin
            .from('users')
            .upsert({
              auth_id: authUser.id,
              gym_id: ownerGym.id,
              branch_id: branchId,
              name: ownerName,
              email: authUser.email,
              role: 'owner',
              permissions: ['*'],
              is_active: true,
            }, { onConflict: 'auth_id' })
            .select()
            .maybeSingle();
          syncedUser = inserted;
        }
      }

      return NextResponse.json({
        user: {
          id: syncedUser?.id || userData?.id || authUser.id,
          authId: authUser.id,
          gymId: ownerGym.id,
          branchId: branchId,
          name: syncedUser?.name || userData?.name || ownerName,
          email: authUser.email,
          role: 'owner',
          permissions: ['*'],
          photoUrl: syncedUser?.photo_url || authUser.user_metadata?.avatar_url || null,
          isActive: true,
        },
        member: null,
        needsOnboarding: false,
      });
    }

    // 4. Query members table for member portal (only match verified channels)
    const isPhoneVerified = Boolean(authUser.phone_confirmed_at);
    const cleanPhone = (isPhoneVerified && authUser.phone) ? authUser.phone.replace(/\D/g, '').slice(-10) : null;
    let memberQuery = supabaseAdmin.from('members').select('*');
    
    if (cleanPhone && authUser.email && isEmailVerified) {
      memberQuery = memberQuery.or(`auth_id.eq.${authUser.id},phone.eq.${cleanPhone},email.eq.${authUser.email}`);
    } else if (cleanPhone) {
      memberQuery = memberQuery.or(`auth_id.eq.${authUser.id},phone.eq.${cleanPhone}`);
    } else if (authUser.email && isEmailVerified) {
      memberQuery = memberQuery.or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`);
    } else {
      memberQuery = memberQuery.eq('auth_id', authUser.id);
    }

    const { data: memberData } = await memberQuery.limit(1).maybeSingle();

    if (memberData) {
      if (!memberData.auth_id && (isEmailVerified || isPhoneVerified)) {
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
      return NextResponse.json({ user: null, member: memberPayload, needsOnboarding: false });
    }

    // 5. Default: Absolutely NO gym exists in the database at all (fresh install pre-onboarding)
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
      return NextResponse.json({ user: fallbackUser, member: null, needsOnboarding: true });
    }

    return NextResponse.json({ user: null, member: null, needsOnboarding: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Auth session retrieval failure';
    console.error('API /api/auth/me error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
