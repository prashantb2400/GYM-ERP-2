'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MEMBER_SIDEBAR_ITEMS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CreditCard,
  CalendarCheck,
  Receipt,
  Apple,
  Dumbbell,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  CreditCard,
  CalendarCheck,
  Receipt,
  Apple,
  Dumbbell,
};

export function MemberBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 flex items-center justify-around h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] px-2 lg:hidden">
      {MEMBER_SIDEBAR_ITEMS.map((item) => {
        const IconComponent = iconMap[item.icon];
        const isActive = pathname === item.href;

        return (
          <Link key={item.href} href={item.href} passHref legacyBehavior>
            <a
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 text-center transition-[color,transform] active:scale-[0.95]',
                isActive ? 'text-purple-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {IconComponent && (
                <IconComponent className="h-5 w-5 mb-0.5" />
              )}
              <span className="text-[10px] tracking-tight truncate max-w-[64px]">
                {item.label.replace('My ', '')}
              </span>
            </a>
          </Link>
        );
      })}
    </nav>
  );
}
