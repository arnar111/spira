import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'dark';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--moss-500)] text-[var(--cream-50)] hover:bg-moss-400 active:bg-[var(--moss-600)] shadow-lg shadow-moss-900/30 border border-transparent',
  secondary:
    'bg-[var(--cap-500)] text-[var(--cream-50)] hover:bg-[var(--cap-400)] active:bg-[var(--cap-600)] shadow-lg shadow-[rgba(226,62,29,0.25)] border border-transparent',
  ghost:
    'bg-[rgba(231,217,168,0.06)] text-[var(--cream-100)] hover:bg-[rgba(231,217,168,0.12)] border border-[rgba(231,217,168,0.18)]',
  outline:
    'bg-transparent text-[var(--cream-100)] hover:bg-[rgba(84,130,85,0.12)] border border-[rgba(231,217,168,0.3)]',
  dark:
    'bg-[rgba(18,31,20,0.7)] text-[var(--cream-100)] hover:bg-[rgba(18,31,20,0.9)] border border-[rgba(64,104,67,0.5)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-full transition-all',
          'tracking-[-0.005em]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--moss-950)]',
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
