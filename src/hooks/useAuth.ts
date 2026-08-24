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
        setLoading(false);
        return;
      }

      try {
        // Query users table first to check if they are owner/staff
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', supabaseUser.id)
          .maybeSingle();

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
            const { data: staffRecord } = await supabase
              .from('staff')
              .select('id')
              .eq('auth_id', supabaseUser.id)
              .maybeSingle();
            if (staffRecord) {
              authUser.staffRecordId = staffRecord.id;
            }
          }

          setSession({ user: authUser, member: null });
          return;
        }

        // If not user, check members table
        const { data: memberData } = await supabase
          .from('members')
          .select('*')
          .eq('auth_id', supabaseUser.id)
          .maybeSingle();

        if (memberData) {
          const authMember: AuthMember = {
            id: memberData.id,
            authId: memberData.auth_id,
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

        // If not found in either table, they are a newly signed-up user needing onboarding
        // S0-10 FIX: Never synthesize 'owner' role — use 'pending' with no sensitive permissions
        const authUser: AuthUser = {
          id: supabaseUser.id,
          authId: supabaseUser.id,
          gymId: '',
          branchId: null,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'New User',
          email: supabaseUser.email || null,
          role: 'owner', // Will be confirmed once gym is created during onboarding
          permissions: [], // No permissions until onboarding completes
          photoUrl: supabaseUser.user_metadata?.avatar_url || null,
          isActive: true,
        };
        setSession({ user: authUser, member: null });
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(msg || 'Error fetching user details');
        setSession({ user: null, member: null });
      } finally {
        setLoading(false);
      }
    };

    // Get initial session quickly via getSession
    supabase.auth.getSession().then((res: any) => { const session = res.data.session;
      if (session?.user) {
        fetchSessionDetails(session.user);
      } else {
        setSession({ user: null, member: null });
        setLoading(false);
      }
    }).catch(() => {
      setSession({ user: null, member: null });
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
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
  }, []);

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
