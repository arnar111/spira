import type { CSSProperties } from 'react';

interface TabsProps {
  tabs: string[];
  active: number;
  onChange?: (index: number) => void;
  style?: CSSProperties;
}

export function Tabs({ tabs, active, onChange, style }: TabsProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 4,
        borderRadius: 999,
        background: 'rgba(18,31,20,.6)',
        border: '1px solid rgba(64,104,67,.4)',
        ...style,
      }}
    >
      {tabs.map((t, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: 'none',
            background: i === active ? 'var(--moss-500)' : 'transparent',
            color: i === active ? '#fdfbf6' : 'rgba(231,217,168,.7)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
