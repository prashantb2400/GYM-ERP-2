import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthUser, AuthMember, Permission, UserRole } from '@/types/auth';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/utils/permissions';

interface AuthState {
  user: AuthUser | null;
  member: AuthMember | null;
  loading: boolean;
  isInitialized: boolean;
  error: string | null;
  needsOnboarding: boolean;
  
  // Actions
  setSession: (session: { user: AuthUser | null; member: AuthMember | null; needsOnboarding?: boolean }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  
  // Helper accessors
  hasPermission: (required: Permission) => boolean;
  hasAnyPermission: (required: Permission[]) => boolean;
  hasAllPermissions: (required: Permission[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      member: null,
      loading: true,
      isInitialized: false,
      error: null,
      needsOnboarding: false,

      setSession: (session) => {
        if (typeof window !== 'undefined' && session.user?.gymId) {
          localStorage.setItem('gymerp_cached_gym_id', session.user.gymId);
        }
        set({
          user: session.user,
          member: session.member,
          needsOnboarding: session.needsOnboarding ?? Boolean(session.user?.role === 'owner' && !session.user?.gymId),
          loading: false,
          isInitialized: true,
        });
      },
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false, isInitialized: true }),
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('gymerp_cached_gym_id');
          localStorage.removeItem('gymerp_auth_session');
        }
        set({ user: null, member: null, loading: false, isInitialized: true, needsOnboarding: false, error: null });
      },

      hasPermission: (required) => {
        const { user } = get();
        if (!user) return false;
        return hasPermission(user.role, user.permissions, required);
      },

      hasAnyPermission: (required) => {
        const { user } = get();
        if (!user) return false;
        return hasAnyPermission(user.role, user.permissions, required);
      },

      hasAllPermissions: (required) => {
        const { user } = get();
        if (!user) return false;
        return hasAllPermissions(user.role, user.permissions, required);
      },
    }),
    {
      name: 'gymerp_auth_session',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({
        user: state.user,
        member: state.member,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.user || state.member) {
            state.loading = false;
          }
          state.isInitialized = true;
        }
      },
    }
  )
);
