import type { PhaseInfo } from '@/components/ui/PhaseBar';

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
