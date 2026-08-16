'use client';

import React, { useState, useEffect } from 'react';
import { SuperAdminSidebar } from '@/components/layout/SuperAdminSidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Loader2, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export function ClientLayout({ children, adminEmail }: { children: React.ReactNode, adminEmail: string | null }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/superadmin/login';

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if (!isLoginPage) {
          router.push('/superadmin/login');
        } else {
          setLoading(false);
        }
        return;
      }

      // Check if user is super admin
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

      if (!superAdmin) {
        if (!isLoginPage) {
          router.push('/superadmin/login');
        } else {
          setLoading(false);
        }
        return;
      }

      // If user is already a super admin and on login page, redirect to dashboard
      if (isLoginPage) {
        router.push('/superadmin');
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router, isLoginPage]);

  // If on login page, render children directly without admin layout wrapper
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Verifying super admin session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden lg:block">
        <SuperAdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile Drawer Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 bg-zinc-900 border-zinc-800 w-[260px] text-white">
          <SuperAdminSidebar collapsed={false} setCollapsed={() => {}} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-white hidden sm:block">Platform Administration</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{adminEmail || 'Super Admin'}</p>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
              Super Admin
            </Badge>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-6 lg:p-8 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
