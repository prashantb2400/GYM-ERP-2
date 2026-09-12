'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { AuthUser, AuthMember, DEFAULT_PERMISSIONS } from '@/types/auth';

export function useAuth() {
  const supabase = createClient();
  const router = useRouter();
  const {
    user,
    member,
    loading,
    error,
    isInitialized,
    needsOnboarding,
    setSession,
    setLoading,
    setError,
    logout,
  } = useAuthStore();

  const isFetchingRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchSessionDetails = async (supabaseUser: any, forceRefresh = false) => {
      if (!supabaseUser) {
        if (!isCancelled) {
          setSession({ user: null, member: null, needsOnboarding: false });
        }
        return;
      }

      if (isFetchingRef.current && !forceRefresh) {
        return;
      }
      isFetchingRef.current = true;

      const currentStore = useAuthStore.getState();
      const hasValidStoreSession = Boolean(
        (currentStore.user && currentStore.user.authId === supabaseUser.id && currentStore.user.gymId) ||
        (currentStore.member && currentStore.member.authId === supabaseUser.id)
      );

      // If we already have a valid session with gymId for this user, do not block the UI
      if (hasValidStoreSession && !forceRefresh) {
        if (currentStore.loading) {
          setLoading(false);
        }
      } else if (!hasValidStoreSession) {
        setLoading(true);
      }

      try {
        // 1. Check current Supabase session
        let { data: sessionData } = await supabase.auth.getSession();
        let accessToken = sessionData?.session?.access_token;
        const expiresAt = sessionData?.session?.expires_at ? sessionData.session.expires_at * 1000 : 0;
        const isExpiringSoon = expiresAt > 0 && expiresAt - Date.now() < 60000;

        // Proactive token refresh if token is missing or expiring soon
        if (!accessToken || isExpiringSoon) {
          try {
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData?.session?.access_token) {
              accessToken = refreshData.session.access_token;
            }
          } catch (refreshErr) {
            console.warn('Session proactive refresh warning:', refreshErr);
          }
        }

        const headers: Record<string, string> = {};
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // 2. Fetch /api/auth/me
        let res = await fetch('/api/auth/me', { headers });

        // If unauthorized or returned no user, try reactive refresh once
        if (!res.ok || res.status === 401) {
          try {
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData?.session?.access_token) {
              headers['Authorization'] = `Bearer ${refreshData.session.access_token}`;
              res = await fetch('/api/auth/me', { headers });
            }
          } catch (refreshErr) {
            console.warn('Session reactive refresh error:', refreshErr);
          }
        }

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
                if (cachedGymId && cachedGymId !== 'null' && cachedGymId !== 'undefined') {
                  resolvedUser = { ...resolvedUser, gymId: cachedGymId };
                }
              }
            }

            if (!isCancelled) {
              setSession({
                user: resolvedUser,
                member: data.member,
                needsOnboarding: data.needsOnboarding ?? Boolean(resolvedUser?.role === 'owner' && !resolvedUser?.gymId),
              });
            }
            return;
          }
        }

        // 3. Fallback: If store already has a valid user with gymId, NEVER wipe it
        const storeNow = useAuthStore.getState();
        if (storeNow.user && storeNow.user.gymId) {
          if (!isCancelled) {
            setLoading(false);
          }
          return;
        }

        // Check if cached gym ID exists in localStorage
        const cachedGymId = typeof window !== 'undefined' ? localStorage.getItem('gymerp_cached_gym_id') : null;
        const validCachedGymId = cachedGymId && cachedGymId !== 'null' && cachedGymId !== 'undefined' ? cachedGymId : '';

        if (validCachedGymId && supabaseUser) {
          const authUser: AuthUser = {
            id: supabaseUser.id,
            authId: supabaseUser.id,
            gymId: validCachedGymId,
            branchId: null,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Gym Owner',
            email: supabaseUser.email || null,
            role: 'owner',
            permissions: DEFAULT_PERMISSIONS.owner,
            photoUrl: supabaseUser.user_metadata?.avatar_url || null,
            isActive: true,
          };
          if (!isCancelled) {
            setSession({ user: authUser, member: null, needsOnboarding: false });
          }
          return;
        }

        // Truly a new owner ONLY if server responded OK and confirmed no gym exists
        const isNewOwner = Boolean(
          supabaseUser &&
          (supabaseUser.app_metadata?.provider === 'google' || supabaseUser.user_metadata?.iss || !!supabaseUser.email)
        );

        if (isNewOwner && res.ok) {
          const authUser: AuthUser = {
            id: supabaseUser.id,
            authId: supabaseUser.id,
            gymId: '',
            branchId: null,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Gym Owner',
            email: supabaseUser.email || null,
            role: 'owner',
            permissions: DEFAULT_PERMISSIONS.owner,
            photoUrl: supabaseUser.user_metadata?.avatar_url || null,
            isActive: true,
          };
          if (!isCancelled) {
            setSession({ user: authUser, member: null, needsOnboarding: true });
          }
          return;
        }

        if (!isCancelled) {
          setSession({ user: null, member: null, needsOnboarding: false });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An unknown error occurred';
        // Network error must not wipe existing active session
        const current = useAuthStore.getState();
        if (current.user && current.user.gymId) {
          if (!isCancelled) setLoading(false);
          return;
        }
        if (!isCancelled) {
          setError(msg || 'Error fetching user details');
        }
      } finally {
        isFetchingRef.current = false;
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchSessionDetails(session.user);
      } else {
        supabase.auth.getUser().then(({ data: { user: supabaseUser } }) => {
          fetchSessionDetails(supabaseUser);
        }).catch(() => {
          const cur = useAuthStore.getState();
          if (!cur.user && !cur.member) {
            setSession({ user: null, member: null, needsOnboarding: false });
          }
        });
      }
    }).catch(() => {
      supabase.auth.getUser().then(({ data: { user: supabaseUser } }) => {
        fetchSessionDetails(supabaseUser);
      }).catch(() => {
        const cur = useAuthStore.getState();
        if (!cur.user && !cur.member) {
          setSession({ user: null, member: null, needsOnboarding: false });
        }
      });
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
          session?.user
        ) {
          fetchSessionDetails(session.user, event === 'TOKEN_REFRESHED');
        } else if (event === 'SIGNED_OUT') {
          logout();
          router.push('/login');
        }
      }
    );

    // Watchdog timer
    const watchdogTimer = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        setLoading(false);
      }
    }, 3500);

    return () => {
      isCancelled = true;
      clearTimeout(watchdogTimer);
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
    isInitialized,
    needsOnboarding,
    signOut,
    isAuthenticated: !!user || !!member,
    isOwner: user?.role === 'owner',
    isStaff: user?.role === 'receptionist' || user?.role === 'trainer',
    isMember: !!member,
  };
}
