import {
  isPepper,
  type MotherSpecies,
  type PepperColor,
  type Variety,
} from '@/lib/varieties';

/**
 * Hrein síun á afbrigðum fyrir SetupWizard (4.4 — dregið út úr StepVarieties).
 * Engin React-háðni svo hægt sé að prófa þetta beint.
 */

export type ShuTier = 'all' | 'mild' | 'medium' | 'hot' | 'super';

export const SHU_TIERS: { id: ShuTier; label: string; min: number; max: number }[] = [
  { id: 'all', label: 'Allir', min: 0, max: Infinity },
  { id: 'mild', label: '< 5k SHU', min: 0, max: 4999 },
  { id: 'medium', label: '5k–100k', min: 5000, max: 99999 },
  { id: 'hot', label: '100k–500k', min: 100000, max: 499999 },
  { id: 'super', label: '500k+', min: 500000, max: Infinity },
];

export interface VarietyFilters {
  filterMother: MotherSpecies | 'all';
  filterColor: PepperColor | 'all';
  shuTier: ShuTier;
}

/**
 * Síar afbrigðalista eftir móðurtegund/lit/SHU. Aðeins piparafbrigði bera
 * þessar síur; önnur afbrigði (tómatar o.fl.) sjást aðeins þegar engin
 * pipar-sía er virk — sama hegðun og upprunalega StepVarieties.
 */
export function filterVarieties(
  varieties: Variety[],
  { filterMother, filterColor, shuTier }: VarietyFilters,
): Variety[] {
  const noPepperFilter =
    filterMother === 'all' && filterColor === 'all' && shuTier === 'all';
  const tier = SHU_TIERS.find((t) => t.id === shuTier) ?? SHU_TIERS[0];
  return varieties.filter((v) => {
    if (!isPepper(v)) return noPepperFilter;
    if (filterMother !== 'all' && v.motherSpecies !== filterMother) return false;
    if (filterColor !== 'all' && v.color !== filterColor) return false;
    if (!(v.shu >= tier.min && v.shu <= tier.max)) return false;
    return true;
  });
}

/** Móðurtegundir sem koma fyrir meðal piparafbrigða listans. */
export function availableMothers(varieties: Variety[]): MotherSpecies[] {
  return Array.from(new Set(varieties.filter(isPepper).map((v) => v.motherSpecies)));
}

/** Litir sem koma fyrir meðal piparafbrigða listans. */
export function availableColors(varieties: Variety[]): PepperColor[] {
  return Array.from(new Set(varieties.filter(isPepper).map((v) => v.color)));
}
