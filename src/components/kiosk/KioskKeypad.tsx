'use client';

import React from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { kioskAudio } from './KioskAudio';
import { cn } from '@/lib/utils';

interface KioskKeypadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
}

export function KioskKeypad({
  value,
  onChange,
  onSubmit,
  maxLength = 10,
  disabled = false,
  className,
}: KioskKeypadProps) {
  const handleKeyClick = (key: string) => {
    if (disabled) return;
    kioskAudio.playTap();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(10);
    }

    if (key === 'clear') {
      onChange('');
    } else if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else {
      if (value.length < maxLength) {
        onChange(value + key);
      }
    }
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace'],
  ];

  return (
    <div className={cn('grid grid-cols-3 gap-3 max-w-sm mx-auto select-none', className)}>
      {keys.flat().map((k) => {
        const isClear = k === 'clear';
        const isBack = k === 'backspace';

        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => handleKeyClick(k)}
            className={cn(
              'h-16 sm:h-20 rounded-2xl flex items-center justify-center font-mono font-medium text-2xl transition-all duration-100 touch-manipulation',
              'bg-zinc-900/80 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-100 border border-zinc-800 active:scale-[0.94] shadow-sm',
              'disabled:opacity-50 disabled:pointer-events-none',
              isClear && 'text-zinc-400 text-base font-sans tracking-wide hover:text-red-400 active:bg-red-950/40',
              isBack && 'text-zinc-400 hover:text-amber-400 active:bg-amber-950/40'
            )}
          >
            {isClear ? (
              <span className="flex items-center gap-1">
                <RotateCcw className="size-4" />
                <span>CLR</span>
              </span>
            ) : isBack ? (
              <Delete className="size-6" />
            ) : (
              k
            )}
          </button>
        );
      })}
    </div>
  );
}
