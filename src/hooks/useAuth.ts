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
        // Call server-side /api/auth/me to bypass client RLS quirks and recursion
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user || data.member) {
            setSession({ user: data.user, member: data.member });
            return;
          }
        }

        // Fallback: If not found in either, they might be a newly signed-up owner
        const isNewOwner = supabaseUser.app_metadata?.provider === 'google' || supabaseUser.user_metadata?.iss || !!supabaseUser.email;
        if (isNewOwner) {
          const authUser: AuthUser = {
            id: supabaseUser.id,
            authId: supabaseUser.id,
            gymId: '',
            branchId: null,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Gym Owner',
            email: supabaseUser.email || null,
            role: 'owner',
            permissions: ['settings.manage', 'settings.view'],
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
