import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId, type Plant, type RosReport } from '@/lib/db';
import { computeInsights, buildContextDigest } from '@/lib/ros/engine';
import type { RosInsight } from '@/lib/ros/types';
import { askRos } from '@/lib/ros/chat';
import { predictForPlants, type GrowHarvestOutlook } from '@/lib/ros/predict';
import { varietyById, varietyByName } from '@/lib/varieties';

const DAY_MS = 1000 * 60 * 60 * 24;

/** Innsýn merkt sinni ræktun svo hægt sé að birta nafn og fletta á réttan stað. */
export interface TaggedInsight {
  insight: RosInsight;
  growId: string;
  growName: string;
}

/** Hópar raðir eftir growId fyrir client-side samantekt. */
function groupByGrow<T extends { growId: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const arr = map.get(row.growId);
    if (arr) arr.push(row);
    else map.set(row.growId, [row]);
  }
  return map;
}

export interface RosOverviewData {
  dueAndSoon: TaggedInsight[];
  infoCount: number;
  predictions: GrowHarvestOutlook[];
  reports: RosReport[] | undefined;
  building: boolean;
  buildError: string | null;
  buildReport: () => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

/**
 * Sækir og leiðir út öll gögn fyrir Dagskrá Rósar: dagskrá dagsins (innsýn),
 * uppskeruspá og vikuskýrslur, ásamt skýrslugerð (askRos). Hreinsað út úr
 * RosOverview-skelinni (4.4).
 */
export function useRosOverviewData(): RosOverviewData {
  const grows = useLiveQuery(() => db.grows.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());
  const logs = useLiveQuery(() => db.logs.toArray());
  const harvests = useLiveQuery(() => db.harvests.toArray());
  const reports = useLiveQuery(() =>
    db.rosReports.orderBy('createdAt').reverse().toArray(),
  );

  const now = Date.now();
  const month = new Date(now).getMonth() + 1;

  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  // Virkar ræktanir (ekki vistaðar í safn).
  const activeGrows = useMemo(
    () => (grows ?? []).filter((g) => !g.archived),
    [grows],
  );

  // Hóparnir reiknaðir client-side eftir growId.
  const plantsByGrow = useMemo(() => groupByGrow(plants ?? []), [plants]);
  const logsByGrow = useMemo(() => groupByGrow(logs ?? []), [logs]);
  const harvestsByGrow = useMemo(() => groupByGrow(harvests ?? []), [harvests]);

  // Öll virk ráð allra ræktana, merkt sinni ræktun.
  const tagged = useMemo<TaggedInsight[]>(() => {
    const out: TaggedInsight[] = [];
    for (const grow of activeGrows) {
      const itsPlants = plantsByGrow.get(grow.id) ?? [];
      const itsLogs = logsByGrow.get(grow.id) ?? [];
      const itsHarvests = harvestsByGrow.get(grow.id) ?? [];
      const insights = computeInsights({
        grow,
        plants: itsPlants,
        logs: itsLogs,
        harvests: itsHarvests,
        now,
        month,
      });
      for (const insight of insights) {
        out.push({ insight, growId: grow.id, growName: grow.name });
      }
    }
    return out;
  }, [activeGrows, plantsByGrow, logsByGrow, harvestsByGrow, now, month]);

  const dueAndSoon = useMemo(
    () =>
      tagged.filter(
        (t) => t.insight.severity === 'due' || t.insight.severity === 'soon',
      ),
    [tagged],
  );
  const infoCount = tagged.length - dueAndSoon.length;

  // Uppskeruspá yfir allar virkar plöntur.
  const allPlants = useMemo(
    () => activeGrows.flatMap((g) => plantsByGrow.get(g.id) ?? []),
    [activeGrows, plantsByGrow],
  );
  const predictions = useMemo(() => {
    const getVariety = (p: Plant) =>
      varietyById(p.varietyId) ?? varietyByName(p.variety);
    return predictForPlants(allPlants, getVariety, now).slice(0, 8);
  }, [allPlants, now]);

  async function buildReport() {
    if (building) return;
    setBuilding(true);
    setBuildError(null);
    try {
      const context = activeGrows
        .map((grow) =>
          [
            `## ${grow.name}`,
            buildContextDigest({
              grow,
              plants: plantsByGrow.get(grow.id) ?? [],
              logs: logsByGrow.get(grow.id) ?? [],
              harvests: harvestsByGrow.get(grow.id) ?? [],
              now,
              month,
            }),
          ].join('\n'),
        )
        .join('\n\n');

      // Heildaruppskera síðustu 7 daga (g).
      const weekAgo = now - 7 * DAY_MS;
      const weekHarvestG = (harvests ?? [])
        .filter((h) => h.timestamp >= weekAgo)
        .reduce((sum, h) => sum + (h.weightG || 0), 0);

      const prompt = [
        'Þú ert Rós, hlý og hnitmiðuð vinkona ræktandans. Búðu til vikuskýrslu á íslensku',
        'út frá samhengi allra ræktana hér að neðan. Skilaðu Markdown með nákvæmlega þessum',
        'köflum og fyrirsögnum (feitletruðum):',
        '',
        '**Yfirlit vikunnar**',
        '**Það sem gengur vel**',
        '**Áhyggjuefni**',
        '**Næsta vika — forgangslisti** (númeraður listi)',
        '',
        `Heildaruppskera síðustu 7 daga: ${weekHarvestG} g.`,
        '',
        'Samhengi ræktana:',
        context,
      ].join('\n');

      const text = (
        await askRos({ messages: [{ role: 'user', text: prompt }] })
      ).trim();
      if (!text) throw new Error('Rós skilaði engri skýrslu. Reyndu aftur.');

      const report: RosReport = {
        id: newId(),
        createdAt: Date.now(),
        periodDays: 7,
        text,
      };
      await db.rosReports.add(report);
    } catch (err) {
      setBuildError(
        err instanceof Error && err.message
          ? err.message
          : 'Rós náði ekki að búa til skýrslu. Reyndu aftur síðar.',
      );
    } finally {
      setBuilding(false);
    }
  }

  async function deleteReport(id: string) {
    await db.rosReports.delete(id);
  }

  return {
    dueAndSoon,
    infoCount,
    predictions,
    reports,
    building,
    buildError,
    buildReport,
    deleteReport,
  };
}
