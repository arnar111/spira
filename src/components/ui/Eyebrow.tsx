import type { CSSProperties, ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function Eyebrow({ children, color = 'var(--moss-300)', className, style }: EyebrowProps) {
  return (
    <div
      className={className}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
