import type { CSSProperties } from 'react';

export interface PhaseInfo {
  name: string;
  label: string;
  startDay: number;
  color: string;
}

interface PhaseBarProps {
  phases: PhaseInfo[];
  currentDay: number;
  totalDays?: number;
  style?: CSSProperties;
  showLabels?: boolean;
}

export function PhaseBar({
  phases,
  currentDay,
  totalDays = 140,
  style,
  showLabels = true,
}: PhaseBarProps) {
  const clampedDay = Math.max(0, Math.min(currentDay, totalDays));
  return (
    <div style={{ position: 'relative', ...style }}>
      <div
        style={{
          position: 'relative',
          height: 8,
          borderRadius: 999,
          background: 'rgba(36,56,39,.6)',
          overflow: 'hidden',
          border: '1px solid rgba(64,104,67,.3)',
        }}
      >
        {phases.map((p, i) => {
          const next = phases[i + 1]?.startDay ?? totalDays;
          const left = (p.startDay / totalDays) * 100;
          const w = ((next - p.startDay) / totalDays) * 100;
          return (
            <div
              key={p.name}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${w}%`,
                top: 0,
                bottom: 0,
                background: p.color,
                opacity: 0.55,
                borderRight:
                  i < phases.length - 1 ? '1px solid rgba(18,31,20,.6)' : 'none',
              }}
            />
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: `${(clampedDay / totalDays) * 100}%`,
            top: -4,
            bottom: -4,
            width: 3,
            background: 'var(--cream-50)',
            borderRadius: 2,
            boxShadow: '0 0 8px rgba(253,251,246,.5)',
          }}
        />
      </div>
      {showLabels && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'rgba(231,217,168,.55)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {phases.map((p) => (
            <span key={p.name}>{p.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}
