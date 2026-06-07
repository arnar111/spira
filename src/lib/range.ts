/** Tímagluggi fyrir línurit: 7/14/30 dagar eða allt. `null` = allt. */
export type RangeDays = 7 | 14 | 30 | null;

/** Sía tímaröðun (timestamp-stillt gögn) eftir völdum glugga. */
export function withinRange<T extends { timestamp: number }>(
  items: T[],
  range: RangeDays,
  now = Date.now(),
): T[] {
  if (range === null) return items;
  const cutoff = now - range * 24 * 60 * 60 * 1000;
  return items.filter((i) => i.timestamp >= cutoff);
}
