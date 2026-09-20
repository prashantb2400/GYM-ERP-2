import { Permission, UserRole, DEFAULT_PERMISSIONS } from '@/types/auth';

export function hasPermission(
  role?: UserRole | null,
  permissions?: Permission[] | null,
  required?: Permission
): boolean {
  if (!required) return true;
  if (role === 'owner' || (role as string) === 'super_admin' || (role as string) === 'admin') return true;
  
  // Backward compatibility: If checking cctv.view, grant access if user has attendance or settings access
  if (required === 'cctv.view') {
    if (hasPermission(role, permissions, 'attendance.view') || hasPermission(role, permissions, 'settings.view')) {
      return true;
    }
  }

  // If the user has explicit database-assigned permissions
  if (Array.isArray(permissions) && permissions.includes(required)) return true;
  
  // Check fallback default role permissions
  const defaults = (role && DEFAULT_PERMISSIONS[role]) || [];
  return defaults.includes(required);
}

export function hasAnyPermission(
  role?: UserRole | null,
  permissions?: Permission[] | null,
  required: Permission[] = []
): boolean {
  if (!required || required.length === 0) return true;
  return required.some(p => hasPermission(role, permissions, p));
}

export function hasAllPermissions(
  role?: UserRole | null,
  permissions?: Permission[] | null,
  required: Permission[] = []
): boolean {
  if (!required || required.length === 0) return true;
  return required.every(p => hasPermission(role, permissions, p));
}
