import type { PhaseInfo } from '@/components/ui/PhaseBar';
import type { GrowPhase, Plant } from '@/lib/db';

export const PHASES: PhaseInfo[] = [
  { name: 'spírun', label: 'Spírun', startDay: 0, color: '#9fbf9d' },
  { name: 'seedling', label: 'Plöntu', startDay: 14, color: '#739f73' },
  { name: 'veg', label: 'Veg', startDay: 30, color: '#548255' },
  { name: 'flower', label: 'Blómgun', startDay: 75, color: '#cf846a' },
  { name: 'fruit', label: 'Aldin', startDay: 95, color: '#ef5a3c' },
  { name: 'harvest', label: 'Uppskera', startDay: 130, color: '#c92f17' },
];

export const TOTAL_CYCLE_DAYS = 140;

export function getPhaseForDay(day: number): PhaseInfo {
  let current = PHASES[0];
  for (const p of PHASES) {
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

/** Dæmigerður dagur á hringrásar-tímalínunni fyrir hvern vaxtarfasa plöntu. */
export const PHASE_TO_DAY: Record<GrowPhase, number> = {
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
};

export function phaseToDay(phase: GrowPhase): number {
  return PHASE_TO_DAY[phase] ?? 0;
}

/**
 * Staða framvindustiku — endurspeglar VAXTARSTIG plöntunnar, ekki bara
 * dagatalsaldur ræktunarinnar. Notar lengst komna virka plöntu, en aldrei
 * minna en dagatalsaldur, svo:
 *  - splunkuný ræktun með blómstrandi plöntum sýnir blómgun, og
 *  - ræktun án handvirkra fasabreytinga færist samt áfram með tímanum.
 */
export function growStageDay(startDate: number, plants: Plant[]): number {
  const calendarDay = daysSince(startDate);
  let phaseDay = 0;
  for (const p of plants) {
    if (p.archived) continue;
    phaseDay = Math.max(phaseDay, phaseToDay(p.currentPhase));
  }
  return Math.max(calendarDay, phaseDay);
}
