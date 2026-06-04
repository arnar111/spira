/**
 * Rós — uppskeruspá (harvest prediction).
 *
 * Hönnunarreglur (sömu og reglu-vélin):
 *  - HREINAR fallgerðir: engin bein köllun á Date.now() / Math.random() inni.
 *    'now' (epoch-ms) berst alltaf inn sem rök.
 *  - Þolið gagnvart vantandi dagsetningum og afbrigðum.
 *  - Deterministískt — sama inntak gefur alltaf sömu spá.
 *
 * Spáin notar `daysToHarvest` glugga afbrigðisins (lágmark→hámark dagar frá byrjun)
 * og besta upphafsdag plöntu (spírun > sáning > stofnun) til að áætla hvenær
 * uppskeruglugginn opnast og lokast.
 */

import type { Plant, VarietyPreset } from '@/lib/db';

const DAY_MS = 86_400_000;

/** Fasar þar sem uppskeruspá á ekki við (engin virk vaxtarlota). */
const NON_PREDICTABLE_PHASES: ReadonlySet<Plant['currentPhase']> =
  new Set<Plant['currentPhase']>(['finished', 'dormant', 'overwintering', 'planning']);

/** Klippa tölu á bilið [0, 1]. */
function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Besta upphafsdagsetning til að mæla aldur plöntu (spírun > sáning > stofnun). */
function plantStartTs(p: Plant): number {
  return p.germinatedDate ?? p.sowDate ?? p.createdAt;
}

/**
 * Spá um uppskeruglugga einnar plöntu.
 *  - `windowStart`/`windowEnd`: epoch-ms þegar glugginn opnast/lokast.
 *  - `daysUntilStart`/`daysUntilEnd`: heilir dagar þar til (neikvætt = liðið).
 *  - `progress`: framvinda 0–1 að upphafi gluggans.
 */
export interface HarvestPrediction {
  plantId: string;
  windowStart: number;
  windowEnd: number;
  daysUntilStart: number;
  daysUntilEnd: number;
  progress: number;
}

/**
 * Reiknar uppskeruglugga fyrir eina plöntu út frá afbrigði og 'now'.
 * Skilar null þegar ekki er hægt að spá:
 *  - plantan er geymd (archived),
 *  - ekkert afbrigði eða afbrigðið hefur ekki `daysToHarvest`,
 *  - plantan er í fasa þar sem spá á ekki við (lokið/dvali/vetrardvali/skipulag).
 */
export function predictHarvestWindow(
  plant: Plant,
  variety: VarietyPreset | undefined,
  now: number,
): HarvestPrediction | null {
  if (plant.archived) return null;
  if (!variety || !variety.daysToHarvest) return null;
  if (NON_PREDICTABLE_PHASES.has(plant.currentPhase)) return null;

  const start = plantStartTs(plant);
  const [minDays, maxDays] = variety.daysToHarvest;
  const windowStart = start + minDays * DAY_MS;
  const windowEnd = start + maxDays * DAY_MS;

  const daysUntilStart = Math.ceil((windowStart - now) / DAY_MS);
  const daysUntilEnd = Math.ceil((windowEnd - now) / DAY_MS);

  // Vörn gegn deilingu með núlli (minDays === 0): teljum framvindu fulla.
  const span = windowStart - start;
  const progress = span <= 0 ? 1 : clamp01((now - start) / span);

  return {
    plantId: plant.id,
    windowStart,
    windowEnd,
    daysUntilStart,
    daysUntilEnd,
    progress,
  };
}

/** Uppskeruspá fyrir eina plöntu ásamt plöntunni sjálfri (fyrir yfirlit). */
export interface GrowHarvestOutlook {
  prediction: HarvestPrediction;
  plant: Plant;
}

/**
 * Reiknar uppskeruspár fyrir lista af plöntum.
 * `getVariety` skilar afbrigði hverrar plöntu (eða undefined).
 * Skilar aðeins plöntum sem spá fékkst fyrir, raðað eftir `daysUntilStart`
 * vaxandi (það sem styst er í fyrst — liðnir gluggar lenda fremst).
 */
export function predictForPlants(
  plants: Plant[],
  getVariety: (p: Plant) => VarietyPreset | undefined,
  now: number,
): GrowHarvestOutlook[] {
  const out: GrowHarvestOutlook[] = [];
  for (const p of plants) {
    const prediction = predictHarvestWindow(p, getVariety(p), now);
    if (prediction) out.push({ prediction, plant: p });
  }
  out.sort((a, b) => a.prediction.daysUntilStart - b.prediction.daysUntilStart);
  return out;
}
