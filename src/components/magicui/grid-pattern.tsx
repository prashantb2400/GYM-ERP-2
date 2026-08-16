'use client';
import { cn } from '@/lib/utils';

interface GridPatternProps {
  width?: number;
  height?: number;
  className?: string;
  squares?: [x: number, y: number][];
}

export function GridPattern({ width = 40, height = 40, className, squares }: GridPatternProps) {
  const id = 'grid-pattern';
  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full fill-zinc-800/30 stroke-zinc-700/20', className)}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse">
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares && squares.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          width={width - 1}
          height={height - 1}
          x={x * width + 1}
          y={y * height + 1}
          className="fill-zinc-700/20 stroke-none"
        />
      ))}
    </svg>
  );
}
