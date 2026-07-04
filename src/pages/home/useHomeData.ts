import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Grow, type Plant } from '@/lib/db';
import { computeInsights } from '@/lib/ros/engine';
import type { RosInsight } from '@/lib/ros/types';
import {
  cycleProgress,
  daysSince,
  getPhaseForDay,
  growStageDay,
  timelineForCategory,
  type CropTimeline,
} from '@/lib/phases';

export interface DerivedGrow extends Grow {
  day: number;
  stageDay: number;
  progress: number;
  phaseObj: CropTimeline['phases'][number];
  timeline: CropTimeline;
}

/** Aðkallandi verk dagsins á heimaskjánum (5.x) — ráð Rósar með ræktunarmerki. */
export interface HomeAgendaItem {
  growId: string;
  growName: string;
  insight: RosInsight;
}

/** Sameiginleg props fyrir farsíma-/skjáborðsútgáfurnar af heimaskjánum. */
export interface ViewProps {
  active: DerivedGrow[];
  plants: Plant[];
  archivedCount: number;
  agenda: HomeAgendaItem[];
}

export function deriveGrow(g: Grow, plants: Plant[]): DerivedGrow {
  const day = daysSince(g.startDate);
  const gp = plants.filter((p) => p.growId === g.id);
  const timeline = timelineForCategory(g.category);
  const stageDay = growStageDay(g.startDate, gp, timeline);
  return {
    ...g,
    day,
    stageDay,
    progress: cycleProgress(stageDay, timeline.totalDays),
    phaseObj: getPhaseForDay(stageDay, timeline.phases),
    timeline,
  };
}

interface HomeData {
  loading: boolean;
  plants: Plant[];
  active: DerivedGrow[];
  archivedCount: number;
  agenda: HomeAgendaItem[];
}

/** Hve mörg verk birtast á heimaskjánum í mesta lagi. */
const AGENDA_LIMIT = 5;

/**
 * Sækir ræktanir + plöntur úr IndexedDB og leiðir út afleidd gögn fyrir
 * heimaskjáinn — þar með talið „Í dag": aðkallandi (due/soon) ráð Rósar úr
 * öllum virkum ræktunum, svo forsíðan svari „hvað þarf ég að gera núna?"
 * án viðkomu á /ros. Á meðan hleðsla stendur er `loading` satt og hin gildin tóm.
 */
export function useHomeData(): HomeData {
  const grows = useLiveQuery(() => db.grows.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());
  const logs = useLiveQuery(() => db.logs.toArray());
  const harvests = useLiveQuery(() => db.harvests.toArray());

  const loading =
    grows === undefined ||
    plants === undefined ||
    logs === undefined ||
    harvests === undefined;
  if (loading) {
    return { loading: true, plants: [], active: [], archivedCount: 0, agenda: [] };
  }

  const activeGrows = grows.filter((g) => !g.archived);
  const active = activeGrows.map((g) => deriveGrow(g, plants));
  const archivedCount = grows.filter((g) => g.archived).length;

  const now = Date.now();
  const month = new Date(now).getMonth() + 1;
  const agenda: HomeAgendaItem[] = [];
  for (const g of activeGrows) {
    const insights = computeInsights({
      grow: g,
      plants: plants.filter((p) => p.growId === g.id),
      logs: logs.filter((l) => l.growId === g.id),
      harvests: harvests.filter((h) => h.growId === g.id),
      now,
      month,
    });
    for (const insight of insights) {
      if (insight.severity === 'info') continue;
      agenda.push({ growId: g.id, growName: g.name, insight });
    }
  }
  // Aðkallandi (due) fyrst, svo soon — röð vélarinnar helst innan hvers flokks.
  agenda.sort(
    (a, b) =>
      (a.insight.severity === 'due' ? 0 : 1) - (b.insight.severity === 'due' ? 0 : 1),
  );

  return {
    loading: false,
    plants,
    active,
    archivedCount,
    agenda: agenda.slice(0, AGENDA_LIMIT),
  };
}
