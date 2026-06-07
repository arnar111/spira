/**
 * Rós reglu-vél — sameiginlegir hjálparar (4.4 klofningur).
 *
 * Hreinar fallgerðir og fastar sem indoor/outdoor/veritable/digest deila. Ekkert
 * IO né klukkuköllun — `now`/`month` berast inn ofar í keðjunni. Þetta er bein,
 * vélræn útdráttur úr gamla engine.ts (engin hegðunarbreyting).
 */

import type { Grow, Plant, LogEntry, HarvestEntry, GrowPhase, PlantCategory } from '@/lib/db';
import { logData } from '@/lib/logSchema';
import { varietyByName, varietyById } from '@/lib/varieties';
import type { RosInsight, RosSeverity } from '../types';

export const DAY_MS = 1000 * 60 * 60 * 24;

/** Jarðarber: fjarlægja á fyrstu blóm í ~5 vikur til að byggja upp krónu/rætur. */
export const STRAWBERRY_DEBLOSSOM_DAYS = 35;

/** Fasar þar sem grow telst virkt (ekki í skipulagi / búið / dvala). */
export const ACTIVE_PHASES: ReadonlySet<GrowPhase> = new Set<GrowPhase>([
  'germinating',
  'seedling',
  'vegetative',
  'flowering',
  'fruiting',
  'ripening',
  'harvest',
]);

export interface EngineInput {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
  /** Núverandi tímastimpill í ms (berst inn — engin klukka inni í vélinni). */
  now: number;
  /** Núverandi mánuður 1–12 (berst inn). */
  month: number;
}

/**
 * Afleidd, sameiginleg vinnsla sem öll innsýnar-söfn deila. Reiknað einu sinni í
 * `computeInsights` og sent inn í hvert safn svo röðun og forsendur haldist eins.
 */
export interface EngineContext extends EngineInput {
  /** Virkar (óarkíveraðar) plöntur. */
  activePlants: Plant[];
  /** Er ræktunin virk (ekki arkíveruð og a.m.k. ein planta í virkum fasa)? */
  growActive: boolean;
  /** Útiræktun (season.ts growIsOutdoor með plöntuvitund). */
  outdoor: boolean;
  /** Véritable SMART (innbyggð vatnsrækt). */
  veritable: boolean;
}

/** Heilir dagar liðnir frá tímastimpli (>= 0). */
export function daysSince(now: number, ts: number): number {
  return Math.floor((now - ts) / DAY_MS);
}

/** Nýjasti log-tímastimpill af tiltekinni gerð (eða undefined). */
export function lastLogTs(
  logs: LogEntry[],
  type: LogEntry['type'],
  plantId?: string,
): number | undefined {
  let latest: number | undefined;
  for (const l of logs) {
    if (l.type !== type) continue;
    if (plantId !== undefined && l.plantId !== plantId) continue;
    if (latest === undefined || l.timestamp > latest) latest = l.timestamp;
  }
  return latest;
}

/**
 * Nýjasti log-tímastimpill af tiltekinni gerð sem á við TILTEKNA plöntu:
 * annaðhvort skráð á plöntuna sjálfa eða á ræktunina í heild (plantId óskilgreint).
 * Aðgerðir eru oft skráðar fyrir „Öll ræktunin", svo plöntustigs-áminningar
 * (frjóvgun, toppun) verða að telja slíkar skráningar með.
 */
export function lastLogForPlant(
  logs: LogEntry[],
  type: LogEntry['type'],
  plantId: string,
): number | undefined {
  let latest: number | undefined;
  for (const l of logs) {
    if (l.type !== type) continue;
    // Skráning á ræktunina (engin plantId) gildir fyrir allar plöntur hennar.
    if (l.plantId !== undefined && l.plantId !== plantId) continue;
    if (latest === undefined || l.timestamp > latest) latest = l.timestamp;
  }
  return latest;
}

/**
 * Nýjasti 'maintenance' log-tímastimpill þar sem data.task er eitt af gefnum
 * gildum (t.d. 'clean_tank'). Notað fyrir Véritable-viðhaldsáminningar.
 * Ef `plantId` er gefið gildir bæði skráning á plöntuna og á ræktunina í heild.
 */
export function lastMaintenanceTs(
  logs: LogEntry[],
  tasks: readonly string[],
  plantId?: string,
): number | undefined {
  let latest: number | undefined;
  for (const l of logs) {
    if (l.type !== 'maintenance') continue;
    if (plantId !== undefined && l.plantId !== undefined && l.plantId !== plantId)
      continue;
    const { task } = logData(l.type, l.data);
    if (task === undefined || !tasks.includes(task)) continue;
    if (latest === undefined || l.timestamp > latest) latest = l.timestamp;
  }
  return latest;
}

/** Er einhver virk planta í þessu grow í tilteknum fasa? */
export function plantsInPhase(plants: Plant[], phase: GrowPhase): Plant[] {
  return plants.filter((p) => !p.archived && p.currentPhase === phase);
}

/** Nýjasta log-færsla af tiltekinni gerð (ekki bara tímastimpill). */
export function lastLogOfType(logs: LogEntry[], type: LogEntry['type']): LogEntry | undefined {
  let latest: LogEntry | undefined;
  for (const l of logs) {
    if (l.type !== type) continue;
    if (latest === undefined || l.timestamp > latest.timestamp) latest = l;
  }
  return latest;
}

/** Nýjasta pH-gildi úr vökvun/áburði ásamt tímastimpli, eða undefined. */
export function lastPh(logs: LogEntry[]): { value: number; ts: number } | undefined {
  let best: { value: number; ts: number } | undefined;
  for (const l of logs) {
    if (l.type !== 'water' && l.type !== 'feed') continue;
    const ph = logData(l.type, l.data).ph;
    if (ph === undefined) continue;
    if (best === undefined || l.timestamp > best.ts) best = { value: ph, ts: l.timestamp };
  }
  return best;
}

/** Lengst kominn virkur fasi (fyrir umhverfis-markgildi). */
const PHASE_PROGRESS: GrowPhase[] = [
  'planning',
  'germinating',
  'seedling',
  'vegetative',
  'flowering',
  'fruiting',
  'ripening',
  'harvest',
];
export function furthestPhase(plants: Plant[]): GrowPhase {
  let best: GrowPhase = 'vegetative';
  let rank = -1;
  for (const p of plants) {
    const r = PHASE_PROGRESS.indexOf(p.currentPhase);
    if (r > rank) {
      rank = r;
      best = p.currentPhase;
    }
  }
  return best;
}

/** Ráðlagt pH-bil innandyra (mold/vatnsrækt) — utan þess læsist næring. */
export const PH_MIN = 5.5;
export const PH_MAX = 6.8;
/** Umhverfis-lestur telst „nýlegur" innan þessa glugga (ms). */
export const ENV_FRESH_MS = 48 * 60 * 60 * 1000;

/** Sækir afbrigði fyrir plöntu — fyrst eftir id, svo eftir nafni. */
export function plantVariety(p: Plant) {
  return varietyById(p.varietyId) ?? varietyByName(p.variety);
}

/** Besta upphafsdagsetning til að mæla aldur plöntu (spírun > sáning > stofnun). */
export function plantStartTs(p: Plant): number {
  return p.germinatedDate ?? p.sowDate ?? p.createdAt;
}

/**
 * Er ræktunin Véritable SMART (innbyggð vatnsrækt)? Véritable er INNANDYRA en
 * EKKI mold: hárpípu-dúkar sjálfvökva úr 2 l tanki og innbyggt LED keyrir
 * 16 klst/dag. Því sleppum við mold-vökvun, mold-áburði og gróðurljósi en
 * fáum sérstök tank-/hreinsunar-/dúka-/grisjunar-/Lingot-ráð í staðinn.
 */
export function growIsVeritable(grow: Grow): boolean {
  return grow.locationKey === 'veritable';
}

/** Flokkar sem teljast „aldinplöntur" (þung næring, hærri vatnsþörf). */
const FRUITING_CATEGORIES: ReadonlySet<PlantCategory> = new Set<PlantCategory>([
  'tomato',
  'pepper',
  'strawberry',
  'fruit',
]);

export function isFruiting(p: Plant): boolean {
  return FRUITING_CATEGORIES.has(p.category);
}

/**
 * Áætlaður líftími Lingots í dögum eftir flokki þegar afbrigði gefur ekki
 * `lifespanDays` (skýrsla §9.3): kryddjurtir ~150–180, lauf ~90–120, aldin ~120.
 */
export function lingotLifespanByCategory(category: PlantCategory): number | undefined {
  switch (category) {
    case 'herb':
      return 165;
    case 'leafy':
      return 105;
    case 'tomato':
    case 'pepper':
    case 'strawberry':
    case 'fruit':
      return 120;
    default:
      return undefined;
  }
}

/**
 * VÖKVUN — tíðni ræðst af fasa, staðsetningu og flokki.
 * Forsenda: grunnur ~3 dagar. Gluggi þornar hraðar (-1). Spírun/plöntufasar oftar.
 * Blómgun/aldin á papriku ~2–3 dagar. Lágmark 1 dagur.
 */
export function wateringCadenceDays(grow: Grow, plants: Plant[]): number {
  let cadence = 3;
  // Gluggi þornar hraðar en lokað tjald/sturta.
  if (grow.locationKey === 'window') cadence -= 1;

  // Finndu „þyrstasta" fasa meðal virkra plantna (lægsta tíðni ræður).
  const active = plants.filter((p) => !p.archived);
  let minPhaseCadence = cadence;
  for (const p of active) {
    let c = cadence;
    if (p.currentPhase === 'germinating' || p.currentPhase === 'seedling') {
      // Ungplöntur þorna hratt og þola illa þurrk.
      c = Math.min(c, 2);
    }
    if (
      p.category === 'pepper' &&
      (p.currentPhase === 'flowering' ||
        p.currentPhase === 'fruiting' ||
        p.currentPhase === 'ripening')
    ) {
      // Paprika á blóma/aldinfasa drekkur meira.
      c = Math.min(c, grow.locationKey === 'window' ? 2 : 3);
    }
    if (p.category === 'strawberry') {
      // Jarðarber í litlum pottum þorna hratt — vökva þegar efsti 1 cm er þurr.
      c = Math.min(c, 2);
    }
    minPhaseCadence = Math.min(minPhaseCadence, c);
  }

  return Math.max(1, minPhaseCadence);
}

export function severityRank(s: RosSeverity): number {
  return s === 'due' ? 0 : s === 'soon' ? 1 : 2;
}

/** Stöðug röðun eftir severity (Array.sort er ekki tryggt stöðug alls staðar). */
export function stableSortBySeverity(items: RosInsight[]): RosInsight[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const r = severityRank(a.item.severity) - severityRank(b.item.severity);
      return r !== 0 ? r : a.index - b.index;
    })
    .map((x) => x.item);
}

/** Íslensk fleirtölu-/eintölumeðferð fyrir „dag(a)". Endurútflutt úr lib/dates. */
export { dayWord } from '@/lib/dates';

/** Snyrtir tölu: skerður óþarfa aukastafi (sama og formatLogData). */
export function num(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** Stutt merki fyrir plöntu — gælunafn ef til, annars afbrigðisnafn. */
export function plantLabel(p: Plant): string {
  return p.nickname?.trim() || p.variety;
}

/** Íslenskt heiti fasa fyrir samhengistexta. */
export function phaseLabel(phase: GrowPhase): string {
  const map: Record<GrowPhase, string> = {
    planning: 'skipulag',
    germinating: 'spírun',
    seedling: 'plöntufasi',
    vegetative: 'vegfasi',
    flowering: 'blómgun',
    fruiting: 'aldin',
    ripening: 'þroski',
    harvest: 'uppskera',
    overwintering: 'vetrardvali',
    dormant: 'dvali',
    finished: 'lokið',
  };
  return map[phase];
}
