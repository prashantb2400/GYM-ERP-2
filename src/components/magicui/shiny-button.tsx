'use client';
import { cn } from '@/lib/utils';
import React, { ButtonHTMLAttributes } from 'react';

interface ShinyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function ShinyButton({ children, className, ...props }: ShinyButtonProps) {
  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3',
        'bg-purple-600 text-white font-medium text-sm',
        'transition-all duration-300 hover:bg-purple-500 active:scale-95',
        'before:absolute before:inset-0 before:translate-x-[-100%] before:bg-gradient-to-r',
        'before:from-transparent before:via-white/20 before:to-transparent',
        'before:transition-transform before:duration-500',
        'hover:before:translate-x-[100%]',
        'shadow-lg shadow-purple-600/25',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
