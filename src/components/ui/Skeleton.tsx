import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  /** Hornaradíus í px (sjálfgefið 8). Nota t.d. 999 fyrir hringi. */
  radius?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Hleðslu-beinagrind: lágstemmdur grunnflötur með ljósrönd sem líður yfir
 * (CSS í index.css `.sp-skeleton`, virðir prefers-reduced-motion).
 */
export function Skeleton({ width, height = 16, radius = 8, className, style }: SkeletonProps) {
  return (
    <div
      className={cn('sp-skeleton', className)}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}
