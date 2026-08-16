'use client';
import { cn } from '@/lib/utils';
import React from 'react';

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // ms between items
}

export function AnimatedList({ children, className, delay = 100 }: AnimatedListProps) {
  const items = React.Children.toArray(children);
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * delay}ms`, animationFillMode: 'both' }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
