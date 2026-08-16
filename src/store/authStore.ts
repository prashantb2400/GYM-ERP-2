import { create } from 'zustand';
import { AuthUser, AuthMember, Permission, UserRole } from '@/types/auth';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/utils/permissions';

interface AuthState {
  user: AuthUser | null;
  member: AuthMember | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setSession: (session: { user: AuthUser | null; member: AuthMember | null }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  
  // Helper accessors
  hasPermission: (required: Permission) => boolean;
  hasAnyPermission: (required: Permission[]) => boolean;
  hasAllPermissions: (required: Permission[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  member: null,
  loading: true,
  error: null,

  setSession: (session) => set({ user: session.user, member: session.member, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  logout: () => set({ user: null, member: null, loading: false, error: null }),

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
}));
