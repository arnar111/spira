import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface LogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export function Logo({ size = 32, className, animated = false }: LogoProps) {
  const leaf = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 28C16 28 4 22 4 12C4 8 7 4 12 4C14.5 4 16 5.5 16 5.5C16 5.5 17.5 4 20 4C25 4 28 8 28 12C28 22 16 28 16 28Z"
        fill="#548255"
      />
      <path
        d="M16 6 V28"
        stroke="#243827"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 12 L11 16 M16 18 L11 22 M16 12 L21 16 M16 18 L21 22"
        stroke="#243827"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );

  if (!animated) {
    return <span className={cn('inline-flex', className)}>{leaf}</span>;
  }

  return (
    <motion.span
      className={cn('inline-flex origin-bottom', className)}
      animate={{ rotate: [-2, 2, -2] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {leaf}
    </motion.span>
  );
}
