'use client';

import React, { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface RippleProps extends ComponentPropsWithoutRef<'div'> {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
  tintColor?: string;
}

export const Ripple = React.memo(function Ripple({
  mainCircleSize = 240,
  mainCircleOpacity = 0.28,
  numCircles = 7,
  className,
  tintColor = 'rgba(99, 102, 241, 0.25)',
  ...props
}: RippleProps) {
  return (
    <div
      className={cn(
        'pointer-events-none select-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]',
        className
      )}
      {...props}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 85;
        const opacity = Math.max(0.04, mainCircleOpacity - i * 0.038);
        const animationDelay = `${i * 0.14}s`;
        const borderStyle = i === numCircles - 1 ? 'dashed' : 'solid';

        return (
          <div
            key={i}
            className="absolute animate-ripple rounded-full border top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-xs transition-opacity duration-300"
            style={
              {
                width: `${size}px`,
                height: `${size}px`,
                opacity,
                animationDelay,
                borderStyle,
                borderWidth: '1px',
                borderColor: tintColor,
                background: `radial-gradient(circle, ${tintColor} 0%, transparent 70%)`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
});
