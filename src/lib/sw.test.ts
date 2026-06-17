/**
 * Corner 2 — PWA / Service Worker (node environment).
 *
 * sw.ts imports 'virtual:pwa-register' (Vite-only); we mock it.
 * We also provide minimal localStorage and navigator.serviceWorker stubs
 * so the pure logic in setupServiceWorker() can be exercised.
 *
 * The kill-switch is the only branch we can purely test — the actual SW
 * registration path needs a real browser (covered in e2e/a11y spec).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ─── mock virtual:pwa-register BEFORE importing sw.ts ─────────────────────
vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(),
}));

import { registerSW } from 'virtual:pwa-register';
import { setupServiceWorker } from './sw';

// ─── minimal localStorage stub (node has none) ─────────────────────────────
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

// ─── minimal navigator.serviceWorker stub ─────────────────────────────────
function makeRegistration(scriptURL: string) {
  return {
    active: { scriptURL },
    installing: null,
    waiting: null,
    unregister: vi.fn().mockResolvedValue(true),
  };
}

function stubGlobals(regs: ReturnType<typeof makeRegistration>[] = []) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      serviceWorker: {
        getRegistrations: vi.fn().mockResolvedValue(regs),
      },
    },
    writable: true,
    configurable: true,
  });
  // window.location.origin is used to build '/sw.js' URL
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: { origin: 'http://localhost:5173' },
    },
    writable: true,
    configurable: true,
  });
}

const KILL_KEY = 'spira:disable-sw';

// ─── tests ─────────────────────────────────────────────────────────────────

describe('kill-switch: localStorage[spira:disable-sw]', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    stubGlobals([]);
  });

  it('calls registerSW when kill-switch is absent', () => {
    // No kill-switch key set
    setupServiceWorker(() => {});
    expect(registerSW).toHaveBeenCalled();
  });

  it('does NOT call registerSW when kill-switch is "1"', () => {
    localStorageMock.setItem(KILL_KEY, '1');
    setupServiceWorker(() => {});
    expect(registerSW).not.toHaveBeenCalled();
  });

  it('calls registerSW when kill-switch is "true" (only "1" triggers it)', () => {
    localStorageMock.setItem(KILL_KEY, 'true');
    setupServiceWorker(() => {});
    // "true" !== "1" → kill-switch off → registerSW called
    expect(registerSW).toHaveBeenCalled();
  });

  it('calls registerSW when kill-switch is "0"', () => {
    localStorageMock.setItem(KILL_KEY, '0');
    setupServiceWorker(() => {});
    expect(registerSW).toHaveBeenCalled();
  });
});

describe('ghost SW cleanup', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('does not unregister our own /sw.js', async () => {
    const ours = makeRegistration('http://localhost:5173/sw.js');
    stubGlobals([ours]);
    setupServiceWorker(() => {});
    await new Promise((r) => setTimeout(r, 5));
    expect(ours.unregister).not.toHaveBeenCalled();
  });

  it('unregisters a ghost SW (different script URL)', async () => {
    const ghost = makeRegistration('http://localhost:5173/old-sw.js');
    stubGlobals([ghost]);
    setupServiceWorker(() => {});
    await new Promise((r) => setTimeout(r, 5));
    expect(ghost.unregister).toHaveBeenCalled();
  });

  it('keeps ours and removes ghost when both are registered', async () => {
    const ours = makeRegistration('http://localhost:5173/sw.js');
    const ghost = makeRegistration('http://localhost:5173/legacy-sw.js');
    stubGlobals([ours, ghost]);
    setupServiceWorker(() => {});
    await new Promise((r) => setTimeout(r, 5));
    expect(ours.unregister).not.toHaveBeenCalled();
    expect(ghost.unregister).toHaveBeenCalled();
  });

  it('when kill-switch is on, unregisterAll is called (not registerSW)', async () => {
    localStorageMock.setItem(KILL_KEY, '1');
    const ours = makeRegistration('http://localhost:5173/sw.js');
    stubGlobals([ours]);
    setupServiceWorker(() => {});
    await new Promise((r) => setTimeout(r, 5));
    // With kill-switch on, unregisterAll runs which DOES unregister everything
    expect(ours.unregister).toHaveBeenCalled();
    expect(registerSW).not.toHaveBeenCalled();
  });
});
