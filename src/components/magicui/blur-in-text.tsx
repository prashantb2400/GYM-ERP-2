'use client';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';

interface BlurInTextProps {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
}

export function BlurInText({ text, className, duration = 0.8, delay = 0 }: BlurInTextProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <span
      ref={ref}
      className={cn('transition-all inline-block', className)}
      style={{
        transitionDuration: `${duration}s`,
        opacity: visible ? 1 : 0,
        filter: visible ? 'blur(0px)' : 'blur(12px)',
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
      }}
    >
      {text}
    </span>
  );
}
