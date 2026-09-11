'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminTopbar } from '@/components/layout/AdminTopbar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { BranchProvider } from '@/hooks/useBranch';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isOnboarding = pathname === '/dashboard/onboarding';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  React.useEffect(() => {
    if (!loading && isAuthenticated && user && user.role === 'owner' && !user.gymId && !isOnboarding) {
      router.push('/dashboard/onboarding');
    }
  }, [loading, isAuthenticated, user, router, isOnboarding]);

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (isOnboarding) {
    return <>{children}</>;
  }

  if (loading && !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Fallback protection: show clean redirect screen instead of returning blank null
  if (!isAuthenticated && !loading) {
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
    <BranchProvider>
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
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </BranchProvider>
  );
}
