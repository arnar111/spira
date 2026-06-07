/**
 * Markgildi umhverfis eftir fasa (3.3) — innidyra hita- og rakabönd fyrir
 * aldinplöntur (paprika/tómatur/jarðarber). Hreint gagnatöflu-módúl: engin
 * köllun á klukku/IO, allt prófanlegt.
 *
 * Heimildir: ræktunarleiðbeiningar appsins (Steinunn-tómatur og dagshlutlaus
 * jarðarber í `varieties.ts`) ásamt almennum viðmiðum fyrir Capsicum/Solanum
 * innandyra: spírun heitust (24–28°C), vöxtur 20–26°C, blómgun aðeins svalari
 * (18–24°C) til að halda í blóm; raki hár við spírun, lægri á aldinfasa til að
 * verjast grámyglu. Þessi bönd nýtast bæði í Umhverfis-síðu/GrowDetail og
 * reglu-vél Rósar (3.4).
 */

import type { GrowPhase } from '@/lib/db';

/** Lokað bil [min, max]. */
export interface Band {
  min: number;
  max: number;
}

/** Hita- og rakabönd fyrir einn fasa. */
export interface EnvTarget {
  tempC: Band;
  humidityPct: Band;
  /** Stutt íslensk skýring á af hverju þetta band gildir. */
  note: string;
}

/**
 * Fasa-bundin markgildi. Fasar án sérstaks gildis (skipulag, dvali, lokið)
 * falla á `DEFAULT_TARGET`.
 */
const TARGETS: Partial<Record<GrowPhase, EnvTarget>> = {
  germinating: {
    tempC: { min: 24, max: 28 },
    humidityPct: { min: 65, max: 80 },
    note: 'Spírun vill hlýtt og rakt — heitur, rakur reitur flýtir og jafnar spírun.',
  },
  seedling: {
    tempC: { min: 20, max: 26 },
    humidityPct: { min: 60, max: 75 },
    note: 'Ungplöntur þola ekki þurrk; haltu hlýju og hóflega röku.',
  },
  vegetative: {
    tempC: { min: 20, max: 26 },
    humidityPct: { min: 50, max: 70 },
    note: 'Vöxtur gengur best í 20–26°C og 50–70% raka.',
  },
  flowering: {
    tempC: { min: 18, max: 24 },
    humidityPct: { min: 50, max: 65 },
    note: 'Svalara á blómgun heldur í blómin; of hár raki/hiti fellir þau.',
  },
  fruiting: {
    tempC: { min: 18, max: 24 },
    humidityPct: { min: 50, max: 60 },
    note: 'Lægri raki á aldinfasa ver gegn grámyglu og sprungum.',
  },
  ripening: {
    tempC: { min: 18, max: 24 },
    humidityPct: { min: 50, max: 60 },
    note: 'Jafn hiti og hóflegur raki gefur jafnan þroska.',
  },
  harvest: {
    tempC: { min: 18, max: 24 },
    humidityPct: { min: 50, max: 60 },
    note: 'Haltu stöðugu umhverfi meðan tínt er.',
  },
};

/** Almennt fallband fyrir fasa án sérstaks gildis. */
export const DEFAULT_TARGET: EnvTarget = {
  tempC: { min: 18, max: 26 },
  humidityPct: { min: 50, max: 70 },
  note: 'Almennt þægindabil innandyra.',
};

/** Markgildi fyrir tiltekinn fasa (fellur á DEFAULT_TARGET). */
export function envTargetForPhase(phase: GrowPhase): EnvTarget {
  return TARGETS[phase] ?? DEFAULT_TARGET;
}

/** Staða mælingar gagnvart bandi. */
export type BandStatus = 'low' | 'in' | 'high';

/** Metur hvort gildi sé undir/innan/yfir bandi. */
export function bandStatus(value: number, band: Band): BandStatus {
  if (value < band.min) return 'low';
  if (value > band.max) return 'high';
  return 'in';
}

/** Snyrtilegt íslenskt band, t.d. „20–26°C". */
export function formatBand(band: Band, unit: string): string {
  return `${band.min}–${band.max}${unit}`;
}

/** Íslensk lýsing á stöðu (fyrir hnippi/aðvörun). */
export function statusLabel(status: BandStatus): string {
  switch (status) {
    case 'in':
      return 'innan marka';
    case 'low':
      return 'undir marki';
    case 'high':
      return 'yfir marki';
  }
}
