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
 *
 * EC-bönd (leiðni næringarlausnar, mS/cm): íhaldssöm samnefnari yfir
 * umhirðukort vörulistans (jarðarber „Veg 1,2–1,5 · aldin 1,5–2,0", tómatur
 * „Veg 1,8–2,4 · aldin 2,0–3,0") — ungplöntur vægast, hækkar með aldinfasa.
 * Kryddjurtir/lauf fá eigin mildari snið gegnum valkvæða `category`-viðbót
 * í `envTargetForPhase` — án flokks er hegðunin óbreytt frá fyrri útgáfu.
 */

import type { GrowPhase, PlantCategory } from '@/lib/db';

/** Lokað bil [min, max]. */
export interface Band {
  min: number;
  max: number;
}

/** Hita-, raka- og (valkvætt) leiðnibönd fyrir einn fasa. */
export interface EnvTarget {
  tempC: Band;
  humidityPct: Band;
  /** Ráðlögð leiðni næringarlausnar (EC, mS/cm) — valkvætt eftir fasa. */
  ec?: Band;
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
    ec: { min: 0.8, max: 1.4 },
    note: 'Spírun vill hlýtt og rakt — heitur, rakur reitur flýtir og jafnar spírun.',
  },
  seedling: {
    tempC: { min: 20, max: 26 },
    humidityPct: { min: 60, max: 75 },
    ec: { min: 0.8, max: 1.4 },
    note: 'Ungplöntur þola ekki þurrk; haltu hlýju og hóflega röku.',
  },
  vegetative: {
    tempC: { min: 20, max: 26 },
    humidityPct: { min: 50, max: 70 },
    ec: { min: 1.2, max: 2.0 },
    note: 'Vöxtur gengur best í 20–26°C og 50–70% raka.',
  },
  flowering: {
    tempC: { min: 18, max: 24 },
    humidityPct: { min: 50, max: 65 },
    ec: { min: 1.4, max: 2.4 },
    note: 'Svalara á blómgun heldur í blómin; of hár raki/hiti fellir þau.',
  },
  fruiting: {
    tempC: { min: 18, max: 24 },
    humidityPct: { min: 50, max: 60 },
    ec: { min: 1.6, max: 2.4 },
    note: 'Lægri raki á aldinfasa ver gegn grámyglu og sprungum.',
  },
  ripening: {
    tempC: { min: 18, max: 24 },
    humidityPct: { min: 50, max: 60 },
    ec: { min: 1.6, max: 2.4 },
    note: 'Jafn hiti og hóflegur raki gefur jafnan þroska.',
  },
  harvest: {
    tempC: { min: 18, max: 24 },
    humidityPct: { min: 50, max: 60 },
    ec: { min: 1.6, max: 2.4 },
    note: 'Haltu stöðugu umhverfi meðan tínt er.',
  },
};

/** Almennt fallband fyrir fasa án sérstaks gildis. */
export const DEFAULT_TARGET: EnvTarget = {
  tempC: { min: 18, max: 26 },
  humidityPct: { min: 50, max: 70 },
  note: 'Almennt þægindabil innandyra.',
};

// — Kryddjurtir (herb): mildara snið — hóflegur hiti, þurrara loft, væg næring.
const HERB_TARGETS: Partial<Record<GrowPhase, EnvTarget>> = {
  germinating: {
    tempC: { min: 20, max: 26 },
    humidityPct: { min: 60, max: 75 },
    ec: { min: 0.8, max: 1.2 },
    note: 'Kryddjurtafræ spíra best í hlýju og röku — lækkaðu rakann eftir spírun.',
  },
  seedling: {
    tempC: { min: 18, max: 24 },
    humidityPct: { min: 50, max: 65 },
    ec: { min: 0.8, max: 1.4 },
    note: 'Ungar kryddjurtir vilja hlýju en þola ekki blautt, kyrrt loft.',
  },
};

/** Fallgildi kryddjurta fyrir aðra fasa (vöxtur/uppskera o.s.frv.). */
export const HERB_DEFAULT_TARGET: EnvTarget = {
  tempC: { min: 18, max: 24 },
  humidityPct: { min: 40, max: 60 },
  ec: { min: 1.0, max: 1.6 },
  note: 'Kryddjurtir vilja hóflegan hita, fremur þurrt loft og væga næringu.',
};

// — Laufgrænmeti (leafy): eins og kryddjurtir en þolir aðeins svalara.
const LEAFY_TARGETS: Partial<Record<GrowPhase, EnvTarget>> = {
  germinating: {
    tempC: { min: 18, max: 24 },
    humidityPct: { min: 60, max: 75 },
    ec: { min: 0.8, max: 1.2 },
    note: 'Salat og lauf spíra vel við stofuhita — svalara en aldinplöntur.',
  },
  seedling: {
    tempC: { min: 16, max: 22 },
    humidityPct: { min: 50, max: 65 },
    ec: { min: 0.8, max: 1.4 },
    note: 'Ungt lauf vex þétt og fallega í svala; hiti teygir og veikir það.',
  },
};

/** Fallgildi laufgrænmetis fyrir aðra fasa. */
export const LEAFY_DEFAULT_TARGET: EnvTarget = {
  tempC: { min: 16, max: 22 },
  humidityPct: { min: 40, max: 60 },
  ec: { min: 1.0, max: 1.6 },
  note: 'Laufgrænmeti þolir vel svala — hiti yfir bandi flýtir njólun og beiskju.',
};

/**
 * Markgildi fyrir tiltekinn fasa (fellur á DEFAULT_TARGET). Valkvæður
 * `category` velur mildara snið fyrir kryddjurtir/laufgrænmeti; án flokks
 * (eða fyrir aldinplöntur) er hegðunin nákvæmlega eins og áður.
 */
export function envTargetForPhase(phase: GrowPhase, category?: PlantCategory): EnvTarget {
  if (category === 'herb') return HERB_TARGETS[phase] ?? HERB_DEFAULT_TARGET;
  if (category === 'leafy') return LEAFY_TARGETS[phase] ?? LEAFY_DEFAULT_TARGET;
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
