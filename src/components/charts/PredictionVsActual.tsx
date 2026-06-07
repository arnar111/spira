import { useMemo } from 'react';
import { CalendarCheck } from 'lucide-react';
import type { HarvestEntry, Plant } from '@/lib/db';
import { predictHarvestWindow } from '@/lib/ros/predict';
import { varietyById, varietyByName } from '@/lib/varieties';
import { shortDate } from '@/lib/dates';

interface Row {
  plantId: string;
  label: string;
  predictedStart: number;
  predictedEnd: number;
  actualFirst: number;
}

/**
 * „Spáð vs raun" (3.3): fyrir hverja plöntu sem hefur BÆÐI uppskeruspá
 * (predict.ts) OG raunverulegar tínslur, sýnir áætlaðan glugga á móti fyrstu
 * raun-tínslu. Skilar null ef engin planta uppfyllir hvort tveggja.
 */
export function PredictionVsActual({
  plants,
  harvests,
  now,
}: {
  plants: Plant[];
  harvests: HarvestEntry[];
  now: number;
}) {
  const rows = useMemo<Row[]>(() => {
    const firstHarvestByPlant = new Map<string, number>();
    for (const h of harvests) {
      const cur = firstHarvestByPlant.get(h.plantId);
      if (cur === undefined || h.timestamp < cur) firstHarvestByPlant.set(h.plantId, h.timestamp);
    }
    const out: Row[] = [];
    for (const p of plants) {
      const actualFirst = firstHarvestByPlant.get(p.id);
      if (actualFirst === undefined) continue;
      const variety = varietyById(p.varietyId) ?? varietyByName(p.variety);
      const pred = predictHarvestWindow(p, variety, now);
      if (!pred) continue;
      out.push({
        plantId: p.id,
        label: p.nickname || p.variety,
        predictedStart: pred.windowStart,
        predictedEnd: pred.windowEnd,
        actualFirst,
      });
    }
    return out;
  }, [plants, harvests, now]);

  if (rows.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-cream-400/60 mb-1.5">
        <CalendarCheck size={11} />
        Spáð vs raun
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => {
          const earlier = r.actualFirst < r.predictedStart;
          return (
            <div key={r.plantId} className="text-[11.5px] leading-snug">
              <span className="text-cream-100 font-medium">{r.label}</span>
              <div className="text-cream-400/70 mt-0.5">
                Spáð gluggi:{' '}
                <span className="sp-mono text-cream-300">
                  {shortDate(r.predictedStart)}–{shortDate(r.predictedEnd)}
                </span>{' '}
                · raun:{' '}
                <span className="sp-mono" style={{ color: 'var(--cap-400)' }}>
                  {shortDate(r.actualFirst)}
                </span>{' '}
                <span className="text-cream-400/55">
                  ({earlier ? 'fyrr en spáð' : 'innan/eftir spá'})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
