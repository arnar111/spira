import { Snowflake, Sprout } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';
import {
  REYKJAVIK_SEASON,
  frostRisk,
  seasonForMonth,
  seasonStatus,
  type FrostRisk,
} from '@/lib/season';

const STATUS_TONE = {
  good: { color: 'var(--moss-300)', pill: 'moss' as const },
  ok: { color: 'var(--cream-300)', pill: 'cream' as const },
  low: { color: 'var(--cap-400)', pill: 'cap' as const },
};

/** Relative height of each month bar — taller = more growable, shorter = frost. */
const RISK_HEIGHT: Record<FrostRisk, number> = { none: 1, risk: 0.55, hard: 0.22 };
const RISK_BAR: Record<FrostRisk, string> = {
  none: 'rgba(84,130,85,.55)',
  risk: 'rgba(232,179,42,.5)',
  hard: 'rgba(239,90,60,.28)',
};
const RISK_LABEL: Record<FrostRisk, string> = {
  none: 'Frostlaust',
  risk: 'Frosthætta',
  hard: 'Frost',
};

/**
 * Iceland outdoor season almanac — the outdoor counterpart to <DaylightCard>.
 * Shows the frost outlook for the current month and a 12-month frost calendar,
 * so an outdoor (potato / overwintering strawberry) grower can see the season
 * window at a glance. Straight from the Icelandic outdoor grow guides.
 */
export function SeasonCard() {
  const month = new Date().getMonth() + 1;
  const today = seasonForMonth(month);
  const status = seasonStatus(month);
  const tone = STATUS_TONE[status.tone];
  const risk = frostRisk(month);

  return (
    <Card tone="strong" radius={18} padding={16}>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <Eyebrow>Árstíðaralmanak · Reykjavík</Eyebrow>
          <div className="sp-display" style={{ fontSize: 18, color: 'var(--cream-50)', fontWeight: 500 }}>
            Útiræktun í {today.name.toLowerCase()}
          </div>
        </div>
        <Pill tone={tone.pill} size="sm">
          {risk === 'none' ? <Sprout size={10} /> : <Snowflake size={10} />}
          {status.label}
        </Pill>
      </div>

      <div className="flex items-baseline gap-1.5 mb-1">
        <span
          className="sp-display"
          style={{ fontSize: 26, fontWeight: 500, color: tone.color, lineHeight: 1.1 }}
        >
          {RISK_LABEL[risk]}
        </span>
      </div>
      <p className="text-[11.5px] text-cream-300/70 leading-snug mb-4">{today.outdoorNote}</p>

      {/* 12-month frost calendar */}
      <div className="flex items-end justify-between gap-1" style={{ height: 70 }}>
        {REYKJAVIK_SEASON.map((m) => {
          const isNow = m.month === month;
          const barColor = isNow ? 'var(--cap-500)' : RISK_BAR[m.frost];
          return (
            <div
              key={m.month}
              className="flex-1 flex flex-col items-center gap-1"
              title={`${m.name}: ${RISK_LABEL[m.frost]}`}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 16,
                  height: `${RISK_HEIGHT[m.frost] * 52}px`,
                  background: barColor,
                  borderRadius: 4,
                  transition: 'height .3s',
                }}
              />
              <span
                className="sp-mono"
                style={{
                  fontSize: 8,
                  color: isNow ? 'var(--cap-400)' : 'var(--cream-400)',
                  opacity: isNow ? 1 : 0.6,
                  fontWeight: isNow ? 700 : 400,
                }}
              >
                {m.name.slice(0, 1)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[9.5px] text-cream-400/60">
        <span className="inline-flex items-center gap-1">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: RISK_BAR.none }} />
          Frostlaust
        </span>
        <span className="inline-flex items-center gap-1">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: RISK_BAR.risk }} />
          Frosthætta
        </span>
        <span className="inline-flex items-center gap-1">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: RISK_BAR.hard }} />
          Frost
        </span>
      </div>
    </Card>
  );
}
