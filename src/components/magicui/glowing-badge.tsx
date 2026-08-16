import { cn } from '@/lib/utils';
import React from 'react';

type BadgeVariant = 'active' | 'expired' | 'pending' | 'frozen' | 'live' | 'offline';

interface GlowingBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/20',
  expired: 'bg-red-500/10 text-red-400 border-red-500/30 shadow-red-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/20',
  frozen: 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-blue-500/20',
  live: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 shadow-emerald-500/30',
  offline: 'bg-zinc-800 text-zinc-500 border-zinc-700',
};

export function GlowingBadge({ children, variant = 'active', className, pulse = false }: GlowingBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm',
      variants[variant],
      className
    )}>
      {pulse && (
        <span className={cn('relative flex h-2 w-2')}>
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            variant === 'active' || variant === 'live' ? 'bg-emerald-400' :
            variant === 'expired' ? 'bg-red-400' :
            variant === 'pending' ? 'bg-amber-400' : 'bg-blue-400'
          )} />
          <span className={cn('relative inline-flex rounded-full h-2 w-2',
            variant === 'active' || variant === 'live' ? 'bg-emerald-400' :
            variant === 'expired' ? 'bg-red-400' :
            variant === 'pending' ? 'bg-amber-400' : 'bg-blue-400'
          )} />
        </span>
      )}
      {children}
    </span>
  );
}
