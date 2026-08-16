'use client';
import { cn } from '@/lib/utils';
import React from 'react';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowCard({ children, className, glowColor = 'purple' }: GlowCardProps) {
  const glowMap = {
    purple: 'hover:shadow-purple-500/20 hover:border-purple-500/40',
    blue: 'hover:shadow-blue-500/20 hover:border-blue-500/40',
    green: 'hover:shadow-emerald-500/20 hover:border-emerald-500/40',
    amber: 'hover:shadow-amber-500/20 hover:border-amber-500/40',
  };
  return (
    <div className={cn(
      'rounded-xl border border-zinc-800 bg-zinc-900/40 transition-all duration-500',
      'hover:shadow-[0_0_30px_-5px] hover:-translate-y-1',
      glowMap[glowColor as keyof typeof glowMap] || glowMap.purple,
      className
    )}>
      {children}
    </div>
  );
}
