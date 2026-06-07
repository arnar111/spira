import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { MetricChart } from '@/components/charts/MetricChart';
import { WateringTimeline } from '@/components/charts/WateringTimeline';
import { db, type LogEntry } from '@/lib/db';
import {
  ecSeries,
  lightHoursLogSeries,
  lightHoursSeries,
  phSeries,
} from '@/lib/series';

/**
 * „Falin gögn" einnar ræktunar (3.1): pH-, EC- og ljóstíma-línurit ásamt
 * vökvunar-tímalínu — allt dregið úr loggum + umhverfis-sýnum sem þegar eru til.
 * Birtist aðeins ef einhver gögn finnast (annars ekkert kort).
 */
export function GrowMetricsSection({
  growId,
  logs,
  className,
}: {
  growId: string;
  logs: LogEntry[];
  className?: string;
}) {
  const samples = useLiveQuery(
    () => db.environment.where('growId').equals(growId).toArray(),
    [growId],
  );

  const ph = useMemo(() => phSeries(logs), [logs]);
  const ec = useMemo(() => ecSeries(logs), [logs]);
  // Ljóstími: umhverfis-sýni fyrst, falla á 'environment'-logg ef sýni vantar.
  const light = useMemo(() => {
    const fromSamples = lightHoursSeries(samples ?? []);
    return fromSamples.length > 0 ? fromSamples : lightHoursLogSeries(logs);
  }, [samples, logs]);

  const hasWatering = logs.some((l) => l.type === 'water');
  const hasAny = ph.length > 0 || ec.length > 0 || light.length > 0 || hasWatering;
  if (!hasAny) return null;

  return (
    <Card tone="strong" radius={18} padding={16} className={className}>
      <Eyebrow>Mælingar</Eyebrow>
      <div className="flex flex-col gap-4 mt-2">
        {hasWatering && <WateringTimeline logs={logs} />}
        {ph.length > 0 && (
          <MetricChart title="pH" points={ph} color="var(--moss-300)" />
        )}
        {ec.length > 0 && (
          <MetricChart title="EC" points={ec} unit="mS/cm" color="var(--cap-400)" />
        )}
        {light.length > 0 && (
          <MetricChart title="Ljóstími" points={light} unit="klst" color="var(--terra-400)" />
        )}
      </div>
    </Card>
  );
}
