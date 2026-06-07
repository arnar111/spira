import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Grow, type Plant } from '@/lib/db';
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

/** Sameiginleg props fyrir farsíma-/skjáborðsútgáfurnar af heimaskjánum. */
export interface ViewProps {
  active: DerivedGrow[];
  plants: Plant[];
  archivedCount: number;
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
}

/**
 * Sækir ræktanir + plöntur úr IndexedDB og leiðir út afleidd gögn fyrir
 * heimaskjáinn. Á meðan hleðsla stendur er `loading` satt og hin gildin tóm.
 */
export function useHomeData(): HomeData {
  const grows = useLiveQuery(() => db.grows.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());

  const loading = grows === undefined || plants === undefined;
  if (loading) {
    return { loading: true, plants: [], active: [], archivedCount: 0 };
  }

  const active = grows.filter((g) => !g.archived).map((g) => deriveGrow(g, plants));
  const archivedCount = grows.filter((g) => g.archived).length;
  return { loading: false, plants, active, archivedCount };
}
