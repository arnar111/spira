/**
 * Rós — vikusamantekt (week digest).
 *
 * Hönnunarreglur (sömu og predict.ts og reglu-vélin):
 *  - HREINAR fallgerðir: engin bein köllun á Date.now() / Math.random() inni.
 *    'now' (epoch-ms) berst alltaf inn sem rök.
 *  - Þolið gagnvart vantandi gögnum og sviðum (tempC o.fl. mega vanta).
 *  - Deterministískt — sama inntak gefur alltaf sömu samantekt.
 *
 * `buildWeekDigest` ber saman SÍÐUSTU 7 daga ([now-7d, now)) við 7 dagana þar á
 * undan ([now-14d, now-7d)) fyrir EINA ræktun (kallandi forsíar eftir growId).
 * Skilagerðin er hönnuð til beinnar birtingar í viðmóti (UI kemur síðar).
 */

import type { LogEntry, HarvestEntry, EnvironmentSample, LogType } from '@/lib/db';
import { dayWord } from '@/lib/dates';

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** Hámarksfjöldi áhersluatriða (highlights). */
const MAX_HIGHLIGHTS = 4;

/** Létt myndlýsigögn — kallandi sendir bara takenAt (engir blob). */
export interface PhotoMeta {
  takenAt: number;
}

/** Inntak fyrir vikusamantekt (allt forsíað eftir einni ræktun). */
export interface WeekDigestInput {
  logs: LogEntry[];
  harvests: HarvestEntry[];
  envSamples: EnvironmentSample[];
  photos: PhotoMeta[];
  /** Núverandi tímastimpill í ms (berst inn — engin klukka inni). */
  now: number;
}

/** Talning þessarar viku með breytingu frá fyrri viku (`delta = current - previous`). */
export interface CountDelta {
  current: number;
  previous: number;
  delta: number;
}

/** Talning hverrar virkni vikuna (vökvun, áburður, …) með breytingu. */
export interface ActivityCounts {
  waterings: CountDelta;
  feedings: CountDelta;
  /** Klipping + toppun lögð saman (prune + top). */
  prunesAndTops: CountDelta;
  pollinations: CountDelta;
  /** Meindýra- OG sjúkdómaskráningar lagðar saman (pest + disease). */
  pestDiseaseReports: CountDelta;
  notes: CountDelta;
}

/** Uppskera vikunnar: grömm og fjöldi belgja, með breytingu frá fyrri viku. */
export interface HarvestSummary {
  grams: CountDelta;
  pods: CountDelta;
}

/** Lágmark/hámark/meðaltal eins umhverfissviðs — null þegar engin gögn. */
export interface EnvStat {
  min: number | null;
  max: number | null;
  avg: number | null;
  /** Breyting á meðaltali frá fyrri viku — null þegar önnur vikan vantar gögn. */
  avgDelta: number | null;
}

/** Umhverfissamantekt vikunnar (hiti + raki). */
export interface EnvSummary {
  tempC: EnvStat;
  humidityPct: EnvStat;
}

/** Heildarsamantekt síðustu 7 daga, tilbúin til birtingar. */
export interface WeekDigest {
  /** Upphaf [now-7d) og endir (now) gluggans — gagnlegt fyrir fyrirsögn í UI. */
  windowStart: number;
  windowEnd: number;
  activities: ActivityCounts;
  harvest: HarvestSummary;
  photos: CountDelta;
  environment: EnvSummary;
  /** 0–4 stutt íslensk áhersluatriði, mikilvægast fyrst. */
  highlights: string[];
  /** Satt þegar BÁÐAR vikur eru tómar af öllum gögnum (UI sýnir kynningu). */
  isEmpty: boolean;
}

/** Færsla fellur í viku ef tímastimpillinn er innan [start, end). */
function inWindow(ts: number, start: number, end: number): boolean {
  return ts >= start && ts < end;
}

/** Telur log-færslur af gefnum gerðum innan glugga. */
function countLogs(
  logs: LogEntry[],
  types: ReadonlySet<LogType>,
  start: number,
  end: number,
): number {
  let n = 0;
  for (const l of logs) {
    if (!types.has(l.type)) continue;
    if (inWindow(l.timestamp, start, end)) n += 1;
  }
  return n;
}

/** Smíðar CountDelta fyrir gefnar log-gerðir út frá báðum gluggum. */
function logCountDelta(
  logs: LogEntry[],
  types: ReadonlySet<LogType>,
  curStart: number,
  curEnd: number,
  prevStart: number,
  prevEnd: number,
): CountDelta {
  const current = countLogs(logs, types, curStart, curEnd);
  const previous = countLogs(logs, types, prevStart, prevEnd);
  return { current, previous, delta: current - previous };
}

const WATER_TYPES = new Set<LogType>(['water']);
const FEED_TYPES = new Set<LogType>(['feed']);
const PRUNE_TOP_TYPES = new Set<LogType>(['prune', 'top']);
const POLLINATE_TYPES = new Set<LogType>(['pollinate']);
const PEST_DISEASE_TYPES = new Set<LogType>(['pest', 'disease']);
const NOTE_TYPES = new Set<LogType>(['note']);

/**
 * Tölfræði eins umhverfissviðs innan glugga. `pick` dregur gildið (mögulega
 * undefined) úr sýni; vantandi gildi eru hunsuð. Skilar null-fylltu þegar engin
 * gild gögn finnast.
 */
function envStat(
  samples: EnvironmentSample[],
  pick: (s: EnvironmentSample) => number | undefined,
  start: number,
  end: number,
): { min: number | null; max: number | null; avg: number | null } {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  for (const s of samples) {
    if (!inWindow(s.timestamp, start, end)) continue;
    const v = pick(s);
    if (v === undefined || !Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    count += 1;
  }
  if (count === 0) return { min: null, max: null, avg: null };
  return { min, max, avg: sum / count };
}

/** Smíðar EnvStat (núverandi vika + breyting á meðaltali frá fyrri viku). */
function envStatDelta(
  samples: EnvironmentSample[],
  pick: (s: EnvironmentSample) => number | undefined,
  curStart: number,
  curEnd: number,
  prevStart: number,
  prevEnd: number,
): EnvStat {
  const cur = envStat(samples, pick, curStart, curEnd);
  const prev = envStat(samples, pick, prevStart, prevEnd);
  const avgDelta =
    cur.avg !== null && prev.avg !== null ? cur.avg - prev.avg : null;
  return { min: cur.min, max: cur.max, avg: cur.avg, avgDelta };
}

/** Summar magn (`pick`) uppskeruskráninga innan glugga. */
function sumHarvest(
  harvests: HarvestEntry[],
  pick: (h: HarvestEntry) => number,
  start: number,
  end: number,
): number {
  let sum = 0;
  for (const h of harvests) {
    if (!inWindow(h.timestamp, start, end)) continue;
    sum += pick(h);
  }
  return sum;
}

/** Telur myndir innan glugga eftir takenAt. */
function countPhotos(photos: PhotoMeta[], start: number, end: number): number {
  let n = 0;
  for (const p of photos) {
    if (inWindow(p.takenAt, start, end)) n += 1;
  }
  return n;
}

/**
 * Snyrtir tölu á íslensku sniði (komma sem aukastafamerki, t.d. „2,1").
 * Fellur aftur á einfalt snið ef is-IS locale vantar í keyrsluumhverfið.
 */
function numIs(value: number, maxFractionDigits = 1): string {
  try {
    return value.toLocaleString('is-IS', { maximumFractionDigits: maxFractionDigits });
  } catch {
    return String(Number(value.toFixed(maxFractionDigits)));
  }
}

/** Heilir dagar liðnir frá tímastimpli að `now` (>= 0). */
function daysSince(now: number, ts: number): number {
  return Math.floor((now - ts) / DAY_MS);
}

/**
 * Reiknar áhersluatriði (highlights) — deterministískar reglur, mikilvægast
 * fyrst, skorið niður í MAX_HIGHLIGHTS. Hver regla bætir við í forgangsröð.
 */
function buildHighlights(
  digest: Omit<WeekDigest, 'highlights' | 'isEmpty'>,
  input: WeekDigestInput,
): string[] {
  const out: string[] = [];
  const { activities, harvest, environment, windowStart } = digest;
  const { logs, now } = input;

  // 1) Fyrsta tínsla vikunnar (engin uppskera fyrri viku en grömm núna).
  if (harvest.grams.current > 0 && harvest.grams.previous === 0) {
    out.push(`Fyrsta tínsla vikunnar: ${numIs(harvest.grams.current, 0)} g`);
  } else if (harvest.grams.current > 0) {
    // Annars: heildaruppskera vikunnar með breytingu ef einhver.
    const d = harvest.grams.delta;
    const trend =
      d > 0
        ? ` (+${numIs(d, 0)} g frá fyrri viku)`
        : d < 0
          ? ` (${numIs(d, 0)} g frá fyrri viku)`
          : '';
    out.push(`Uppskera vikunnar: ${numIs(harvest.grams.current, 0)} g${trend}`);
  }

  // 2) Engin vökvun skráð lengi — finndu síðustu vökvun fyrir `now`.
  if (activities.waterings.current === 0) {
    let lastWater: number | undefined;
    for (const l of logs) {
      if (l.type !== 'water' || l.timestamp >= now) continue;
      if (lastWater === undefined || l.timestamp > lastWater) lastWater = l.timestamp;
    }
    if (lastWater !== undefined) {
      const d = daysSince(now, lastWater);
      out.push(`Engin vökvun skráð í ${d} ${dayWord(d)}`);
    } else {
      out.push('Engin vökvun skráð á tímabilinu');
    }
  }

  // 3) Marktæk breyting á meðalhita (>= 1°C í annað hvort átt).
  const tempDelta = environment.tempC.avgDelta;
  if (tempDelta !== null && Math.abs(tempDelta) >= 1) {
    const dir = tempDelta > 0 ? 'hækkaði' : 'lækkaði';
    out.push(`Meðalhiti ${dir} um ${numIs(Math.abs(tempDelta))}°C`);
  }

  // 4) Aukin virkni: vökvanir jukust verulega milli vikna (>= 2 fleiri).
  if (activities.waterings.delta >= 2) {
    out.push(
      `Vökvun jókst: ${activities.waterings.current} vs ${activities.waterings.previous} í fyrri viku`,
    );
  }

  // 5) Meindýra-/sjúkdómaskráningar þessa viku — alltaf áberandi.
  if (activities.pestDiseaseReports.current > 0) {
    const n = activities.pestDiseaseReports.current;
    out.push(`${n} meindýra-/sjúkdómaskráning${n === 1 ? '' : 'ar'} vikuna`);
  }

  // 6) Margar myndir teknar vikuna.
  if (digest.photos.current > 0) {
    const n = digest.photos.current;
    out.push(`${n} ${n === 1 ? 'mynd' : 'myndir'} teknar vikuna`);
  }

  // 7) Engin virkni alls þessa viku þrátt fyrir gögn áður.
  const noCurrentActivity =
    activities.waterings.current === 0 &&
    activities.feedings.current === 0 &&
    activities.prunesAndTops.current === 0 &&
    activities.pollinations.current === 0 &&
    activities.notes.current === 0 &&
    harvest.grams.current === 0 &&
    digest.photos.current === 0;
  if (noCurrentActivity && windowStart > 0) {
    // Aðeins ef ekkert annað highlight (t.d. vökvunarleysi) hefur þegar gripið það.
    if (out.length === 0) out.push('Engin skráð virkni þessa viku');
  }

  return out.slice(0, MAX_HIGHLIGHTS);
}

/**
 * Smíðar vikusamantekt fyrir EINA ræktun (kallandi forsíar eftir growId).
 * Ber saman [now-7d, now) við [now-14d, now-7d). Tóm gögn gefa gilda samantekt
 * með núllum/null og `isEmpty = true` þegar BÁÐAR vikur eru tómar.
 */
export function buildWeekDigest(input: WeekDigestInput): WeekDigest {
  const { logs, harvests, envSamples, photos, now } = input;

  const curEnd = now;
  const curStart = now - WEEK_MS;
  const prevEnd = curStart;
  const prevStart = now - 2 * WEEK_MS;

  const activities: ActivityCounts = {
    waterings: logCountDelta(logs, WATER_TYPES, curStart, curEnd, prevStart, prevEnd),
    feedings: logCountDelta(logs, FEED_TYPES, curStart, curEnd, prevStart, prevEnd),
    prunesAndTops: logCountDelta(logs, PRUNE_TOP_TYPES, curStart, curEnd, prevStart, prevEnd),
    pollinations: logCountDelta(logs, POLLINATE_TYPES, curStart, curEnd, prevStart, prevEnd),
    pestDiseaseReports: logCountDelta(
      logs,
      PEST_DISEASE_TYPES,
      curStart,
      curEnd,
      prevStart,
      prevEnd,
    ),
    notes: logCountDelta(logs, NOTE_TYPES, curStart, curEnd, prevStart, prevEnd),
  };

  // Uppskera: les bæði úr harvests-töflunni (þyngd/belgir eru þar). LogEntry af
  // gerð 'harvest' er sjaldgæft afbrigði; við höldum okkur við harvests-töfluna
  // sem kallandi sendir (samræmt við harvestStats.ts).
  const grams: CountDelta = (() => {
    const current = sumHarvest(harvests, (h) => h.weightG || 0, curStart, curEnd);
    const previous = sumHarvest(harvests, (h) => h.weightG || 0, prevStart, prevEnd);
    return { current, previous, delta: current - previous };
  })();
  const pods: CountDelta = (() => {
    const current = sumHarvest(harvests, (h) => h.podCount || 0, curStart, curEnd);
    const previous = sumHarvest(harvests, (h) => h.podCount || 0, prevStart, prevEnd);
    return { current, previous, delta: current - previous };
  })();
  const harvest: HarvestSummary = { grams, pods };

  const photoCur = countPhotos(photos, curStart, curEnd);
  const photoPrev = countPhotos(photos, prevStart, prevEnd);
  const photoDelta: CountDelta = {
    current: photoCur,
    previous: photoPrev,
    delta: photoCur - photoPrev,
  };

  const environment: EnvSummary = {
    tempC: envStatDelta(envSamples, (s) => s.tempC, curStart, curEnd, prevStart, prevEnd),
    humidityPct: envStatDelta(
      envSamples,
      (s) => s.humidityPct,
      curStart,
      curEnd,
      prevStart,
      prevEnd,
    ),
  };

  // isEmpty: ekkert hjá hvorugri viku í neinu sviði.
  const anyActivity = Object.values(activities).some(
    (c) => c.current > 0 || c.previous > 0,
  );
  const anyHarvest =
    grams.current > 0 || grams.previous > 0 || pods.current > 0 || pods.previous > 0;
  const anyPhotos = photoCur > 0 || photoPrev > 0;
  const anyEnv =
    environment.tempC.avg !== null ||
    environment.humidityPct.avg !== null ||
    // fyrri vika gæti haft gögn þótt núverandi sé tóm
    envStat(envSamples, (s) => s.tempC, prevStart, prevEnd).avg !== null ||
    envStat(envSamples, (s) => s.humidityPct, prevStart, prevEnd).avg !== null;
  const isEmpty = !anyActivity && !anyHarvest && !anyPhotos && !anyEnv;

  const base: Omit<WeekDigest, 'highlights' | 'isEmpty'> = {
    windowStart: curStart,
    windowEnd: curEnd,
    activities,
    harvest,
    photos: photoDelta,
    environment,
  };

  const highlights = isEmpty ? [] : buildHighlights(base, input);

  return { ...base, highlights, isEmpty };
}
