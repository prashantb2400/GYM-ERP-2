'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { SIDEBAR_ITEMS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Target,
  CreditCard,
  UserCog,
  Receipt,
  CalendarCheck,
  BarChart3,
  PhoneCall,
  IndianRupee,
  MessageCircle,
  Apple,
  Dumbbell,
  FileCheck,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wallet,
  Package,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { GridPattern } from '@/components/magicui/grid-pattern';

// Map icon string to component dynamically
const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Users,
  Target,
  CreditCard,
  UserCog,
  Receipt,
  CalendarCheck,
  BarChart3,
  PhoneCall,
  IndianRupee,
  MessageCircle,
  Apple,
  Dumbbell,
  FileCheck,
  Clock,
  Settings,
  Wallet,
  Package,
  Building2,
};

interface AdminSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function AdminSidebar({ collapsed, setCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const { can } = usePermission();
  const { signOut } = useAuth();

  return (
    <aside
      className={cn(
        'bg-zinc-900/80 backdrop-blur-md border-r border-zinc-800 flex flex-col transition-all duration-300 relative z-30 h-screen',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <GridPattern className="absolute inset-0 opacity-10 pointer-events-none -z-10" />
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 p-1.5 rounded-lg flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-white rotate-45" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
              GymERP
            </span>
          </div>
        )}
        {collapsed && (
          <div className="bg-purple-600 p-1.5 rounded-lg flex items-center justify-center mx-auto">
            <Dumbbell className="h-5 w-5 text-white rotate-45" />
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto scrollbar-none">
        {SIDEBAR_ITEMS.map((item) => {
          // If the item requires permission, check if user has it
          if (item.permission && !can(item.permission)) {
            return null;
          }

          const IconComponent = iconMap[item.icon];
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative',
                isActive
                  ? 'bg-purple-950/40 text-purple-100 shadow-lg shadow-purple-900/10 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-purple-500 before:rounded-r-full before:shadow-[0_0_10px_2px_rgba(168,85,247,0.5)]'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
              )}
            >
              {IconComponent && (
                <IconComponent
                  className={cn(
                    'h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105',
                    isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                  )}
                />
              )}
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && (
                <div className="absolute left-16 bg-zinc-950 text-white text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap shadow-xl">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Trigger & Sign Out */}
      <div className="p-2 border-t border-zinc-800 flex flex-col gap-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
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
          onClick={signOut}
          aria-label="Sign out of system"
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
