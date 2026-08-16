import { cn } from '@/lib/utils';
import React from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string; // CSS gradient colors
  animate?: boolean;
}

export function GradientText({ children, className, colors = 'from-purple-400 via-violet-300 to-indigo-400', animate = true }: GradientTextProps) {
  return (
    <span className={cn(
      'bg-gradient-to-r bg-clip-text text-transparent',
      colors,
      animate && 'gradient-text-animate',
      className
    )}>
      {children}
    </span>
  );
}
