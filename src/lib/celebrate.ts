/**
 * Fögnuðar-rásin (5.x) — örsmár viðburðabus, hliðstæður announce.ts: hver sem
 * er getur kallað `celebrate('water')` og CelebrationHost (í App) birtir stutta
 * sjónræna fagnaðarhreyfingu (dropar við vökvun, frjókorn við frjóvgun …).
 * Engin DOM-áhrif ef enginn hlustandi er tengdur (t.d. í prófum) — og
 * skjálesarar fá sína staðfestingu áfram gegnum announce().
 */

import type { LogType } from '@/lib/db';

export type CelebrationKind = LogType;

type Listener = (kind: CelebrationKind) => void;

const listeners = new Set<Listener>();

/** Kveikir fagnaðarhreyfingu fyrir tegund skráningar. Öruggt án hlustanda. */
export function celebrate(kind: CelebrationKind): void {
  for (const listener of listeners) {
    try {
      listener(kind);
    } catch (err) {
      console.warn('[spira] fögnuður mistókst', err);
    }
  }
}

/** Áskrift CelebrationHost — skilar aftengingarfalli. */
export function onCelebrate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
