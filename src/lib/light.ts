/**
 * Light planning helpers distilled from the indoor-Iceland guide (chapter 6).
 *
 * PPFD = photosynthetic photon flux density (µmol/m²/s) at the canopy.
 * DLI  = daily light integral (mol/m²/day) = PPFD × hours × 3600 ÷ 1,000,000.
 */

export interface LightStage {
  id: 'seedling' | 'veg' | 'flower';
  label: string;
  ppfdMin: number;
  ppfdMax: number;
}

export const LIGHT_STAGES: LightStage[] = [
  { id: 'seedling', label: 'Plöntu', ppfdMin: 200, ppfdMax: 400 },
  { id: 'veg', label: 'Vöxtur', ppfdMin: 400, ppfdMax: 600 },
  { id: 'flower', label: 'Blóm & aldin', ppfdMin: 600, ppfdMax: 900 },
];

/** Optimal DLI window for fruiting crops like chili (guide: 20–30, fruiting ~32). */
export const DLI_TARGET_MIN = 20;
export const DLI_TARGET_MAX = 30;
const DLI_HARD_MAX = 32;

export type Verdict = 'low' | 'ok' | 'high';

export function dli(ppfd: number, hours: number): number {
  return (ppfd * hours * 3600) / 1_000_000;
}

export function ppfdVerdict(stage: LightStage, ppfd: number): Verdict {
  if (ppfd < stage.ppfdMin) return 'low';
  if (ppfd > stage.ppfdMax) return 'high';
  return 'ok';
}

export function dliVerdict(value: number): Verdict {
  if (value < DLI_TARGET_MIN) return 'low';
  if (value > DLI_HARD_MAX) return 'high';
  return 'ok';
}

/** Hours of light needed to hit a target DLI at a given PPFD. */
export function hoursForDli(ppfd: number, targetDli: number): number {
  if (ppfd <= 0) return 0;
  return (targetDli * 1_000_000) / (ppfd * 3600);
}
