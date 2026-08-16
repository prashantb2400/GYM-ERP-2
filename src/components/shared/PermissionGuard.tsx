'use client';

import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { Permission } from '@/types/auth';

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { can } = usePermission();

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  roles: ('owner' | 'receptionist' | 'trainer')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({
  roles,
  children,
  fallback = null,
}: RoleGuardProps) {
  const { role } = usePermission();

  if (!role || !roles.includes(role as any)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
