'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface NumberTickerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimalPlaces?: number;
  duration?: number; // ms
}

export function NumberTicker({ value, prefix = '', suffix = '', className, decimalPlaces = 0, duration = 2000 }: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(eased * value);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    startTime.current = null;
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, duration]);

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}{displayValue.toFixed(decimalPlaces)}{suffix}
    </span>
  );
}
