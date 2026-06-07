import { useEffect, useState } from 'react';

/**
 * Skilar `true` aðeins ef `active` hefur staðið yfir lengur en `delayMs`.
 * Notað til að sýna beinagrind aðeins þegar hleðsla dregst (~150ms) svo hún
 * blikki ekki upp við augnabliks-hleðslu úr IndexedDB.
 */
export function useDelayedFlag(active: boolean, delayMs = 150): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const t = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(t);
  }, [active, delayMs]);
  return shown;
}
