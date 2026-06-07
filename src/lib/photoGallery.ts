/**
 * Hreinir hjálparar fyrir myndasafn (3.2): mánaðar-hópun og íslensk
 * mánaðarheiti. Engin IO/klukka — allt reiknað úr inntakinu og prófanlegt.
 * (Miðlæg dagsetningameðferð kemur í 4.3 á annarri grein; þetta er staðbundið.)
 */

import type { PhotoBlob } from '@/lib/db';

const MONTHS_IS = [
  'janúar',
  'febrúar',
  'mars',
  'apríl',
  'maí',
  'júní',
  'júlí',
  'ágúst',
  'september',
  'október',
  'nóvember',
  'desember',
] as const;

/** Íslenskt „mánuður ár" fyrir hóphaus, t.d. „júní 2026". */
export function monthLabel(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS_IS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Stöðugur lykill fyrir mánuð (ár*12+mán) — til röðunar/hópunar. */
export function monthKey(ts: number): number {
  const d = new Date(ts);
  return d.getFullYear() * 12 + d.getMonth();
}

/** Hópur mynda fyrir einn mánuð, nýjustu fyrst innan hóps. */
export interface PhotoMonthGroup {
  key: number;
  label: string;
  photos: PhotoBlob[];
}

/**
 * Hópar myndir eftir mánuði, nýjustu mánuðir fyrst og nýjustu myndir efst
 * innan hvers mánaðar. Hrein — afritar ekki blob, raðar bara lýsigögnum.
 */
export function groupPhotosByMonth(photos: PhotoBlob[]): PhotoMonthGroup[] {
  const groups = new Map<number, PhotoBlob[]>();
  for (const p of photos) {
    const k = monthKey(p.takenAt);
    const list = groups.get(k);
    if (list) list.push(p);
    else groups.set(k, [p]);
  }
  const out: PhotoMonthGroup[] = [];
  for (const [key, list] of groups) {
    list.sort((a, b) => b.takenAt - a.takenAt);
    out.push({ key, label: monthLabel(list[0].takenAt), photos: list });
  }
  out.sort((a, b) => b.key - a.key);
  return out;
}

/** Flöt, tímaröðuð (nýjast fyrst) myndaröð — fyrir ljóskassa-flettingu. */
export function flattenGroups(groups: PhotoMonthGroup[]): PhotoBlob[] {
  return groups.flatMap((g) => g.photos);
}

/** Snyrtileg MB-tala úr bætum (1 aukastafur). */
export function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
