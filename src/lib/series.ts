/**
 * Tímaraðir úr skráningum — hreinar fallgerðir sem draga falin gögn (pH, EC,
 * ljóstíma, vökvunartíðni) fram úr `LogEntry.data` og `EnvironmentSample`.
 *
 * Hönnunarreglur:
 *  - HREINT: engin köllun á klukku/IO; allt reiknað úr inntakinu.
 *  - Þolið gagnvart vantandi/gölluðum gildum — sama `asNumber`-nálgun og
 *    `formatLogData` notar (tölu úr number eða tölulegum streng, annars sleppt).
 *  - Skilar gögnum tilbúnum fyrir `ui/Sparkline` (`points: number[]`) auk
 *    tímastimpla svo viðmótið geti merkt ása.
 */

import type { EnvironmentSample, LogEntry } from '@/lib/db';

/** Einn punktur í tímaröð: gildi + tímastimpill þess. */
export interface SeriesPoint {
  /** epoch-ms þegar mælingin var skráð. */
  t: number;
  /** Tölulegt gildi mælingarinnar. */
  v: number;
}

const DAY_MS = 86_400_000;

/** Sama talnameðferð og `formatLogData`: number eða tölulegur strengur, annars undefined. */
function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Dregur tölulega tímaröð úr `data[key]` allra skráninga af tilteknum gerðum,
 * raðað í tímaröð (elst fyrst). Skráningar án gildis falla út.
 */
function dataSeries(
  logs: LogEntry[],
  types: ReadonlySet<LogEntry['type']>,
  key: string,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (const l of logs) {
    if (!types.has(l.type)) continue;
    const v = asNumber(l.data?.[key]);
    if (v === undefined) continue;
    out.push({ t: l.timestamp, v });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

const WATER_OR_FEED: ReadonlySet<LogEntry['type']> = new Set<LogEntry['type']>([
  'water',
  'feed',
]);

/** pH-mælingar úr vökvun/áburði (data.ph), elst fyrst. */
export function phSeries(logs: LogEntry[]): SeriesPoint[] {
  return dataSeries(logs, WATER_OR_FEED, 'ph');
}

/** EC-/leiðni-mælingar úr vökvun/áburði (data.ec), elst fyrst. */
export function ecSeries(logs: LogEntry[]): SeriesPoint[] {
  return dataSeries(logs, WATER_OR_FEED, 'ec');
}

/** Magn vökvunar í ml (data.amountMl) úr vökvunarskráningum, elst fyrst. */
export function wateringAmountSeries(logs: LogEntry[]): SeriesPoint[] {
  return dataSeries(logs, new Set<LogEntry['type']>(['water']), 'amountMl');
}

/**
 * Ljóstími úr umhverfis-sýnum (`EnvironmentSample.lightHours`), elst fyrst.
 * Umhverfis-skráningar (log af gerð 'environment') bera líka `data.lightHours`;
 * sú röð fæst með `lightHoursLogSeries`.
 */
export function lightHoursSeries(samples: EnvironmentSample[]): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (const s of samples) {
    const v = asNumber(s.lightHours);
    if (v === undefined) continue;
    out.push({ t: s.timestamp, v });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

/** Ljóstími skráður í 'environment'-loggum (data.lightHours), elst fyrst. */
export function lightHoursLogSeries(logs: LogEntry[]): SeriesPoint[] {
  return dataSeries(logs, new Set<LogEntry['type']>(['environment']), 'lightHours');
}

/** Einn vökvunaratburður á tímalínu: tími + magn (ml) ef skráð. */
export interface WateringEvent {
  t: number;
  amountMl?: number;
}

/**
 * Vökvunaratburðir (gerð 'water') í tímaröð, elst fyrst — fyrir tímalínu-rönd.
 * Magn fylgir með ef það var skráð.
 */
export function wateringEvents(logs: LogEntry[]): WateringEvent[] {
  const out: WateringEvent[] = [];
  for (const l of logs) {
    if (l.type !== 'water') continue;
    out.push({ t: l.timestamp, amountMl: asNumber(l.data?.amountMl) });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

/**
 * Bil milli vökvana í dögum (brot leyfð), reiknað úr tímaröð vökvana.
 * Skilar tómu fylki ef færri en tvær vökvanir eru til.
 */
export function wateringIntervals(logs: LogEntry[]): number[] {
  const events = wateringEvents(logs);
  const gaps: number[] = [];
  for (let i = 1; i < events.length; i++) {
    gaps.push((events[i].t - events[i - 1].t) / DAY_MS);
  }
  return gaps;
}

/**
 * Meðalbil milli vökvana í dögum, eða null ef ekki nógu margar vökvanir.
 * Notað fyrir „Meðalbil milli vökvana: X dagar" í GrowDetail.
 */
export function meanWateringInterval(logs: LogEntry[]): number | null {
  const gaps = wateringIntervals(logs);
  if (gaps.length === 0) return null;
  const sum = gaps.reduce((s, g) => s + g, 0);
  return sum / gaps.length;
}

/** Þægindafall: aðeins gildin (fyrir `ui/Sparkline` sem tekur `number[]`). */
export function values(points: SeriesPoint[]): number[] {
  return points.map((p) => p.v);
}
