'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  showRadialGradient?: boolean;
}

export function AuroraBackground({ children, className, showRadialGradient = true }: AuroraBackgroundProps) {
  return (
    <div className={cn('relative flex flex-col min-h-screen bg-zinc-950 overflow-hidden', className)}>
      {/* Aurora layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora-layer aurora-layer-1" />
        <div className="aurora-layer aurora-layer-2" />
        <div className="aurora-layer aurora-layer-3" />
      </div>
      {/* Radial gradient overlay for depth */}
      {showRadialGradient && (
        <div className="absolute inset-0 bg-radial-gradient-overlay pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
