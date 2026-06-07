/**
 * Rós — fasa-hraði (growth pace) miðað við afbrigðagluggann.
 *
 * Hönnunarreglur (sömu og predict.ts/reglu-vélin):
 *  - HREIN föll: `now` (epoch-ms) berst alltaf inn sem rök, engin klukka inni.
 *  - Deterministískt og þolið gagnvart vantandi gögnum.
 *
 * Markmið: bera saman raunaldur plöntu (frá besta upphafsdegi) við þann glugga
 * sem afbrigðið gefur upp (`daysToHarvest` = [lágmark, hámark] dagar að uppskeru)
 * — og segja HEIÐARLEGA hvort plantan er á undan/eftir áætlun. Við fullyrðum
 * bara „á undan/eftir" þegar fasinn styður það skýrt, annars „á áætlun".
 */

import type { Plant, GrowPhase } from '@/lib/db';

const DAY_MS = 86_400_000;

/** Besta upphafsdagsetning til að mæla aldur (spírun > sáning > stofnun) — sama og predict.ts. */
function plantStartTs(p: Plant): number {
  return p.germinatedDate ?? p.sowDate ?? p.createdAt;
}

/** Fasar þar sem plantan telst uppskerutilbúin (komin að/í uppskeru). */
const HARVEST_READY: ReadonlySet<GrowPhase> = new Set<GrowPhase>([
  'ripening',
  'harvest',
]);

/** Fasar þar sem ekki er marktækt að bera saman hraða (engin virk vaxtarlota). */
const NON_PACING: ReadonlySet<GrowPhase> = new Set<GrowPhase>([
  'planning',
  'overwintering',
  'dormant',
  'finished',
]);

export type PaceStatus = 'ahead' | 'behind' | 'onTrack';

export interface GrowthPace {
  /** Raunaldur plöntu í heilum dögum við `now`. */
  ageDays: number;
  /** Afbrigðagluggi [lágmark, hámark] dagar að uppskeru. */
  window: [number, number];
  status: PaceStatus;
  /**
   * Hve marga daga plantan er á undan/eftir áætlun (jákvætt = munur). Aðeins
   * sett þegar `status` er 'ahead' eða 'behind', annars null.
   */
  offsetDays: number | null;
}

/**
 * Reiknar fasa-hraða einnar plöntu miðað við afbrigðagluggann.
 * Skilar null þegar ekki er hægt að bera saman:
 *  - plantan er geymd (archived),
 *  - afbrigðið hefur engan `daysToHarvest` glugga,
 *  - plantan er í fasa þar sem samanburður á ekki við.
 *
 * Heiðarleg heuristík:
 *  - „á undan" aðeins ef plantan er ÞEGAR uppskerutilbúin og enn fyrir
 *    lágmarki gluggans (þroskaðist hraðar en dæmigert).
 *  - „á eftir" aðeins ef aldur er kominn fram yfir hámark gluggans EN plantan
 *    er ekki enn farin að mynda aldin/þroskast.
 *  - annars „á áætlun" (engin fullyrðing umfram aldur vs gluggi).
 */
export function plantPace(
  plant: Plant,
  window: [number, number] | undefined,
  now: number,
): GrowthPace | null {
  if (plant.archived) return null;
  if (!window) return null;
  if (NON_PACING.has(plant.currentPhase)) return null;

  const [minDays, maxDays] = window;
  const ageDays = Math.floor((now - plantStartTs(plant)) / DAY_MS);

  // Á undan: komin að uppskeru fyrir lágmark gluggans.
  if (HARVEST_READY.has(plant.currentPhase) && ageDays < minDays) {
    return { ageDays, window, status: 'ahead', offsetDays: minDays - ageDays };
  }

  // Á eftir: komin fram yfir hámark en ekki enn farin að mynda/þroska aldin.
  const developingFruit =
    plant.currentPhase === 'fruiting' ||
    plant.currentPhase === 'ripening' ||
    plant.currentPhase === 'harvest';
  if (ageDays > maxDays && !developingFruit) {
    return { ageDays, window, status: 'behind', offsetDays: ageDays - maxDays };
  }

  return { ageDays, window, status: 'onTrack', offsetDays: null };
}

/** Íslensk fleirtölu-/eintölumeðferð fyrir „dag(a)". */
function dayWord(n: number): string {
  return Math.abs(n) === 1 ? 'degi' : 'dögum';
}

/** Stutt íslensk lýsing á hraða-stöðu, eða null fyrir „á áætlun". */
export function paceLabel(pace: GrowthPace): string | null {
  if (pace.status === 'ahead' && pace.offsetDays !== null) {
    return `${pace.offsetDays} ${dayWord(pace.offsetDays)} á undan áætlun`;
  }
  if (pace.status === 'behind' && pace.offsetDays !== null) {
    return `${pace.offsetDays} ${dayWord(pace.offsetDays)} á eftir áætlun`;
  }
  return null;
}
