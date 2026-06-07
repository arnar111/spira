/**
 * Miðlæg íslensk dagsetningasnið (4.3) — kemur í stað fimm staðbundinna
 * `shortDate`-afrita, tveggja `longDate`-afrita og tveggja afstæðra
 * tímasniða. Öll föll eru hrein: tímastimpill inn, strengur út (relativeTime
 * tekur `now` sem rök með Date.now() sem sjálfgefið fyrir UI-þægindi).
 * Falla aftur á ISO-snið ef is-IS locale vantar í keyrsluumhverfið.
 */

/** Stutt dagsetning: „7. jún.". */
export function shortDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('is-IS', { day: 'numeric', month: 'short' });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

/** Löng dagsetning: „7. júní 2026". */
export function longDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('is-IS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

/** Hlý afstæð tímasetning: „rétt í þessu" / „fyrir 5 mín" / „fyrir 2 dögum". */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'rétt í þessu';
  if (min < 60) return `fyrir ${min} mín`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `fyrir ${hr} klst`;
  const d = Math.floor(hr / 24);
  return `fyrir ${d} ${d === 1 ? 'degi' : 'dögum'}`;
}

/** Íslensk fleirtölu-/eintölumeðferð fyrir „dag(a)". */
export function dayWord(n: number): string {
  return Math.abs(n) === 1 ? 'dag' : 'daga';
}
