'use client';

import { useAuthStore } from '@/store/authStore';
import { Permission } from '@/types/auth';

export function usePermission() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, user } = useAuthStore();

  return {
    can: hasPermission,
    canAny: hasAnyPermission,
    canAll: hasAllPermissions,
    role: user?.role || null,
    permissions: user?.permissions || [],
  };
}
