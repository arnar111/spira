/**
 * Skjálesara-tilkynningar (1.2). Eitt `aria-live="polite"` svæði lifir í
 * Layout (sjá `AnnounceRegion`); `announce(msg)` setur textann þar inn svo
 * skjálesarar lesi hann upp eftir aðgerð (t.d. „Skráning vistuð").
 *
 * Pörun er gerð með einföldum áskriftarlista frekar en React-context svo
 * hægt sé að kalla `announce()` úr hvaða einingu sem er, líka utan React.
 */
type AnnounceListener = (message: string) => void;

const listeners = new Set<AnnounceListener>();

/** Tilkynna skjálesurum stutt skilaboð (íslenska). Tómur strengur er hunsaður. */
export function announce(message: string): void {
  const trimmed = message.trim();
  if (!trimmed) return;
  for (const listener of listeners) listener(trimmed);
}

/** Notað af `AnnounceRegion` til að taka við skilaboðum. Skilar afskráningu. */
export function subscribeAnnounce(listener: AnnounceListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
