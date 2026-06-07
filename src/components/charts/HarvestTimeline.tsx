import { useMemo } from 'react';
import type { HarvestEntry } from '@/lib/db';
import { harvestTimeline } from '@/lib/harvestStats';

function shortDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('is-IS', { day: 'numeric', month: 'short' });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

/**
 * Stöpla-tímalína tínslna: einn stöpull á hverja tínslu (hæð ∝ þyngd), raðað í
 * tíma. Hrein framsetning — hentar betur en línurit fyrir stök uppskeruhögg.
 */
export function HarvestTimeline({ harvests }: { harvests: HarvestEntry[] }) {
  const points = useMemo(() => harvestTimeline(harvests), [harvests]);
  if (points.length === 0) return null;

  const max = Math.max(...points.map((p) => p.weightG), 1);

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-cream-400/60 mb-1.5">
        Tínslur yfir tíma
      </div>
      <div
        className="flex items-end gap-1 rounded-lg px-2 pt-2"
        style={{
          height: 64,
          background: 'rgba(18,31,20,.4)',
          border: '1px solid rgba(64,104,67,.3)',
        }}
      >
        {points.map((p, i) => {
          const h = 6 + (p.weightG / max) * 46;
          return (
            <span
              key={`${p.t}-${i}`}
              title={`${shortDate(p.t)} · ${p.weightG} g`}
              className="flex-1 rounded-t"
              style={{
                height: h,
                minWidth: 3,
                maxWidth: 22,
                background: 'var(--cap-400)',
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between sp-mono text-[9px] text-cream-400/45 mt-0.5">
        <span>{shortDate(points[0].t)}</span>
        <span>{shortDate(points[points.length - 1].t)}</span>
      </div>
    </div>
  );
}
