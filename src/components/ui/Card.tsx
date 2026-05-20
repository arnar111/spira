import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'glass rounded-3xl p-6 shadow-xl shadow-moss-950/40',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';
