'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Repeat,
  TrendingUp,
  Receipt,
  Megaphone,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
} from 'lucide-react';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const items = [
  { label: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
  { label: 'Gyms', href: '/superadmin/gyms', icon: Building2 },
  { label: 'Plans', href: '/superadmin/plans', icon: CreditCard },
  { label: 'Subscriptions', href: '/superadmin/subscriptions', icon: Repeat },
  { label: 'Revenue', href: '/superadmin/revenue', icon: TrendingUp },
  { label: 'Invoices', href: '/superadmin/invoices', icon: Receipt },
  { label: 'Announcements', href: '/superadmin/announcements', icon: Megaphone },
  { label: 'Settings', href: '/superadmin/settings', icon: Settings },
];

interface SuperAdminSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function SuperAdminSidebar({ collapsed, setCollapsed }: SuperAdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/superadmin/login');
  };

  return (
    <aside
      className={cn(
        'bg-zinc-900/80 backdrop-blur-md border-r border-zinc-800 flex flex-col transition-[width] duration-200 ease-out relative z-30 h-screen',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <GridPattern className="absolute inset-0 opacity-10 pointer-events-none -z-10" />
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="bg-amber-600 p-1.5 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
              GymERP Admin
            </span>
          </div>
        )}
        {collapsed && (
          <div className="bg-amber-600 p-1.5 rounded-lg flex items-center justify-center mx-auto">
            <Shield className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto scrollbar-none">
        {items.map((item) => {
          const IconComponent = item.icon;
          const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/superadmin');

          return (
            <Link key={item.href} href={item.href} passHref legacyBehavior>
              <a
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,color] duration-150 active:scale-[0.97] group relative',
                  isActive
                    ? 'bg-amber-950/40 text-amber-100 shadow-lg shadow-amber-900/10 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-amber-500 before:rounded-r-full before:shadow-[0_0_10px_2px_rgba(245,158,11,0.5)]'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                )}
              >
                <IconComponent
                  className={cn(
                    'h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105',
                    isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-16 bg-zinc-950 text-white text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap shadow-xl">
                    {item.label}
                  </div>
                )}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Trigger & Sign Out */}
      <div className="p-2 border-t border-zinc-800 flex flex-col gap-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 shrink-0" />
              <span>Collapse Menu</span>
            </>
          )}
        </button>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400/80 hover:bg-red-500/5 hover:text-red-400 transition-colors"
        >
          {collapsed ? (
            <LogOut className="h-5 w-5 mx-auto" />
          ) : (
            <>
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Sign Out</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
