import { useMemo, useState } from 'react';
import { Sparkline } from '@/components/ui/Sparkline';
import type { SeriesPoint } from '@/lib/series';

/** Tímabils-gluggi fyrir línurit. `all` = öll gögn. */
export type RangeDays = 7 | 14 | 30 | 'all';

const RANGE_LABELS: { value: RangeDays; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
  { value: 'all', label: 'Allt' },
];

const DAY_MS = 86_400_000;

/**
 * Lítil tímabils-rofi (7/14/30/allt) í chip-stíl appsins. Sjálfstæð útgáfa svo
 * 3.1 sé óháð 2.4 (ui/RangeToggle lendir á annarri grein — lead samræmir).
 */
export function RangeToggle({
  value,
  onChange,
}: {
  value: RangeDays;
  onChange: (r: RangeDays) => void;
}) {
  return (
    <div className="flex gap-1">
      {RANGE_LABELS.map((r) => {
        const active = r.value === value;
        return (
          <button
            key={String(r.value)}
            type="button"
            onClick={() => onChange(r.value)}
            className="sp-mono rounded-full px-2 py-0.5 text-[10px] transition-colors"
            style={{
              background: active ? 'rgba(115,159,115,.22)' : 'rgba(18,31,20,.4)',
              border: `1px solid ${active ? 'rgba(115,159,115,.55)' : 'rgba(64,104,67,.3)'}`,
              color: active ? 'var(--cream-50)' : 'var(--cream-400)',
            }}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

/** Síar tímaröð niður á valið tímabil m.v. nýjasta punkt. */
function withinRange(points: SeriesPoint[], range: RangeDays): SeriesPoint[] {
  if (range === 'all' || points.length === 0) return points;
  const last = points[points.length - 1].t;
  const cutoff = last - range * DAY_MS;
  return points.filter((p) => p.t >= cutoff);
}

function shortDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('is-IS', { day: 'numeric', month: 'short' });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

/** Snyrtir tölu: skerður óþarfa aukastaf. */
function num(v: number): string {
  return String(Number(v.toFixed(2)));
}

interface MetricChartProps {
  title: string;
  points: SeriesPoint[];
  unit?: string;
  color?: string;
  /** Sjálfgefið tímabil. */
  defaultRange?: RangeDays;
  /** Slökkva á innbyggða tímabils-rofa (ef ytri stýring er notuð). */
  hideRangeToggle?: boolean;
  width?: number;
}

/**
 * Merkt línurit yfir tímaröð (pH, EC, ljóstími …): titill, tímabils-rofi,
 * síðasta gildi, og fyrsta/síðasta dagsetning undir. Notar núverandi
 * `ui/Sparkline` API óbreytt (2.4 uppfærir hana á annarri grein).
 */
export function MetricChart({
  title,
  points,
  unit,
  color = 'var(--moss-300)',
  defaultRange = 14,
  hideRangeToggle = false,
  width = 320,
}: MetricChartProps) {
  const [range, setRange] = useState<RangeDays>(defaultRange);
  const view = useMemo(() => withinRange(points, range), [points, range]);
  const last = view[view.length - 1];

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-cream-400/60">
          {title}
          {last && (
            <span className="sp-mono ml-2 text-cream-200/80 normal-case tracking-normal">
              {num(last.v)}
              {unit ? ` ${unit}` : ''}
            </span>
          )}
        </div>
        {!hideRangeToggle && <RangeToggle value={range} onChange={setRange} />}
      </div>
      {view.length === 0 ? (
        <div
          className="text-[11px] text-cream-300/55 rounded-lg px-3 py-3 text-center"
          style={{ background: 'rgba(18,31,20,.35)', border: '1px dashed rgba(64,104,67,.3)' }}
        >
          Engin gögn
        </div>
      ) : (
        <>
          <Sparkline points={view.map((p) => p.v)} width={width} height={36} color={color} />
          {view.length > 1 && (
            <div className="flex justify-between sp-mono text-[9px] text-cream-400/45 mt-0.5">
              <span>{shortDate(view[0].t)}</span>
              <span>{shortDate(view[view.length - 1].t)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
