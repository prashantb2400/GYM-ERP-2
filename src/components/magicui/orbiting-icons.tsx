import { cn } from '@/lib/utils';
import React from 'react';

interface OrbitingIconsProps {
  className?: string;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  children: React.ReactNode;
}

export function OrbitingIcons({ className, reverse, duration = 20, delay = 0, radius = 50, children }: OrbitingIconsProps) {
  return (
    <div
      style={{
        '--duration': duration,
        '--radius': radius,
        '--delay': -delay,
      } as React.CSSProperties}
      className={cn(
        'absolute flex h-full w-full transform-gpu animate-orbit items-center justify-center rounded-full',
        reverse && '[animation-direction:reverse]',
        className,
      )}
    >
      {children}
    </div>
  );
}
