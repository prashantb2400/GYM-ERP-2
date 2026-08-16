'use client';

import React from 'react';
import { GlowingBadge } from '@/components/magicui/glowing-badge';
import { cn } from '@/lib/utils';

interface PlanBadgeProps {
  plan: string;
  size?: 'sm' | 'md';
}

export function PlanBadge({ plan, size = 'sm' }: PlanBadgeProps) {
  const normalizedPlan = plan.toLowerCase();
  
  // Free = zinc/gray
  if (normalizedPlan.includes('free')) {
    return (
      <GlowingBadge 
        variant="offline" 
        className={cn(size === 'md' ? 'px-3 py-1 text-sm' : '')}
      >
        {plan}
      </GlowingBadge>
    );
  }
  
  // Enterprise = amber/gold
  if (normalizedPlan.includes('enterprise')) {
    return (
      <GlowingBadge 
        variant="pending" 
        className={cn(size === 'md' ? 'px-3 py-1 text-sm' : '')}
        pulse
      >
        {plan}
      </GlowingBadge>
    );
  }
  
  // Pro = purple (custom styles overriding a variant)
  return (
    <GlowingBadge 
      variant="active" 
      className={cn(
        '!bg-purple-500/10 !text-purple-400 !border-purple-500/30 !shadow-purple-500/20',
        size === 'md' ? 'px-3 py-1 text-sm' : ''
      )}
      pulse
    >
      <span className="relative flex h-2 w-2 mr-1">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-purple-400" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400" />
      </span>
      <span className="ml-0.5">{plan}</span>
    </GlowingBadge>
  );
}
