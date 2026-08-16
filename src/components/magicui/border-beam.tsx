import { cn } from '@/lib/utils';
import React from 'react';

interface BorderBeamProps {
  className?: string;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({ className, duration = 8, colorFrom = '#9333ea', colorTo = '#818cf8', delay = 0 }: BorderBeamProps) {
  return (
    <span
      style={{
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        background: `linear-gradient(to right, transparent, ${colorFrom}, ${colorTo}, transparent)`,
      }}
      className={cn('pointer-events-none absolute bottom-0 left-0 h-[2px] w-[30%] animate-border-beam-move', className)}
    />
  );
}
