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
  const progress = totalDays > 0 ? clampedDay / totalDays : 0;
  // Active phase = the last phase whose startDay we've reached.
  const activeIndex = phases.reduce(
    (acc, p, i) => (clampedDay >= p.startDay ? i : acc),
    0,
  );
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
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
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
                // Past + active phases read brighter; upcoming phases stay muted.
                opacity: isActive ? 0.95 : isPast ? 0.7 : 0.28,
                borderRight:
                  i < phases.length - 1 ? '1px solid rgba(18,31,20,.6)' : 'none',
              }}
            />
          );
        })}
        {/* Progress fill: advances proportionally to currentDay / totalDays. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background:
              'linear-gradient(90deg, rgba(253,251,246,.12), rgba(253,251,246,.28))',
            borderRight: '1px solid rgba(253,251,246,.35)',
            transition: 'width .35s ease',
          }}
        />
      </div>
      {/* Marker sits above the (clipped) track so its glow stays visible. */}
      <div
        style={{
          position: 'absolute',
          left: `${progress * 100}%`,
          top: -2,
          height: 12,
          width: 3,
          marginLeft: -1.5,
          background: 'var(--cream-50)',
          borderRadius: 2,
          boxShadow: '0 0 8px rgba(253,251,246,.5)',
          transition: 'left .35s ease',
        }}
      />
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
            <span key={p.name}>{p.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
