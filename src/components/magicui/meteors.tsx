'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MeteorsProps {
  number?: number;
  className?: string;
}

export function Meteors({ number = 20, className }: MeteorsProps) {
  const [meteorStyles, setMeteorStyles] = useState<Array<{ top: string; left: string; animationDelay: string; animationDuration: string }>>([]);

  useEffect(() => {
    const styles = Array.from({ length: number }, () => ({
      top: Math.floor(Math.random() * 100) + '%',
      left: Math.floor(Math.random() * 100) + '%',
      animationDelay: (Math.random() * 5).toFixed(2) + 's',
      animationDuration: (Math.random() * 6 + 3).toFixed(2) + 's',
    }));
    setMeteorStyles(styles);
  }, [number]);

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          className="meteor-effect"
          style={style}
        />
      ))}
    </div>
  );
}
