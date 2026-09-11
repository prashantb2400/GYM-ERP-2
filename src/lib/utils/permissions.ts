import { Permission, UserRole, DEFAULT_PERMISSIONS } from '@/types/auth';

export function hasPermission(
  role?: UserRole | null,
  permissions?: Permission[] | null,
  required?: Permission
): boolean {
  if (!required) return true;
  if (role === 'owner') return true; // Owner has wildcard bypass
  
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
