import { Permission, UserRole, DEFAULT_PERMISSIONS } from '@/types/auth';

export function hasPermission(
  role: UserRole,
  permissions: Permission[],
  required: Permission
): boolean {
  if (role === 'owner') return true; // Owner has wildcard bypass
  
  // If the user has explicit database-assigned permissions
  if (permissions.includes(required)) return true;
  
  // Check fallback default role permissions
  const defaults = DEFAULT_PERMISSIONS[role] || [];
  return defaults.includes(required);
}

export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[],
  required: Permission[]
): boolean {
  return required.some(p => hasPermission(role, permissions, p));
}

export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[],
  required: Permission[]
): boolean {
  return required.every(p => hasPermission(role, permissions, p));
}
