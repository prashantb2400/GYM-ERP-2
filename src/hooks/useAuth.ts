'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { AuthUser, AuthMember } from '@/types/auth';

export function useAuth() {
  const supabase = createClient();
  const router = useRouter();
  const { user, member, loading, error, setSession, setLoading, setError, logout } = useAuthStore();

  useEffect(() => {
    const fetchSessionDetails = async (supabaseUser: any) => {
      if (!supabaseUser) {
        setSession({ user: null, member: null });
        return;
      }

      const currentStore = useAuthStore.getState();
      if (
        (currentStore.user && currentStore.user.authId === supabaseUser.id) ||
        (currentStore.member && currentStore.member.authId === supabaseUser.id)
      ) {
        // Session already loaded and active for this user
        return;
      }

      try {
        if (!currentStore.user && !currentStore.member) {
          setLoading(true);
        }
        // Query users table first to check if they are owner/staff
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', supabaseUser.id)
          .single();

        if (userData) {
          const authUser: AuthUser = {
            id: userData.id,
            authId: userData.auth_id,
            gymId: userData.gym_id,
            branchId: userData.branch_id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            permissions: userData.permissions || [],
            photoUrl: userData.photo_url,
            isActive: userData.is_active,
          };

          if (userData.role === 'trainer') {
            authUser.staffRecordId = userData.id;
          }

          setSession({ user: authUser, member: null });
          return;
        }

        // If not user, check members table (by auth_id, phone, or email)
        const cleanPhone = supabaseUser.phone ? supabaseUser.phone.replace(/\D/g, '').slice(-10) : null;
        const memberFilters = [`auth_id.eq.${supabaseUser.id}`];
        if (supabaseUser.email) memberFilters.push(`email.eq.${supabaseUser.email}`);
        if (cleanPhone) memberFilters.push(`phone.eq.${cleanPhone}`);

        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .or(memberFilters.join(','))
          .limit(1)
          .maybeSingle();

        if (memberData) {
          if (!memberData.auth_id) {
            supabase.from('members').update({ auth_id: supabaseUser.id }).eq('id', memberData.id).then();
          }
          const authMember: AuthMember = {
            id: memberData.id,
            authId: memberData.auth_id || supabaseUser.id,
            gymId: memberData.gym_id,
            branchId: memberData.branch_id,
            name: memberData.name,
            phone: memberData.phone,
            memberCode: memberData.member_code,
            photoUrl: memberData.photo_url,
          };
          setSession({ user: null, member: authMember });
          return;
        }

        // If not found in either, they might be a newly signed-up owner
        // Check if there are metadata properties or email indicating signup role
        const isNewOwner = supabaseUser.app_metadata?.provider === 'google' || supabaseUser.user_metadata?.iss || !!supabaseUser.email;
        if (isNewOwner) {
          // Creating dynamic session for owner setup
          const authUser: AuthUser = {
            id: supabaseUser.id, // placeholder until gym is set up
            authId: supabaseUser.id,
            gymId: '',
            branchId: null,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Gym Owner',
            email: supabaseUser.email || null,
            role: 'owner',
            permissions: ['settings.manage', 'settings.view'], // minimal setup permissions
            photoUrl: supabaseUser.user_metadata?.avatar_url || null,
            isActive: true,
          };
          setSession({ user: authUser, member: null });
          return;
        }

        setSession({ user: null, member: null });
      } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(msg || 'Error fetching user details');
      } finally {
        setLoading(false);
      }
    };

    // Get initial user session
    supabase.auth.getUser().then(({ data: { user: supabaseUser } }) => {
      fetchSessionDetails(supabaseUser);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          fetchSessionDetails(session.user);
        } else if (event === 'SIGNED_OUT') {
          logout();
          router.push('/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setLoading, setError, logout, router]);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    logout();
    router.push('/login');
  };

  return {
    user,
    member,
    loading,
    error,
    signOut,
    isAuthenticated: !!user || !!member,
    isOwner: user?.role === 'owner',
    isStaff: user?.role === 'receptionist' || user?.role === 'trainer',
    isMember: !!member,
  };
}
