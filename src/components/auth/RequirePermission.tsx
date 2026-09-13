'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { Permission, UserRole } from '@/types/auth';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RequirePermissionProps {
  children: React.ReactNode;
  permission?: Permission;
  anyPermission?: Permission[];
  role?: UserRole | UserRole[];
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export function RequirePermission({
  children,
  permission,
  anyPermission,
  role,
  fallbackTitle = 'Access Denied',
  fallbackDescription = "You don't have the required administrative permissions to access this page.",
}: RequirePermissionProps) {
  const { user, loading } = useAuth();
  const { can, canAny } = usePermission();

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Owner always has wildcard bypass
  if (user?.role === 'owner') {
    return <>{children}</>;
  }

  // Check role requirement
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!user || !allowedRoles.includes(user.role)) {
      return <AccessDenied fallbackTitle={fallbackTitle} fallbackDescription={fallbackDescription} />;
    }
  }

  // Check single permission
  if (permission && !can(permission)) {
    return <AccessDenied fallbackTitle={fallbackTitle} fallbackDescription={fallbackDescription} />;
  }

  // Check any permission
  if (anyPermission && !canAny(anyPermission)) {
    return <AccessDenied fallbackTitle={fallbackTitle} fallbackDescription={fallbackDescription} />;
  }

  return <>{children}</>;
}

function AccessDenied({
  fallbackTitle,
  fallbackDescription,
}: {
  fallbackTitle: string;
  fallbackDescription: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/40 flex items-center justify-center mb-5 text-red-400 shadow-lg shadow-red-950/20">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-white tracking-tight mb-2">{fallbackTitle}</h2>
      <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
        {fallbackDescription}
      </p>
      <Link href="/dashboard">
        <Button variant="outline" className="gap-2 border-zinc-800 hover:bg-zinc-800 text-zinc-200">
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
