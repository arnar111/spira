/**
 * Rós — uppskerumat fyrir uppskeru (pre-harvest yield estimation).
 *
 * Rós getur spáð HVENÆR uppskera kemur (`predict.ts`); þetta áætlar HVE MIKIÐ.
 *
 * Líkanið — alls staðar sama mynstur:  fjöldi × eining­arþyngd × fasa-öryggi.
 *  - Eining­arþyngd: lærð úr tínslusögu (g/pod) ef hún er til, annars `fruitWeightG`
 *    afbrigðisins, annars stærðarflokks-sjálfgildi (`yieldBenchmarks.ts`).
 *  - Fjöldi: handvirk talning (mynd/skráning) ef til, annars fjöldaviðmið
 *    afbrigðis skalað eftir fasa.
 *  - Fasi þrengir/víkkar bilið: blómgun = vítt og óvisst; aldin/þroski = þrengra.
 *
 * Heiðarleikareglur:
 *  - Alltaf BIL (lágt–hátt), aldrei eitt gildi — við þykjumst ekki vita nákvæmlega.
 *  - Hallað NIÐUR fyrir íslenskar inniaðstæður (sjá `yieldBenchmarks.ts`).
 *  - `basis[]` útskýrir á íslensku hvað fóðraði matið — UI birtir það ORÐRÉTT
 *    svo notandinn sjái nákvæmlega hvers vegna talan er eins og hún er.
 *  - Þegar ekkert vit er í mati (kryddjurtir/lauf, skipulag, geymd planta) → null.
 *
 * Hönnunarreglur (sömu og predict.ts): HREINT (now berst inn), deterministískt,
 * þolið gagnvart vantandi gögnum.
 */

import type { EnvironmentSample, HarvestEntry, LogEntry, Plant } from '@/lib/db';
import type { Variety } from '@/lib/varieties';
import { isPepper, isPotato, isStrawberry, isTomato } from '@/lib/varieties';
import { logData } from '@/lib/logSchema';
import {
  NON_ESTIMABLE_CATEGORIES,
  PEPPER_BENCHMARKS,
  POTATO_BENCHMARKS,
  STRAWBERRY_ALPINE_G_PER_BERRY,
  STRAWBERRY_FRUIT_SET_RATE,
  STRAWBERRY_G_PER_BERRY,
  STRAWBERRY_G_PER_PLANT_SEASON,
  TOMATO_FRUITS_PER_TRUSS,
  TOMATO_G_PER_FRUIT,
  TOMATO_TRUSS_PER_DAY_AT_20C,
  TOMATO_TRUSS_PER_DAY_PER_DEG,
  TOMATO_TRUSS_TEMP_BAND,
  type PepperSizeClass,
  type PotatoMaturityClass,
  type Range,
  type TomatoSizeClass,
} from './yieldBenchmarks';

const DAY_MS = 86_400_000;

/** Hve gömul má pollinate-talning vera til að gilda sem manualCount (dagar). */
const MANUAL_COUNT_MAX_AGE_DAYS = 30;

/** Lágmark tínslna með pod-tölu til að lærður prior teljist sterkur. */
const STRONG_PRIOR_MIN_HARVESTS = 3;

/** Fasar þar sem uppskerumat á ekki við (sama og predict.ts). */
const NON_ESTIMABLE_PHASES: ReadonlySet<Plant['currentPhase']> =
  new Set<Plant['currentPhase']>(['finished', 'dormant', 'overwintering', 'planning']);

/** Traust matsins — birt í UI. */
export type YieldConfidence = 'lág' | 'miðlungs' | 'há';

/**
 * Uppskerumat einnar plöntu.
 *  - `lowG`/`highG`: heildaruppskera (þegar tínd + eftir) sem bil.
 *  - `remainingLowG`/`remainingHighG`: það sem á eftir að tína (klemmt við ≥ 0).
 *  - `harvestedG`: það sem þegar er tínt.
 *  - `basis`: stuttar íslenskar útskýringar sem UI birtir orðrétt.
 */
export interface PlantYieldEstimate {
  plantId: string;
  lowG: number;
  highG: number;
  remainingLowG: number;
  remainingHighG: number;
  harvestedG: number;
  confidence: YieldConfidence;
  basis: string[];
}

/** Uppskerumat heillar ræktunar — heildartölur + listi per plöntu. */
export interface GrowYieldEstimate {
  lowG: number;
  highG: number;
  remainingLowG: number;
  remainingHighG: number;
  plants: PlantYieldEstimate[];
}

/** Inntak fyrir `estimatePlantYield`. */
export interface PlantYieldInput {
  plant: Plant;
  variety: Variety | undefined;
  harvests: HarvestEntry[];
  logs: LogEntry[];
  envSamples?: EnvironmentSample[];
  /** Bein talning (mynd/skráning) — hefur forgang á viðmiðafjölda. */
  manualCount?: number;
  now: number;
}

// ————————————————————————————————————————————————————————————————
// Hjálparföll
// ————————————————————————————————————————————————————————————————

/** Klippa við lágmark 0. */
function clampLow(n: number): number {
  return n < 0 ? 0 : n;
}

/** Besta upphafsdagsetning til að mæla aldur plöntu (spírun > sáning > stofnun). */
function plantStartTs(p: Plant): number {
  return p.germinatedDate ?? p.sowDate ?? p.createdAt;
}

/** Snyrtir tölu fyrir birtingu (heiltala ef heil, annars 1 aukastafur). */
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1)));
}

/** Þyngd × bil → grömm-bil. */
function scaleRange(count: number, [lo, hi]: Range): Range {
  return [count * lo, count * hi];
}

/**
 * Lærður prior úr tínslum: meðalþyngd á pod og fjöldi tínslna með pod-tölu.
 * Skilar null ef engin tínsla ber pod-tölu.
 */
function learnedGramsPerPod(
  harvests: HarvestEntry[],
): { gramsPerPod: number; harvestsWithPods: number } | null {
  let totalG = 0;
  let totalPods = 0;
  let harvestsWithPods = 0;
  for (const h of harvests) {
    if (h.podCount && h.podCount > 0) {
      totalG += h.weightG ?? 0;
      totalPods += h.podCount;
      harvestsWithPods += 1;
    }
  }
  if (totalPods <= 0 || totalG <= 0) return null;
  return { gramsPerPod: totalG / totalPods, harvestsWithPods };
}

/** Heildarþyngd sem þegar hefur verið tínd. */
function harvestedGrams(harvests: HarvestEntry[]): number {
  let g = 0;
  for (const h of harvests) g += h.weightG ?? 0;
  return g;
}

/**
 * Nýjasta pollinate-skráning með `fruitCount` innan tímamarka → handvirkur fjöldi.
 * Skilar null ef engin nothæf finnst.
 */
function manualCountFromLogs(logs: LogEntry[], now: number): number | null {
  const cutoff = now - MANUAL_COUNT_MAX_AGE_DAYS * DAY_MS;
  let best: { ts: number; count: number } | null = null;
  for (const l of logs) {
    if (l.type !== 'pollinate') continue;
    if (l.timestamp < cutoff || l.timestamp > now) continue;
    const { fruitCount } = logData('pollinate', l.data);
    if (fruitCount === undefined || fruitCount < 0) continue;
    if (!best || l.timestamp > best.ts) best = { ts: l.timestamp, count: fruitCount };
  }
  return best ? best.count : null;
}

/** Meðalhiti úr umhverfissýnum (null ef engin með tempC). */
function avgTempC(samples: EnvironmentSample[] | undefined): number | null {
  if (!samples || samples.length === 0) return null;
  let sum = 0;
  let n = 0;
  for (const s of samples) {
    if (typeof s.tempC === 'number' && Number.isFinite(s.tempC)) {
      sum += s.tempC;
      n += 1;
    }
  }
  return n > 0 ? sum / n : null;
}

/**
 * Fasa-margfaldari á heildarfjölda viðmiðs: blómgun gefur lægra (óvisst hvort
 * blóm setja aldin), aldin/þroski/uppskera gefur fullt. Snemmfasar (kím/ungplanta)
 * gefa ekkert teljanlegt. Skilar null ef fasi ber ekki aldin enn.
 */
function phaseFruitFactor(phase: Plant['currentPhase']): number | null {
  switch (phase) {
    case 'flowering':
      return 0.5; // blóm ↔ óvíst hve mörg setja aldin
    case 'fruiting':
      return 0.85;
    case 'ripening':
    case 'harvest':
      return 1;
    default:
      // germinating / seedling / vegetative — engin aldin að telja enn
      return null;
  }
}

/** Hvort fasi gefur þröngt bil (aldin/þroski) eða vítt (blómgun). */
function phaseIsNarrow(phase: Plant['currentPhase']): boolean {
  return phase === 'ripening' || phase === 'harvest';
}

// ————————————————————————————————————————————————————————————————
// Stærðarflokkun
// ————————————————————————————————————————————————————————————————

/** Tómata-stærðarflokkur af `fruitWeightG` (varaviðmið þegar þyngd vantar). */
function tomatoSizeClass(fruitWeightG: number | undefined): TomatoSizeClass {
  if (fruitWeightG === undefined) return 'medium';
  if (fruitWeightG <= 30) return 'cherry';
  if (fruitWeightG < 227) return 'medium';
  return 'beefsteak';
}

/**
 * Paprikuflokkur leiddur af SHU/móðurtegund/lýsingu. Hallað í LÁG-flokka fyrir
 * innirækt. Bell = mild og stór; jalapeño-stærð milli; cayenne miðlungssterk
 * mjó; smáir mjög sterkir (thai/superhot) = small-hot.
 */
function pepperSizeClass(v: Variety): PepperSizeClass {
  if (!isPepper(v)) return 'jalapeno';
  const mother = v.motherSpecies;
  if (mother === 'Bell') return 'bell';
  if (mother === 'Jalapeño') return 'jalapeno';
  if (mother === 'Cayenne') return 'cayenne';
  if (mother === 'Thai') return 'small-hot';
  // Mjög sterkir superhots bera marga litla pods → small-hot.
  if (typeof v.shu === 'number' && v.shu >= 100_000) return 'small-hot';
  // Milt/meðalsterkt og stærra → jalapeño-stærð sem hófleg miðja.
  return 'jalapeno';
}

/** Kartöfluflokkur af `maturity`. */
function potatoMaturityClass(v: Variety): PotatoMaturityClass {
  if (isPotato(v)) return v.maturity;
  return 'maincrop';
}

// ————————————————————————————————————————————————————————————————
// Per-vörutegund mat
// ————————————————————————————————————————————————————————————————

interface CountResult {
  /** Heildarfjöldi aldina/berja (fyrir frádrátt fasa). */
  count: number;
  /** Íslensk útskýring á fjölda. */
  basis: string;
}

/**
 * Áætlaður fjöldi tómataaldina af klösum, með valfrjálsri hitaleiðréttingu á
 * klasahraða úr `envSamples`. `ageDays` er aldur plöntu í dögum.
 */
function tomatoCount(ageDays: number, tempC: number | null): CountResult {
  // Klasahraði: grunnur við 20°C, línuleg leiðrétting á 18–23°C bandinu.
  let trussPerDay = TOMATO_TRUSS_PER_DAY_AT_20C;
  let tempNote = '';
  if (tempC !== null) {
    const [lo, hi] = TOMATO_TRUSS_TEMP_BAND;
    const clamped = Math.min(hi, Math.max(lo, tempC));
    trussPerDay += (clamped - 20) * TOMATO_TRUSS_PER_DAY_PER_DEG;
    tempNote = ` við ${fmt(tempC)}°C`;
  }
  // Klasar myndaðir hingað til (frá byrjun vaxtar), a.m.k. einn.
  const trusses = Math.max(1, Math.round(ageDays * trussPerDay));
  const fruitsPerTruss = (TOMATO_FRUITS_PER_TRUSS[0] + TOMATO_FRUITS_PER_TRUSS[1]) / 2;
  const count = Math.round(trusses * fruitsPerTruss);
  return {
    count,
    basis: `afbrigðaviðmið: ~${trusses} klasar${tempNote} × ${fmt(fruitsPerTruss)} aldin`,
  };
}

/** Grömm á aldin fyrir tómat: afbrigðisþyngd, annars stærðarflokkur. */
function tomatoGPerFruit(v: Variety): { range: Range; basis: string } {
  if (isTomato(v) && v.fruitWeightG) {
    return { range: [v.fruitWeightG, v.fruitWeightG], basis: `${fmt(v.fruitWeightG)} g/aldin` };
  }
  const cls = tomatoSizeClass(isTomato(v) ? v.fruitWeightG : undefined);
  return { range: TOMATO_G_PER_FRUIT[cls], basis: `stærðarflokkur (${cls})` };
}

// ————————————————————————————————————————————————————————————————
// Aðalfall
// ————————————————————————————————————————————————————————————————

/**
 * Áætlar uppskeru EINNAR plöntu. Skilar null þegar ekki er hægt að meta:
 *  - plantan er geymd (archived),
 *  - flokkur ber ekki teljanlega/þyngjanlega uppskeru (kryddjurtir/lauf/annað),
 *  - fasi þar sem mat á ekki við (lokið/dvali/vetrardvali/skipulag),
 *  - of snemma í fasa til að nokkur aldin séu til (kím/ungplanta/vöxtur) OG engin
 *    tínslusaga né handvirk talning til staðar.
 */
export function estimatePlantYield(input: PlantYieldInput): PlantYieldEstimate | null {
  const { plant, variety, harvests } = input;

  if (plant.archived) return null;
  if (NON_ESTIMABLE_PHASES.has(plant.currentPhase)) return null;

  const category = variety?.category ?? plant.category;
  if (NON_ESTIMABLE_CATEGORIES.has(category)) return null;

  const basis: string[] = [];
  const harvestedG = harvestedGrams(harvests);

  // — Kartöflur: hrein fall af dögum í jörð × þroskaflokki (engin teljanleg aldin) —
  if (category === 'potato') {
    return estimatePotato(input, harvestedG, basis);
  }

  // — Jarðarber: heildaruppskera á tímabili, þrengd með tínslusögu —
  if (category === 'strawberry') {
    return estimateStrawberry(input, harvestedG, basis);
  }

  // — Tómatar og paprika: fjöldi × g/aldin × fasa-öryggi —
  return estimateCountable(input, harvestedG, basis);
}

/** Sameiginlegt mat fyrir tómata/papriku (teljanleg aldin). */
function estimateCountable(
  input: PlantYieldInput,
  harvestedG: number,
  basis: string[],
): PlantYieldEstimate | null {
  const { plant, variety, harvests, logs, envSamples, now } = input;
  const category = variety?.category ?? plant.category;

  // 1) Einingarþyngd (g/aldin): lærður prior > fruitWeightG > stærðarflokkur.
  let gPerUnit: Range;
  let priorStrong = false;
  const learned = learnedGramsPerPod(harvests);
  if (learned) {
    gPerUnit = [learned.gramsPerPod, learned.gramsPerPod];
    priorStrong = learned.harvestsWithPods >= STRONG_PRIOR_MIN_HARVESTS;
    basis.push(
      `byggt á ${learned.harvestsWithPods} tínslum (${fmt(learned.gramsPerPod)} g/aldin)`,
    );
  } else if (variety && isTomato(variety)) {
    const g = tomatoGPerFruit(variety);
    gPerUnit = g.range;
    basis.push(g.basis);
  } else if (variety && isPepper(variety)) {
    // Paprika ber enga `fruitWeightG` — alltaf stærðarflokkur (af SHU/móðurtegund).
    const cls = pepperSizeClass(variety);
    gPerUnit = PEPPER_BENCHMARKS[cls].gPerPod;
    basis.push(`stærðarflokkur (${cls})`);
  } else if (category === 'tomato') {
    gPerUnit = TOMATO_G_PER_FRUIT.medium;
    basis.push('stærðarflokkur (medium)');
  } else {
    gPerUnit = PEPPER_BENCHMARKS.jalapeno.gPerPod;
    basis.push('stærðarflokkur (jalapeno)');
  }

  // 2) Fjöldi: handvirk talning > skráning > viðmið afbrigðis skalað eftir fasa.
  const manual = input.manualCount ?? manualCountFromLogs(logs, now) ?? null;
  const factor = phaseFruitFactor(plant.currentPhase);

  let count: number;
  let countIsManual = false;
  if (manual !== null) {
    count = manual;
    countIsManual = true;
    basis.push(`talning af mynd: ${fmt(count)} aldin`);
  } else if (factor === null) {
    // Of snemma (kím/ungplanta/vöxtur) og engin talning — ekkert mat nema þegar
    // tínsla er þegar til (þá byggjum við á henni einni).
    if (harvestedG <= 0) return null;
    return finalize(plant, 0, [0, 0], harvestedG, basis, false, false);
  } else if (variety && isPepper(variety)) {
    const cls = pepperSizeClass(variety);
    const [lo, hi] = PEPPER_BENCHMARKS[cls].podsPerPlant;
    count = Math.round(((lo + hi) / 2) * factor);
    basis.push(`afbrigðaviðmið: ~${fmt(count)} aldin (${cls})`);
  } else {
    // Tómatur — klasareikningur með valfrjálsri hitaleiðréttingu.
    const ageDays = Math.max(0, (now - plantStartTs(plant)) / DAY_MS);
    const tc = tomatoCount(ageDays, avgTempC(envSamples));
    count = Math.round(tc.count * factor);
    basis.push(tc.basis);
  }

  // 3) Heildaruppskera = fjöldi × g/aldin. Þröngt bil af manual-talningu eða þroska.
  let range = scaleRange(count, gPerUnit);
  const narrow = countIsManual || phaseIsNarrow(plant.currentPhase);
  if (!narrow) {
    // Víkka bilið niður á við (innirækt-óvissa) þegar matið er ekki á þroskafasa.
    range = [range[0] * 0.7, range[1]];
  }

  return finalize(plant, count, range, harvestedG, basis, narrow, priorStrong);
}

/** Jarðarbera-mat: g/plöntu á tímabili, þrengt með tínslusögu og fasa. */
function estimateStrawberry(
  input: PlantYieldInput,
  harvestedG: number,
  basis: string[],
): PlantYieldEstimate | null {
  const { plant, variety, harvests, logs, now } = input;
  const factor = phaseFruitFactor(plant.currentPhase);

  // Handvirk talning (ber) → bein margföldun með g/ber.
  const manual = input.manualCount ?? manualCountFromLogs(logs, now) ?? null;
  if (manual !== null) {
    const gPerBerry =
      variety && isStrawberry(variety) && variety.berryType === 'alpine'
        ? STRAWBERRY_ALPINE_G_PER_BERRY
        : variety && isStrawberry(variety) && variety.fruitWeightG
          ? ([variety.fruitWeightG, variety.fruitWeightG] as Range)
          : STRAWBERRY_G_PER_BERRY;
    basis.push(`talning af mynd: ${fmt(manual)} ber`);
    const set = Math.round(manual * STRAWBERRY_FRUIT_SET_RATE);
    const range = scaleRange(plant.currentPhase === 'flowering' ? set : manual, gPerBerry);
    return finalize(plant, manual, range, harvestedG, basis, true, false);
  }

  if (factor === null) {
    if (harvestedG <= 0) return null;
    return finalize(plant, 0, [0, 0], harvestedG, basis, false, false);
  }

  // Lærður prior: ef tínslusaga er til notum við hana til að halla bilinu.
  const learned = learnedGramsPerPod(harvests);
  let range: Range;
  if (learned) {
    // Þekkjum g/ber → áætlum berafjölda út frá tímabils-uppskeru og þrengjum bil.
    const [lo, hi] = STRAWBERRY_G_PER_PLANT_SEASON;
    range = [lo, hi];
    basis.push(`byggt á ${learned.harvestsWithPods} tínslum (${fmt(learned.gramsPerPod)} g/ber)`);
  } else {
    range = [...STRAWBERRY_G_PER_PLANT_SEASON];
    const typeNote =
      variety && isStrawberry(variety) ? ` (${variety.berryType})` : '';
    basis.push(`afbrigðaviðmið: tímabilsuppskera 70–800 g${typeNote}`);
  }

  // Fasa-skali: bæði mörk skalast með fasa (blómgun lægra, aldin/þroski fullt).
  // Á ekki-þroskafasa víkkum við lágmarkið enn neðar (innirækt-óvissa).
  const lowCushion = phaseIsNarrow(plant.currentPhase) ? 1 : 0.8;
  range = [range[0] * factor * lowCushion, range[1] * factor];

  return finalize(
    plant,
    0,
    range,
    harvestedG,
    basis,
    phaseIsNarrow(plant.currentPhase),
    Boolean(learned),
  );
}

/** Kartöflu-mat: dagar í jörð × þroskaflokkur, skalað línulega að fullum DTM. */
function estimatePotato(
  input: PlantYieldInput,
  harvestedG: number,
  basis: string[],
): PlantYieldEstimate | null {
  const { plant, variety, now } = input;
  if (NON_ESTIMABLE_PHASES.has(plant.currentPhase)) return null;

  const cls = variety ? potatoMaturityClass(variety) : 'maincrop';
  const bench = POTATO_BENCHMARKS[cls];

  // Framvinda að fullum þroska (DTM). Án DTM gerum við ráð fyrir hálfum þroska.
  let progress = 0.5;
  const dtm = variety?.daysToHarvest;
  if (dtm) {
    const ageDays = Math.max(0, (now - plantStartTs(plant)) / DAY_MS);
    const full = dtm[1];
    progress = full > 0 ? Math.min(1, ageDays / full) : 1;
  }

  const [lo, hi] = bench.gPerPlant;
  // Línulega skalað að þroska og hallað niður fyrir stutt íslenskt sumar (×0,8 lægra).
  const range: Range = [lo * progress * 0.8, hi * progress];

  basis.push(
    `afbrigðaviðmið (${cls}): ${fmt(bench.tubersPerPlant[0])}–${fmt(bench.tubersPerPlant[1])} hnýði`,
  );
  basis.push(`${Math.round(progress * 100)}% að fullum þroska`);

  return finalize(plant, 0, range, harvestedG, basis, progress >= 0.9, false);
}

/**
 * Setur saman lokaniðurstöðu: klemmir eftirstöðvar við 0, reiknar heild
 * (tínt + eftir) og velur traust út frá fasa, gögnum og þrengd bils.
 */
function finalize(
  plant: Plant,
  _count: number,
  remaining: Range,
  harvestedG: number,
  basis: string[],
  narrow: boolean,
  priorStrong: boolean,
): PlantYieldEstimate {
  const remainingLowG = Math.round(clampLow(remaining[0]));
  const remainingHighG = Math.round(clampLow(remaining[1]));
  const harvested = Math.round(clampLow(harvestedG));

  let confidence: YieldConfidence;
  if (priorStrong) {
    confidence = 'há';
  } else if (narrow) {
    confidence = 'miðlungs';
  } else {
    confidence = 'lág';
  }

  if (harvested > 0 && !basis.some((b) => b.startsWith('þegar tínt'))) {
    basis.push(`þegar tínt: ${fmt(harvested)} g`);
  }

  return {
    plantId: plant.id,
    lowG: remainingLowG + harvested,
    highG: remainingHighG + harvested,
    remainingLowG,
    remainingHighG,
    harvestedG: harvested,
    confidence,
    basis,
  };
}

/**
 * Áætlar uppskeru heillar ræktunar — heildartölur + listi per plöntu (sleppir
 * plöntum sem mat fékkst ekki fyrir). `getVariety`/`harvestsByPlant`/`logsByPlant`
 * fletta upp gögnum hverrar plöntu; `envSamples` deilist á ræktunina alla.
 */
export function estimateGrowYield(
  plants: Plant[],
  getVariety: (p: Plant) => Variety | undefined,
  harvestsByPlant: (p: Plant) => HarvestEntry[],
  logsByPlant: (p: Plant) => LogEntry[],
  envSamples: EnvironmentSample[] | undefined,
  now: number,
): GrowYieldEstimate {
  const estimates: PlantYieldEstimate[] = [];
  let lowG = 0;
  let highG = 0;
  let remainingLowG = 0;
  let remainingHighG = 0;

  for (const p of plants) {
    const est = estimatePlantYield({
      plant: p,
      variety: getVariety(p),
      harvests: harvestsByPlant(p),
      logs: logsByPlant(p),
      envSamples,
      now,
    });
    if (!est) continue;
    estimates.push(est);
    lowG += est.lowG;
    highG += est.highG;
    remainingLowG += est.remainingLowG;
    remainingHighG += est.remainingHighG;
  }

  return { lowG, highG, remainingLowG, remainingHighG, plants: estimates };
}
