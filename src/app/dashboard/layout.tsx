'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminTopbar } from '@/components/layout/AdminTopbar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, isAuthenticated, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isOnboarding = pathname === '/dashboard/onboarding';

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && !isOnboarding) {
        router.replace('/login');
      } else if (isAuthenticated && user && !user.gymId && !isOnboarding) {
        router.replace('/dashboard/onboarding');
      }
    }
  }, [loading, isAuthenticated, user, isOnboarding, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If on onboarding page, render children directly without sidebar/topbar
  if (isOnboarding) {
    return <>{children}</>;
  }

  // Fallback redirecting screen
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden lg:block">
        <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile Drawer Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 bg-zinc-900 border-zinc-800 w-[260px] text-white">
          <AdminSidebar collapsed={false} setCollapsed={() => {}} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AdminTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-6 lg:p-8 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
