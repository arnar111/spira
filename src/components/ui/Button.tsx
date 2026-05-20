import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-moss-500 text-cream-50 hover:bg-moss-400 active:bg-moss-600 shadow-lg shadow-moss-900/40',
  secondary:
    'bg-terracotta-500 text-cream-50 hover:bg-terracotta-400 active:bg-terracotta-600 shadow-lg shadow-terracotta-900/40',
  ghost: 'bg-transparent text-cream-100 hover:bg-moss-800/60',
  outline:
    'bg-transparent text-cream-100 border border-moss-700 hover:bg-moss-800/40 hover:border-moss-500',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm rounded-xl',
  md: 'h-11 px-6 text-base rounded-2xl',
  lg: 'h-14 px-8 text-lg rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-400 focus-visible:ring-offset-2 focus-visible:ring-offset-moss-950',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
