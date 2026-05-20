import type { CSSProperties, ReactNode } from 'react';

type PillTone =
  | 'moss'
  | 'cream'
  | 'terra'
  | 'cap'
  | 'dark'
  | 'solid_moss'
  | 'solid_terra'
  | 'solid_cap';

type PillSize = 'sm' | 'md' | 'lg';

interface PillProps {
  children: ReactNode;
  tone?: PillTone;
  size?: PillSize;
  icon?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const SIZES: Record<PillSize, { padding: string; fontSize: number; h: number }> = {
  sm: { padding: '2px 8px', fontSize: 10, h: 20 },
  md: { padding: '4px 10px', fontSize: 11, h: 22 },
  lg: { padding: '6px 12px', fontSize: 12, h: 28 },
};

const TONES: Record<PillTone, { bg: string; color: string; border: string }> = {
  moss: { bg: 'rgba(84,130,85,.18)', color: '#9fbf9d', border: 'rgba(84,130,85,.4)' },
  cream: { bg: 'rgba(231,217,168,.12)', color: '#ebd9a8', border: 'rgba(231,217,168,.25)' },
  terra: { bg: 'rgba(194,106,77,.18)', color: '#dfae96', border: 'rgba(194,106,77,.4)' },
  cap: { bg: 'rgba(226,62,29,.18)', color: '#ef5a3c', border: 'rgba(226,62,29,.4)' },
  dark: { bg: 'rgba(18,31,20,.6)', color: '#c7dac6', border: 'rgba(64,104,67,.5)' },
  solid_moss: { bg: '#406843', color: '#fdfbf6', border: '#548255' },
  solid_terra: { bg: '#c26a4d', color: '#fdfbf6', border: '#c26a4d' },
  solid_cap: { bg: '#e23e1d', color: '#fdfbf6', border: '#e23e1d' },
};

export function Pill({ children, tone = 'moss', size = 'md', icon, style, className }: PillProps) {
  const s = SIZES[size];
  const t = TONES[tone];
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: s.padding,
        height: s.h,
        fontSize: s.fontSize,
        borderRadius: 999,
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}
