'use client';

import React, { useRef, useState, useCallback, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // Maximum rotation in degrees (e.g. 12)
  glare?: boolean;
  scale?: number;
}

export function Card3D({
  children,
  className,
  maxTilt = 10,
  glare = true,
  scale = 1.02,
  ...props
}: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotX = (0.5 - y) * (maxTilt * 2);
    const rotY = (x - 0.5) * (maxTilt * 2);

    setTransform(`perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`);
    if (glare) {
      setGlarePos({ x: x * 100, y: y * 100, opacity: 0.25 });
    }
  }, [maxTilt, scale, glare]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        transition: isHovered ? 'transform 80ms ease-out' : 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={cn(
        'relative rounded-2xl will-change-transform select-none',
        className
      )}
      {...props}
    >
      {/* Specular glare reflection */}
      {glare && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 rounded-2xl transition-opacity duration-300"
          style={{
            opacity: glarePos.opacity,
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.18), transparent 70%)`,
          }}
        />
      )}

      {children}
    </div>
  );
}
