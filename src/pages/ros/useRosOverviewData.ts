import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  newId,
  type Plant,
  type PhotoBlob,
  type RosAssessment,
  type RosReport,
} from '@/lib/db';
import { computeInsights, buildContextDigest } from '@/lib/ros/engine';
import type { RosInsight, RosInsightKind } from '@/lib/ros/types';
import { askRos } from '@/lib/ros/chat';
import { predictForPlants, type GrowHarvestOutlook } from '@/lib/ros/predict';
import { estimateGrowYield, type GrowYieldEstimate } from '@/lib/ros/yield';
import { yieldByVariety, type VarietyYield } from '@/lib/harvestStats';
import { varietyById, varietyByName } from '@/lib/varieties';
import { SUGGESTION_BY_KIND, FALLBACK_SUGGESTION } from '@/components/ros/rosWindowState';

const DAY_MS = 1000 * 60 * 60 * 24;

/** Innsýn merkt sinni ræktun svo hægt sé að birta nafn og fletta á réttan stað. */
export interface TaggedInsight {
  insight: RosInsight;
  growId: string;
  growName: string;
}

/** Heildaruppskerumat + sundurliðun per ræktun (eftirstöðvar, bil í g). */
export interface YieldOverview {
  total: GrowYieldEstimate;
  /** Ein færsla per virk ræktun sem mat fékkst fyrir, mestar eftirstöðvar fyrst. */
  grows: { growId: string; growName: string; estimate: GrowYieldEstimate }[];
}

/** Nýjasta heilsuskor plöntu þvert á ræktanir + breyting frá fyrra mati. */
export interface HealthRow {
  plantId: string;
  growId: string;
  label: string;
  score: number | null;
  /** Breyting frá næstsíðasta mati: +1/0/-1 (eða null ef aðeins eitt mat). */
  trend: 1 | 0 | -1 | null;
}

/** Eitt verkefni framundan í 14-daga dagatalinu. */
export interface CalendarItem {
  id: string;
  growId: string;
  growName: string;
  title: string;
  kind: RosInsightKind;
  severity: 'due' | 'soon' | 'info';
  /** Dagar þar til (0 = í dag). */
  inDays: number;
}

/** Mynd síðustu viku ásamt samhengi til birtingar. */
export interface RecentPhoto {
  photo: PhotoBlob;
  growName: string;
}

/** Tillaga vikunnar — markviss spurning + ræktun til að spyrja í. */
export interface WeeklyQuestion {
  text: string;
  growId: string | null;
  growName: string | null;
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
  yieldOverview: YieldOverview;
  health: HealthRow[];
  calendar: CalendarItem[];
  varietyBoard: VarietyYield[];
  recentPhotos: RecentPhoto[];
  weeklyQuestion: WeeklyQuestion | null;
  reports: RosReport[] | undefined;
  building: boolean;
  buildError: string | null;
  buildReport: () => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

/** Forgangsröðun alvarleika fyrir „mesta áhyggjuefnið" (hærra = alvarlegra). */
const SEVERITY_RANK: Record<RosInsight['severity'], number> = { due: 2, soon: 1, info: 0 };

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
  const environment = useLiveQuery(() => db.environment.toArray());
  const assessments = useLiveQuery(() => db.rosAssessments.toArray());
  const photos = useLiveQuery(() => db.photos.toArray());
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
  const envByGrow = useMemo(() => groupByGrow(environment ?? []), [environment]);

  const getVariety = (p: Plant) => varietyById(p.varietyId) ?? varietyByName(p.variety);

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
  const predictions = useMemo(
    () => predictForPlants(allPlants, getVariety, now).slice(0, 8),
    [allPlants, now],
  );

  // 1) Væntanleg uppskera — mat per virk ræktun + heildartölur (eftirstöðvar).
  const yieldOverview = useMemo<YieldOverview>(() => {
    const perGrow: YieldOverview['grows'] = [];
    let lowG = 0;
    let highG = 0;
    let remainingLowG = 0;
    let remainingHighG = 0;
    for (const grow of activeGrows) {
      const itsPlants = plantsByGrow.get(grow.id) ?? [];
      const itsHarvests = harvestsByGrow.get(grow.id) ?? [];
      const itsLogs = logsByGrow.get(grow.id) ?? [];
      const itsEnv = envByGrow.get(grow.id);
      const estimate = estimateGrowYield(
        itsPlants,
        getVariety,
        (p) => itsHarvests.filter((h) => h.plantId === p.id),
        (p) => itsLogs.filter((l) => l.plantId === p.id),
        itsEnv,
        now,
      );
      lowG += estimate.lowG;
      highG += estimate.highG;
      remainingLowG += estimate.remainingLowG;
      remainingHighG += estimate.remainingHighG;
      if (estimate.plants.length > 0) {
        perGrow.push({ growId: grow.id, growName: grow.name, estimate });
      }
    }
    perGrow.sort((a, b) => b.estimate.remainingHighG - a.estimate.remainingHighG);
    return {
      total: { lowG, highG, remainingLowG, remainingHighG, plants: [] },
      grows: perGrow,
    };
  }, [activeGrows, plantsByGrow, harvestsByGrow, logsByGrow, envByGrow, now]);

  // 2) Heilsuyfirlit — nýjasta mat per plöntu (þvert á ræktanir) + breyting.
  const health = useMemo<HealthRow[]>(() => {
    const byPlant = new Map<string, RosAssessment[]>();
    for (const a of assessments ?? []) {
      const list = byPlant.get(a.plantId);
      if (list) list.push(a);
      else byPlant.set(a.plantId, [a]);
    }
    const plantById = new Map((plants ?? []).map((p) => [p.id, p] as const));
    const rows: HealthRow[] = [];
    for (const [plantId, list] of byPlant) {
      const plant = plantById.get(plantId);
      if (!plant || plant.archived) continue;
      list.sort((x, y) => y.createdAt - x.createdAt);
      const latest = list[0];
      const prev = list[1];
      let trend: HealthRow['trend'] = null;
      if (prev && latest.score !== null && prev.score !== null) {
        trend = latest.score > prev.score ? 1 : latest.score < prev.score ? -1 : 0;
      }
      rows.push({
        plantId,
        growId: plant.growId,
        label: plant.nickname || plant.variety,
        score: latest.score,
        trend,
      });
    }
    rows.sort((a, b) => (a.score ?? 99) - (b.score ?? 99));
    return rows;
  }, [assessments, plants]);

  // 3) Dagatal næstu 14 daga — verkefni úr reglu-vél. Uppskerugluggar eiga sinn
  // eigin kafla („Uppskeruspá"), svo við endurtökum þá EKKI hér.
  const calendar = useMemo<CalendarItem[]>(() => {
    const items: CalendarItem[] = [];
    for (const t of tagged) {
      const d = t.insight.dueInDays;
      if (d === undefined || d === null || d < 0 || d > 14) continue;
      items.push({
        id: `${t.growId}:${t.insight.id}`,
        growId: t.growId,
        growName: t.growName,
        title: t.insight.title,
        kind: t.insight.kind,
        severity: t.insight.severity,
        inDays: d,
      });
    }
    items.sort((a, b) => a.inDays - b.inDays || SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
    return items;
  }, [tagged]);

  // 4) Afbrigða-stigatafla — raun-uppskera þvert á ALLAR ræktanir (líka geymdar).
  const varietyBoard = useMemo(
    () => yieldByVariety(harvests ?? [], plants ?? []).slice(0, 8),
    [harvests, plants],
  );

  // 5) Mynda-vika — myndir síðustu 7 daga þvert á ræktanir, nýjastar fyrst.
  const recentPhotos = useMemo<RecentPhoto[]>(() => {
    const weekAgo = now - 7 * DAY_MS;
    const growName = new Map((grows ?? []).map((g) => [g.id, g.name] as const));
    return (photos ?? [])
      .filter((ph) => ph.takenAt >= weekAgo)
      .sort((a, b) => b.takenAt - a.takenAt)
      .map((photo) => ({ photo, growName: growName.get(photo.growId) ?? 'Ræktun' }));
  }, [photos, grows, now]);

  // 6) Spurning vikunnar — út frá alvarlegustu núverandi innsýn (offline).
  const weeklyQuestion = useMemo<WeeklyQuestion | null>(() => {
    if (activeGrows.length === 0) return null;
    let best: TaggedInsight | null = null;
    for (const t of tagged) {
      if (
        !best ||
        SEVERITY_RANK[t.insight.severity] > SEVERITY_RANK[best.insight.severity]
      ) {
        best = t;
      }
    }
    const text =
      (best && SUGGESTION_BY_KIND[best.insight.kind]) || FALLBACK_SUGGESTION;
    return {
      text,
      growId: best?.growId ?? activeGrows[0]?.id ?? null,
      growName: best?.growName ?? activeGrows[0]?.name ?? null,
    };
  }, [tagged, activeGrows]);

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
    yieldOverview,
    health,
    calendar,
    varietyBoard,
    recentPhotos,
    weeklyQuestion,
    reports,
    building,
    buildError,
    buildReport,
    deleteReport,
  };
}
