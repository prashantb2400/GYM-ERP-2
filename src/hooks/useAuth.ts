'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { AuthUser, AuthMember, DEFAULT_PERMISSIONS } from '@/types/auth';

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
        (currentStore.user && currentStore.user.authId === supabaseUser.id && currentStore.user.gymId) ||
        (currentStore.member && currentStore.member.authId === supabaseUser.id)
      ) {
        // Session already loaded with valid gymId and active for this user
        return;
      }

      try {
        if (!currentStore.user && !currentStore.member) {
          setLoading(true);
        }
        // Call server-side /api/auth/me with Authorization Bearer header for resilient auth
        const { data: sessionData } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (sessionData?.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
        }

        const res = await fetch('/api/auth/me', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.user || data.member) {
            let resolvedUser = data.user;
            if (resolvedUser) {
              if (resolvedUser.gymId) {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('gymerp_cached_gym_id', resolvedUser.gymId);
                }
              } else if (typeof window !== 'undefined') {
                const cachedGymId = localStorage.getItem('gymerp_cached_gym_id');
                if (cachedGymId) {
                  resolvedUser = { ...resolvedUser, gymId: cachedGymId };
                }
              }
            }
            setSession({ user: resolvedUser, member: data.member });
            return;
          }
        }

        // Fallback: If not found in either, check cached gymId before defaulting to blank
        const cachedGymId = typeof window !== 'undefined' ? localStorage.getItem('gymerp_cached_gym_id') : null;
        const isNewOwner = supabaseUser.app_metadata?.provider === 'google' || supabaseUser.user_metadata?.iss || !!supabaseUser.email;
        if (isNewOwner) {
          const authUser: AuthUser = {
            id: supabaseUser.id,
            authId: supabaseUser.id,
            gymId: cachedGymId || '',
            branchId: null,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Gym Owner',
            email: supabaseUser.email || null,
            role: 'owner',
            permissions: DEFAULT_PERMISSIONS.owner,
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

    // Get initial user session (check local session cache first for instant response)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchSessionDetails(session.user);
      } else {
        supabase.auth.getUser().then(({ data: { user: supabaseUser } }) => {
          fetchSessionDetails(supabaseUser);
        }).catch(() => {
          setSession({ user: null, member: null });
        });
      }
    }).catch(() => {
      supabase.auth.getUser().then(({ data: { user: supabaseUser } }) => {
        fetchSessionDetails(supabaseUser);
      }).catch(() => {
        setSession({ user: null, member: null });
      });
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
          session?.user
        ) {
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
