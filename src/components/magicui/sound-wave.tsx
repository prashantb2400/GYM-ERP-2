'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SoundWaveProps {
  active?: boolean;
  audioLevel?: number; // 0.0 to 1.0
  barCount?: number;
  className?: string;
  barColor?: string;
}

export function SoundWave({
  active = false,
  audioLevel = 0,
  barCount = 5,
  className,
  barColor = 'bg-indigo-400',
}: SoundWaveProps) {
  // Height coefficients for harmonic equalizer effect
  const coefficients = [0.45, 0.85, 1.0, 0.75, 0.5, 0.9, 0.6];

  return (
    <div className={cn('flex items-center justify-center gap-1 h-6 select-none', className)}>
      {Array.from({ length: barCount }, (_, i) => {
        const coef = coefficients[i % coefficients.length];
        // Dynamic height calculation
        const baseHeight = active ? Math.max(15, (audioLevel * 100 * coef)) : 20;
        const animationDelay = `${(i * 0.12).toFixed(2)}s`;

        return (
          <span
            key={i}
            className={cn(
              'w-1 rounded-full transition-all duration-150 ease-out',
              barColor,
              active && 'animate-sound-bar'
            )}
            style={{
              height: active ? `${Math.min(24, Math.max(4, baseHeight * 0.24))}px` : '4px',
              animationDelay,
            }}
          />
        );
      })}
    </div>
  );
}
