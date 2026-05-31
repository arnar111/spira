import type { PhaseInfo } from '@/components/ui/PhaseBar';
import type { GrowPhase, Plant, PlantCategory } from '@/lib/db';

/**
 * Per-crop grow-cycle timelines. The phase *display* timeline differs by crop —
 * peppers run ~140 days and end in "Aldin/Uppskera", while potatoes run ~115
 * days through "Niðursetning → Hreyking → Hnýði → Uppskera". `timelineForCategory`
 * picks the right one; unknown categories fall back to the pepper timeline.
 */
export interface CropTimeline {
  phases: PhaseInfo[];
  totalDays: number;
  /** Typical day on this timeline for each grow phase (drives the phase bar). */
  phaseToDay: Record<GrowPhase, number>;
}

const PEPPER_TIMELINE: CropTimeline = {
  phases: [
    { name: 'spírun', label: 'Spírun', startDay: 0, color: '#9fbf9d' },
    { name: 'seedling', label: 'Plöntu', startDay: 14, color: '#739f73' },
    { name: 'veg', label: 'Veg', startDay: 30, color: '#548255' },
    { name: 'flower', label: 'Blómgun', startDay: 75, color: '#cf846a' },
    { name: 'fruit', label: 'Aldin', startDay: 95, color: '#ef5a3c' },
    { name: 'harvest', label: 'Uppskera', startDay: 130, color: '#c92f17' },
  ],
  totalDays: 140,
  phaseToDay: {
    planning: 0,
    germinating: 0,
    seedling: 14,
    vegetative: 30,
    flowering: 75,
    fruiting: 95,
    ripening: 112,
    harvest: 130,
    overwintering: 130,
    dormant: 0,
    finished: 140,
  },
};

const TOMATO_TIMELINE: CropTimeline = {
  phases: [
    { name: 'spírun', label: 'Spírun', startDay: 0, color: '#9fbf9d' },
    { name: 'seedling', label: 'Plöntu', startDay: 12, color: '#739f73' },
    { name: 'veg', label: 'Veg', startDay: 26, color: '#548255' },
    { name: 'flower', label: 'Blómgun', startDay: 48, color: '#cf846a' },
    { name: 'fruit', label: 'Aldin', startDay: 64, color: '#ef5a3c' },
    { name: 'harvest', label: 'Uppskera', startDay: 78, color: '#c92f17' },
  ],
  totalDays: 85,
  phaseToDay: {
    planning: 0,
    germinating: 0,
    seedling: 12,
    vegetative: 26,
    flowering: 48,
    fruiting: 64,
    ripening: 72,
    harvest: 78,
    overwintering: 78,
    dormant: 0,
    finished: 85,
  },
};

const STRAWBERRY_TIMELINE: CropTimeline = {
  phases: [
    { name: 'planta', label: 'Gróðursetn.', startDay: 0, color: '#9fbf9d' },
    { name: 'veg', label: 'Vöxtur', startDay: 14, color: '#548255' },
    { name: 'flower', label: 'Blómgun', startDay: 35, color: '#cf846a' },
    { name: 'fruit', label: 'Aldin', startDay: 55, color: '#ef5a3c' },
    { name: 'harvest', label: 'Uppskera', startDay: 72, color: '#c92f17' },
  ],
  totalDays: 90,
  phaseToDay: {
    planning: 0,
    germinating: 0,
    seedling: 14,
    vegetative: 20,
    flowering: 35,
    fruiting: 55,
    ripening: 66,
    harvest: 72,
    overwintering: 82,
    dormant: 0,
    finished: 90,
  },
};

const POTATO_TIMELINE: CropTimeline = {
  phases: [
    { name: 'planta', label: 'Niðursetn.', startDay: 0, color: '#9fbf9d' },
    { name: 'sprout', label: 'Spírun', startDay: 18, color: '#739f73' },
    { name: 'hill', label: 'Hreyking', startDay: 35, color: '#548255' },
    { name: 'flower', label: 'Blómgun', startDay: 60, color: '#cf846a' },
    { name: 'tuber', label: 'Hnýði', startDay: 80, color: '#c89938' },
    { name: 'harvest', label: 'Uppskera', startDay: 100, color: '#c92f17' },
  ],
  totalDays: 115,
  phaseToDay: {
    planning: 0,
    germinating: 10,
    seedling: 18,
    vegetative: 35,
    flowering: 60,
    fruiting: 80,
    ripening: 92,
    harvest: 100,
    overwintering: 115,
    dormant: 0,
    finished: 115,
  },
};

const TIMELINES: Partial<Record<PlantCategory, CropTimeline>> = {
  pepper: PEPPER_TIMELINE,
  tomato: TOMATO_TIMELINE,
  strawberry: STRAWBERRY_TIMELINE,
  potato: POTATO_TIMELINE,
};

/** The grow-cycle timeline for a crop category (pepper timeline by default). */
export function timelineForCategory(category?: PlantCategory): CropTimeline {
  return (category && TIMELINES[category]) || PEPPER_TIMELINE;
}

/** Back-compat: the pepper timeline was the only one before per-crop timelines. */
export const PHASES: PhaseInfo[] = PEPPER_TIMELINE.phases;
export const TOTAL_CYCLE_DAYS = PEPPER_TIMELINE.totalDays;
export const PHASE_TO_DAY: Record<GrowPhase, number> = PEPPER_TIMELINE.phaseToDay;

export function getPhaseForDay(day: number, phases: PhaseInfo[] = PHASES): PhaseInfo {
  let current = phases[0];
  for (const p of phases) {
    if (day >= p.startDay) current = p;
  }
  return current;
}

export function daysSince(startMs: number): number {
  return Math.max(0, Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24)));
}

export function cycleProgress(day: number, totalDays: number = TOTAL_CYCLE_DAYS): number {
  return Math.max(0, Math.min(1, day / totalDays));
}

export function phaseToDay(
  phase: GrowPhase,
  map: Record<GrowPhase, number> = PHASE_TO_DAY,
): number {
  return map[phase] ?? 0;
}

/**
 * Staða framvindustiku — endurspeglar VAXTARSTIG plöntunnar, ekki bara
 * dagatalsaldur ræktunarinnar. Notar lengst komna virka plöntu, en aldrei
 * minna en dagatalsaldur, svo:
 *  - splunkuný ræktun með blómstrandi plöntum sýnir blómgun, og
 *  - ræktun án handvirkra fasabreytinga færist samt áfram með tímanum.
 *
 * Tímalína (per flokki) ræður dag-vörpun fasa; sjálfgefið er pipar-tímalínan.
 */
export function growStageDay(
  startDate: number,
  plants: Plant[],
  timeline: CropTimeline = PEPPER_TIMELINE,
): number {
  const calendarDay = daysSince(startDate);
  let phaseDay = 0;
  for (const p of plants) {
    if (p.archived) continue;
    phaseDay = Math.max(phaseDay, phaseToDay(p.currentPhase, timeline.phaseToDay));
  }
  return Math.max(calendarDay, phaseDay);
}
