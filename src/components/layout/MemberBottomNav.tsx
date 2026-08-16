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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-zinc-800 flex items-center justify-around h-16 px-2 lg:hidden">
      {MEMBER_SIDEBAR_ITEMS.map((item) => {
        const IconComponent = iconMap[item.icon];
        const isActive = pathname === item.href;

        return (
          <Link key={item.href} href={item.href} passHref legacyBehavior>
            <a
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors',
                isActive ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
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
