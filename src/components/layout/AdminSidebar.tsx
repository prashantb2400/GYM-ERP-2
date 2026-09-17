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
        'bg-zinc-950/80 backdrop-blur-xl border-r border-white/[0.08] flex flex-col transition-[width] duration-200 ease-out relative z-30 h-screen select-none',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-3.5 border-b border-white/[0.06]">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="h-7.5 w-7.5 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                GymERP
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                v2
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary mx-auto shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]">
            <Dumbbell className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto scrollbar-none">
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
                'flex items-center gap-2.5 px-3 py-1.75 rounded-xl text-xs font-medium transition-[background-color,color,border-color,transform] duration-120 ease-out group relative active:scale-[0.98]',
                isActive
                  ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-2xs font-semibold'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border border-transparent'
              )}
            >
              {IconComponent && (
                <IconComponent
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors duration-120',
                    isActive ? 'text-primary' : 'text-zinc-500 group-hover:text-zinc-300'
                  )}
                />
              )}
              {!collapsed && (
                <span className="truncate flex-1">{item.label}</span>
              )}
              {!collapsed && isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              )}
              {collapsed && (
                <div className="absolute left-14 bg-zinc-900/95 backdrop-blur-md text-zinc-100 text-xs px-2.5 py-1 rounded-lg border border-white/[0.1] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap shadow-xl z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Trigger & Sign Out */}
      <div className="p-2 border-t border-zinc-800/80 flex flex-col gap-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
          className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-[background-color,color] duration-120 active:scale-[0.98] cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Collapse Menu</span>
            </>
          )}
        </button>

        <button
          onClick={signOut}
          aria-label="Sign out of system"
          className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-[background-color,color] duration-120 active:scale-[0.98] cursor-pointer"
        >
          {collapsed ? (
            <LogOut className="h-4 w-4 mx-auto" />
          ) : (
            <>
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
