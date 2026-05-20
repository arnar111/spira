import { motion } from 'framer-motion';

interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
  animated?: boolean;
}

export function Logo({
  size = 32,
  color = 'var(--moss-300)',
  className,
  animated = false,
}: LogoProps) {
  const leaf = (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M16 28c-9-3-12-10-12-16C4 8 7 4 12 4c3 0 4 2 4 2s1-2 4-2c5 0 8 4 8 8 0 6-3 13-12 16Z"
        fill={color}
      />
      <path
        d="M16 6c0 4-3 6-6 7M16 6c0 4 3 6 6 7M16 10c-1 4-4 7-8 9M16 10c1 4 4 7 8 9"
        stroke="rgba(18,31,20,.6)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );

  if (!animated) {
    return <span className={className} style={{ display: 'inline-flex' }}>{leaf}</span>;
  }

  return (
    <motion.span
      className={className}
      style={{ display: 'inline-flex', transformOrigin: 'bottom center' }}
      animate={{ rotate: [-2, 2, -2] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {leaf}
    </motion.span>
  );
}

interface WordmarkProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Wordmark({
  size = 28,
  color = 'var(--cream-50)',
  className,
}: WordmarkProps) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 8,
        color,
        fontFamily: 'var(--font-display)',
        fontSize: size,
        fontWeight: 500,
        letterSpacing: '-0.02em',
      }}
    >
      <Logo size={size * 0.85} />
      <span>Spíra</span>
    </div>
  );
}
