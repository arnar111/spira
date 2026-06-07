import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Stat } from '@/components/ui/Stat';
import { HarvestTimeline } from '@/components/charts/HarvestTimeline';
import { PredictionVsActual } from '@/components/charts/PredictionVsActual';
import { yieldStats } from '@/lib/harvestStats';
import type { HarvestEntry, Plant } from '@/lib/db';

/**
 * Uppskeru-greining einnar ræktunar (3.3): tímalína tínslna, afköst (g/dag,
 * g/pod, tínslur/viku) sem StatCards, og spáð-vs-raun. Renders ekkert ef engin
 * tínsla er til.
 */
export function GrowHarvestSection({
  plants,
  harvests,
  now,
  className,
}: {
  plants: Plant[];
  harvests: HarvestEntry[];
  now: number;
  className?: string;
}) {
  const stats = useMemo(() => yieldStats(harvests, now), [harvests, now]);
  if (harvests.length === 0) return null;

  return (
    <Card tone="strong" radius={18} padding={16} className={className}>
      <Eyebrow>Uppskeru-greining</Eyebrow>
      <div className="grid grid-cols-3 gap-3 mt-2">
        <Stat
          label="G/DAG"
          value={stats.gramsPerDay !== null ? stats.gramsPerDay.toFixed(1) : '—'}
          unit="g"
          tone="cap"
        />
        <Stat
          label="G/POD"
          value={stats.gramsPerPod !== null ? stats.gramsPerPod.toFixed(1) : '—'}
          unit="g"
          tone="cream"
        />
        <Stat
          label="TÍNSLUR/VIKU"
          value={stats.harvestsPerWeek !== null ? stats.harvestsPerWeek.toFixed(1) : '—'}
          tone="moss"
        />
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <HarvestTimeline harvests={harvests} />
        <PredictionVsActual plants={plants} harvests={harvests} now={now} />
      </div>
    </Card>
  );
}
