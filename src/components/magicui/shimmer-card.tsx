import { cn } from '@/lib/utils';
import React from 'react';

interface ShimmerCardProps {
  className?: string;
  lines?: number;
}

export function ShimmerCard({ className, lines = 3 }: ShimmerCardProps) {
  return (
    <div className={cn('rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 animate-pulse', className)}>
      <div className="shimmer-line h-4 w-3/4 mb-4 rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="shimmer-line h-3 mb-3 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}
