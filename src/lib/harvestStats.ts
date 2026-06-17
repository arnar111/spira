/**
 * Uppskeru-greiningar (3.3) — hreinar fallgerðir sem breyta hráum tínslum í
 * innsýn: afköst (g/dag, g/pod, tínslur/viku), tímalínu og samanburð afbrigða.
 *
 * Hönnunarreglur: HREINT (now berst inn þar sem tíma þarf), þolið gagnvart
 * vantandi þyngd/pod-tölu, deterministískt.
 */

import type { HarvestEntry, Plant } from '@/lib/db';

const DAY_MS = 86_400_000;

/** Afköst einnar plöntu/ræktunar reiknuð úr tínslum. */
export interface YieldStats {
  /** Heildarþyngd (g). */
  totalG: number;
  /** Heildar pod-talning. */
  totalPods: number;
  /** Fjöldi tínslna. */
  count: number;
  /** Meðalþyngd á pod (g) eða null ef engin pod skráð. */
  gramsPerPod: number | null;
  /** Grömm á dag frá fyrstu tínslu (null ef < 1 tínsla). */
  gramsPerDay: number | null;
  /** Tínslur á viku frá fyrstu tínslu (null ef < 1 tínsla). */
  harvestsPerWeek: number | null;
  /** epoch-ms fyrstu/síðustu tínslu (null ef engin). */
  firstAt: number | null;
  lastAt: number | null;
}

const EMPTY: YieldStats = {
  totalG: 0,
  totalPods: 0,
  count: 0,
  gramsPerPod: null,
  gramsPerDay: null,
  harvestsPerWeek: null,
  firstAt: null,
  lastAt: null,
};

/**
 * Reiknar afköst úr lista af tínslum m.v. `now`. Tímabilið er frá fyrstu tínslu
 * til `now` (a.m.k. 1 dagur svo ein tínsla gefi ekki óendanleg afköst).
 */
export function yieldStats(harvests: HarvestEntry[], now: number): YieldStats {
  if (harvests.length === 0) return EMPTY;
  let totalG = 0;
  let totalPods = 0;
  // g/pod má AÐEINS reikna úr þyngd tínslna sem raunverulega hafa pod-tölu.
  // Annars blæs þyngd úr pod-lausum tínslum upp meðaltalið (t.d. [100g/5pod,
  // 50g/engin pod] á að gefa 20 g/pod, ekki 30).
  let podWeightG = 0;
  let firstAt = Infinity;
  let lastAt = -Infinity;
  for (const h of harvests) {
    const weightG = h.weightG ?? 0;
    totalG += weightG;
    if (h.podCount && h.podCount > 0) {
      totalPods += h.podCount;
      podWeightG += weightG;
    }
    if (h.timestamp < firstAt) firstAt = h.timestamp;
    if (h.timestamp > lastAt) lastAt = h.timestamp;
  }
  const days = Math.max(1, (now - firstAt) / DAY_MS);
  return {
    totalG,
    totalPods,
    count: harvests.length,
    gramsPerPod: totalPods > 0 ? podWeightG / totalPods : null,
    gramsPerDay: totalG / days,
    harvestsPerWeek: harvests.length / (days / 7),
    firstAt,
    lastAt,
  };
}

/** Tímaröðuð tínsla fyrir tímalínurit (þyngd á hvern atburð). */
export interface HarvestTimelinePoint {
  t: number;
  weightG: number;
}

/** Tínslur ræktunar í tímaröð (elst fyrst) fyrir tímalínurit. */
export function harvestTimeline(harvests: HarvestEntry[]): HarvestTimelinePoint[] {
  return harvests
    .map((h) => ({ t: h.timestamp, weightG: h.weightG ?? 0 }))
    .sort((a, b) => a.t - b.t);
}

/** Samantekt uppskeru fyrir eitt afbrigði (þvert á ræktanir). */
export interface VarietyYield {
  /** varietyId ef til, annars afbrigðisheiti sem lykill. */
  key: string;
  label: string;
  totalG: number;
  totalPods: number;
  count: number;
}

/**
 * Safnar uppskeru eftir afbrigði þvert á ALLAR ræktanir (líka geymdar) með því
 * að fletta hverri tínslu upp í plöntuna sína. Raðað eftir þyngd (mest fyrst).
 * `plants` þarf að ná yfir geymdar plöntur til að geymdar ræktanir teljist með.
 */
export function yieldByVariety(
  harvests: HarvestEntry[],
  plants: Plant[],
): VarietyYield[] {
  const plantById = new Map(plants.map((p) => [p.id, p] as const));
  const map = new Map<string, VarietyYield>();
  for (const h of harvests) {
    const plant = plantById.get(h.plantId);
    if (!plant) continue;
    // `||` (ekki `??`): tómur strengur varietyId á að falla í afbrigðisheitið,
    // svo plöntur með varietyId='' grúppist með nafna sínum en ekki undir ''.
    const key = plant.varietyId || plant.variety;
    const label = plant.variety;
    const prev = map.get(key) ?? { key, label, totalG: 0, totalPods: 0, count: 0 };
    prev.totalG += h.weightG ?? 0;
    prev.totalPods += h.podCount ?? 0;
    prev.count += 1;
    map.set(key, prev);
  }
  return Array.from(map.values()).sort((a, b) => b.totalG - a.totalG);
}
