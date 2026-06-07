import { registerSW } from 'virtual:pwa-register';

/**
 * Service-worker uppsetning (5.3 — PWA endurvakning).
 *
 * Saga: eldri útgáfa (eða önnur síða á localhost) gat skilið eftir
 * „draugs"-service-worker sem hleraði leiðir og olli netvillum. Áður afskráðum
 * við ALLA SW á ræsingu. Nú skráum við okkar eigin SW (vite-plugin-pwa /
 * Workbox) en hreinsum samt eldri „drauga" í eitt skipti.
 *
 * NEYÐARROFI: settu `localStorage['spira:disable-sw'] = '1'` í vafranum til að
 * sleppa allri SW-skráningu og afskrá það sem fyrir er (t.d. ef SW klikkar).
 * Næsta hleðsla keyrir þá hreina, SW-lausa útgáfu.
 */

const KILL_SWITCH_KEY = 'spira:disable-sw';

/** Útgáfa-tilkynning: kallað þegar nýr SW bíður tilbúinn. */
type NeedRefresh = () => void;

function killSwitchOn(): boolean {
  try {
    return localStorage.getItem(KILL_SWITCH_KEY) === '1';
  } catch {
    return false;
  }
}

/** Afskráir AÐEINS SW sem eru ekki okkar nýi (eins-skiptis draugahreinsun). */
async function cleanupGhostWorkers(ourScriptUrl: string | null): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL;
      if (!url) continue;
      if (ourScriptUrl && url === ourScriptUrl) continue; // okkar — höldum
      void reg.unregister();
    }
  } catch (err) {
    console.warn('[spira] gat ekki hreinsað gamla service-workera', err);
  }
}

/** Afskráir allt og hreinsar SW-cache — notað þegar neyðarrofinn er á. */
async function unregisterAll(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) void reg.unregister();
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (err) {
    console.warn('[spira] gat ekki afskráð service-workera', err);
  }
}

/**
 * Setur upp service-worker. Skilar strax ef SW er ekki studdur eða
 * neyðarrofinn er á (og afskráir þá allt sem fyrir er).
 */
export function setupServiceWorker(onNeedRefresh: NeedRefresh): void {
  if (!('serviceWorker' in navigator)) return;

  if (killSwitchOn()) {
    void unregisterAll();
    return;
  }

  // Okkar SW-slóð (vite-plugin-pwa skrifar /sw.js í rót).
  const ourScriptUrl = new URL('/sw.js', window.location.origin).href;
  void cleanupGhostWorkers(ourScriptUrl);

  registerSW({
    immediate: true,
    onNeedRefresh() {
      onNeedRefresh();
    },
    onRegisterError(err) {
      console.warn('[spira] SW-skráning mistókst', err);
    },
  });
}
