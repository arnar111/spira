import { useMemo, useState } from 'react';
import { Sparkline } from '@/components/ui/Sparkline';
import { RangeToggle } from '@/components/ui/RangeToggle';
import type { RangeDays } from '@/lib/range';
import type { SeriesPoint } from '@/lib/series';
import { shortDate } from '@/lib/dates';

const DAY_MS = 86_400_000;

/**
 * Síar tímaröð niður á valið tímabil. Akkerið er NÝJASTI punkturinn (ekki
 * Date.now()) svo línurit eldri ræktana tæmist ekki — ólíkt `withinRange` í
 * `@/lib/range` sem miðar við núið (rétt fyrir Umhverfis-síðuna).
 */
function sliceRange(points: SeriesPoint[], range: RangeDays): SeriesPoint[] {
  if (range === null || points.length === 0) return points;
  const last = points[points.length - 1].t;
  const cutoff = last - range * DAY_MS;
  return points.filter((p) => p.t >= cutoff);
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
  /** Sjálfgefið tímabil (null = allt). */
  defaultRange?: RangeDays;
  /** Slökkva á innbyggða tímabils-rofa (ef ytri stýring er notuð). */
  hideRangeToggle?: boolean;
  width?: number;
}

/**
 * Merkt línurit yfir tímaröð (pH, EC, ljóstími …): titill, tímabils-rofi
 * (ui/RangeToggle), síðasta gildi, og fyrsta/síðasta dagsetning gegnum
 * x-ása-merki uppfærðu ui/Sparkline (2.4).
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
  const view = useMemo(() => sliceRange(points, range), [points, range]);
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
      <Sparkline
        points={view.map((p) => p.v)}
        width={width}
        height={36}
        color={color}
        smooth
        emptyText="Engin gögn"
        xLabels={
          view.length > 1
            ? [shortDate(view[0].t), shortDate(view[view.length - 1].t)]
            : undefined
        }
      />
    </div>
  );
}
