import type { CSSProperties, ReactNode } from 'react';

type StatTone = 'cream' | 'moss' | 'terra' | 'cap';

interface StatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: string;
  tone?: StatTone;
  icon?: ReactNode;
  style?: CSSProperties;
}

const COLORS: Record<StatTone, { v: string; l: string }> = {
  cream: { v: 'var(--cream-50)', l: 'rgba(231,217,168,.6)' },
  moss: { v: 'var(--moss-200)', l: 'rgba(159,191,157,.7)' },
  terra: { v: 'var(--terra-300)', l: 'rgba(223,174,150,.7)' },
  cap: { v: 'var(--cap-400)', l: 'rgba(239,90,60,.7)' },
};

export function Stat({ label, value, unit, sub, tone = 'cream', icon, style }: StatProps) {
  const c = COLORS[tone];
  return (
    <div style={style}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: c.l,
          fontFamily: 'var(--font-mono)',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 500,
            color: c.v,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {unit && <span style={{ fontSize: 12, color: c.l, fontFamily: 'var(--font-mono)' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(231,217,168,.5)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
