type StatCardTone = 'cream' | 'moss' | 'cap';

interface StatCardProps {
  label: string;
  value: string;
  tone: StatCardTone;
  unit?: string;
}

/**
 * Lítið glerstöplaspjald með merki + tölu (áður `QuickStat` í Home.tsx).
 * Markmið: einn staður fyrir þetta munstur. Útlit óbreytt frá upprunanum.
 */
export function StatCard({ label, value, tone, unit }: StatCardProps) {
  const map = {
    cream: { fg: 'var(--cream-50)', acc: 'var(--cream-200)' },
    moss: { fg: 'var(--moss-200)', acc: 'var(--moss-300)' },
    cap: { fg: 'var(--cap-400)', acc: 'var(--terra-300)' },
  }[tone];
  return (
    <div
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.35)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="sp-mono"
        style={{ fontSize: 9, color: 'rgba(231,217,168,.55)', letterSpacing: '0.16em' }}
      >
        {label.toUpperCase()}
      </div>
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span className="sp-stat" style={{ fontSize: 24, color: map.fg }}>
          {value}
        </span>
        {unit && <span className="sp-mono" style={{ fontSize: 10, color: map.acc }}>{unit}</span>}
      </div>
    </div>
  );
}
