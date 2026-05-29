import { Sun, Lightbulb, CalendarDays, Sprout } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';
import {
  REYKJAVIK_DAYLIGHT,
  currentDaylight,
  daylightStatus,
  monthPlan,
  needsGrowLight,
} from '@/lib/daylight';

const MAX_HOURS = 21;
const STATUS_TONE = {
  good: { color: 'var(--moss-300)', pill: 'moss' as const },
  ok: { color: 'var(--cream-300)', pill: 'cream' as const },
  low: { color: 'var(--cap-400)', pill: 'cap' as const },
};

/**
 * Iceland daylight almanac — shows how much natural light a NW window gets this
 * month and whether a supplemental grow light is needed. Straight from the
 * Steinunn "Iceland Summer Edition" guide.
 */
export function DaylightCard() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const today = currentDaylight(now);
  const status = daylightStatus(month);
  const tone = STATUS_TONE[status.tone];
  const growLight = needsGrowLight(month);
  const plan = monthPlan(month);

  return (
    <Card tone="strong" radius={18} padding={16}>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <Eyebrow>Birtualmanak · Reykjavík</Eyebrow>
          <div className="sp-display" style={{ fontSize: 18, color: 'var(--cream-50)', fontWeight: 500 }}>
            Dagsbirta í {today.name.toLowerCase()}
          </div>
        </div>
        <Pill tone={tone.pill} size="sm">
          {growLight ? <Lightbulb size={10} /> : <Sun size={10} />}
          {status.label}
        </Pill>
      </div>

      <div className="flex items-baseline gap-1.5 mb-1">
        <span
          className="sp-display"
          style={{ fontSize: 34, fontWeight: 500, color: tone.color, lineHeight: 1 }}
        >
          {today.hours}
        </span>
        <span className="sp-mono text-cream-400/70" style={{ fontSize: 12 }}>
          klst/dag
        </span>
      </div>
      <p className="text-[11.5px] text-cream-300/70 leading-snug mb-4">
        {today.windowNote}. <span className="text-cream-200">{today.action}.</span>
      </p>

      {/* 12-month mini chart */}
      <div className="flex items-end justify-between gap-1" style={{ height: 70 }}>
        {REYKJAVIK_DAYLIGHT.map((m) => {
          const isNow = m.month === month;
          const low = m.hours < 10;
          const barColor = isNow
            ? 'var(--cap-500)'
            : low
              ? 'rgba(239,90,60,.28)'
              : 'rgba(84,130,85,.55)';
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${m.name}: ${m.hours} klst`}>
              <div
                style={{
                  width: '100%',
                  maxWidth: 16,
                  height: `${(m.hours / MAX_HOURS) * 52}px`,
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
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(84,130,85,.55)' }} />
          Næg birta
        </span>
        <span className="inline-flex items-center gap-1">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(239,90,60,.28)' }} />
          &lt; 10 klst — LED þörf
        </span>
      </div>

      {/* This month's grow plan (guide Table 18) */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(64,104,67,.25)' }}>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-moss-300 mb-1.5">
          <CalendarDays size={12} /> Á döfinni í {today.name.toLowerCase()}
        </div>
        <p className="text-[11.5px] text-cream-300/80 leading-snug">{plan.activities}</p>
        {plan.startVarieties && (
          <div className="flex items-start gap-1.5 mt-2 text-[11px] text-cream-300/70">
            <Sprout size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--moss-300)' }} />
            <span>
              <span className="text-cream-400/70">Sá núna:</span> {plan.startVarieties}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
