// fake-indexeddb VERÐUR að hlaðast á undan db.ts (Dexie þarf indexedDB í node).
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  db,
  type EnvironmentSample,
  type Grow,
  type HarvestEntry,
  type LogEntry,
  type Plant,
} from '@/lib/db';
import {
  clearLocalData,
  exportSnapshot,
  importSnapshot,
  installAutoSyncHooks,
  isSnapshot,
  migrateSnapshot,
  syncManager,
  type SnapshotV1,
} from '@/lib/sync';
import { pullData, syncData } from '@/lib/account';

// Netlagið er mockað — pull/push prófin hér fyrir neðan stýra svörunum.
vi.mock('@/lib/account', () => ({
  pullData: vi.fn(),
  syncData: vi.fn(),
}));

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 5, 7, 12);

const grow: Grow = {
  id: 'g1',
  name: 'Prófræktun',
  category: 'pepper',
  location: 'Tjald',
  startDate: NOW - 40 * DAY_MS,
  archived: false,
  createdAt: NOW - 40 * DAY_MS,
  updatedAt: NOW - 40 * DAY_MS,
};

const plant: Plant = {
  id: 'p1',
  growId: 'g1',
  variety: 'Prófpipar',
  category: 'pepper',
  startedFrom: 'seed',
  currentPhase: 'vegetative',
  archived: false,
  createdAt: NOW - 40 * DAY_MS,
  updatedAt: NOW - 40 * DAY_MS,
};

const log: LogEntry = {
  id: 'l1',
  growId: 'g1',
  plantId: 'p1',
  timestamp: NOW - DAY_MS,
  type: 'water',
  data: { amountMl: 200, ph: 6.2 },
};

const sample: EnvironmentSample = {
  id: 'e1',
  growId: 'g1',
  timestamp: NOW - DAY_MS,
  tempC: 24,
  humidityPct: 60,
};

const harvest: HarvestEntry = {
  id: 'h1',
  growId: 'g1',
  plantId: 'p1',
  timestamp: NOW,
  weightG: 120,
  podCount: 8,
};

async function seed(): Promise<void> {
  await Promise.all([
    db.grows.put(grow),
    db.plants.put(plant),
    db.logs.put(log),
    db.environment.put(sample),
    db.harvests.put(harvest),
    db.meta.put({ key: 'onboardingComplete', value: true }),
    db.meta.put({ key: 'lastSyncedAt', value: NOW }),
    db.photos.put({
      id: 'ph1',
      growId: 'g1',
      plantId: 'p1',
      blob: new Blob(['mynd'], { type: 'text/plain' }),
      takenAt: NOW,
    }),
  ]);
}

beforeEach(async () => {
  await clearLocalData();
  await db.varieties.clear();
  await db.rosMessages.clear();
});

describe('exportSnapshot', () => {
  it('flytur út allar sync-töflur, EKKI myndir, og strippar lastSyncedAt', async () => {
    await seed();
    const snap = await exportSnapshot();
    expect(snap.version).toBe(1);
    expect(snap.grows).toEqual([grow]);
    expect(snap.plants).toEqual([plant]);
    expect(snap.logs).toEqual([log]);
    expect(snap.environment).toEqual([sample]);
    expect(snap.harvests).toEqual([harvest]);
    expect(snap.meta).toEqual([{ key: 'onboardingComplete', value: true }]);
    expect('photos' in snap).toBe(false);
    expect('rosMessages' in snap).toBe(false);
  });
});

describe('isSnapshot', () => {
  it('samþykkir alvöru snapshot', async () => {
    await seed();
    expect(isSnapshot(await exportSnapshot())).toBe(true);
  });

  it('hafnar rusli', () => {
    expect(isSnapshot(null)).toBe(false);
    expect(isSnapshot(undefined)).toBe(false);
    expect(isSnapshot('snapshot')).toBe(false);
    expect(isSnapshot({})).toBe(false);
    expect(isSnapshot({ version: 2, grows: [], plants: [], logs: [], environment: [], harvests: [], meta: [] })).toBe(false);
    expect(isSnapshot({ version: 1, grows: [], plants: [], logs: [], environment: [], harvests: [] })).toBe(false); // meta vantar
    expect(isSnapshot({ version: 1, grows: 'x', plants: [], logs: [], environment: [], harvests: [], meta: [] })).toBe(false);
  });
});

describe('importSnapshot', () => {
  it('hringferð: export → breyta gögnum → import endurheimtir allt', async () => {
    await seed();
    const snap = await exportSnapshot();

    // Breytum staðbundnu gögnunum eftir „export".
    await db.grows.put({ ...grow, id: 'g2', name: 'Auka' });
    await db.logs.delete('l1');
    await db.plants.update('p1', { nickname: 'Breytt' });

    await importSnapshot(snap);

    expect(await db.grows.toArray()).toEqual([grow]);
    expect(await db.plants.toArray()).toEqual([plant]);
    expect(await db.logs.toArray()).toEqual([log]);
    expect(await db.environment.toArray()).toEqual([sample]);
    expect(await db.harvests.toArray()).toEqual([harvest]);
  });

  it('skiptir út staðbundnum gögnum (clear-then-add, ekki samruni)', async () => {
    await db.grows.put({ ...grow, id: 'gammel', name: 'Gömul ræktun' });
    const snap: SnapshotV1 = {
      version: 1,
      grows: [grow],
      plants: [],
      logs: [],
      environment: [],
      harvests: [],
      meta: [],
    };
    await importSnapshot(snap);
    const grows = await db.grows.toArray();
    expect(grows).toEqual([grow]); // gamla ræktunin er horfin
  });

  it('myndir lifa import af (þær eru ekki í snapshot)', async () => {
    await seed();
    const snap = await exportSnapshot();
    await importSnapshot(snap);
    expect(await db.photos.count()).toBe(1);
  });

  it('rusl er no-op (engin gögn hreinsuð)', async () => {
    await seed();
    await importSnapshot({ version: 99, nonsense: true });
    await importSnapshot('garbage');
    await importSnapshot(null);
    expect(await db.grows.count()).toBe(1);
    expect(await db.logs.count()).toBe(1);
  });

  it('meta er bulkPut (sameinað), ekki hreinsað', async () => {
    await seed();
    const snap = await exportSnapshot();
    await db.meta.put({ key: 'staðbundið', value: 'helst' });
    await importSnapshot(snap);
    expect((await db.meta.get('staðbundið'))?.value).toBe('helst');
    expect((await db.meta.get('onboardingComplete'))?.value).toBe(true);
  });
});

describe('migrateSnapshot', () => {
  it('skilar gildu v1 afriti óbreyttu', async () => {
    await seed();
    const snap = await exportSnapshot();
    expect(migrateSnapshot(snap)).toBe(snap);
  });

  it('kastar á rusli (ógilt afrit)', () => {
    expect(() => migrateSnapshot(null)).toThrow();
    expect(() => migrateSnapshot('garbage')).toThrow();
    expect(() => migrateSnapshot({})).toThrow();
    expect(() =>
      migrateSnapshot({ version: 2, grows: [], plants: [], logs: [], environment: [], harvests: [], meta: [] }),
    ).toThrow();
  });
});

describe('clearLocalData', () => {
  it('hreinsar allar töflur, líka myndir og meta', async () => {
    await seed();
    await clearLocalData();
    expect(await db.grows.count()).toBe(0);
    expect(await db.plants.count()).toBe(0);
    expect(await db.logs.count()).toBe(0);
    expect(await db.environment.count()).toBe(0);
    expect(await db.harvests.count()).toBe(0);
    expect(await db.meta.count()).toBe(0);
    expect(await db.photos.count()).toBe(0);
  });
});

describe('syncManager.pull', () => {
  const cloudGrow: Grow = { ...grow, id: 'g-cloud', name: 'Skýjaræktun' };
  const cloudSnap: SnapshotV1 = {
    version: 1,
    grows: [cloudGrow],
    plants: [],
    logs: [],
    environment: [],
    harvests: [],
    meta: [],
  };

  beforeEach(() => {
    vi.mocked(pullData).mockReset();
    vi.mocked(syncData).mockReset();
    vi.mocked(syncData).mockResolvedValue({ updated_at: '2026-06-09T12:00:00.000Z' });
  });

  afterEach(() => {
    syncManager.setAccount(null);
  });

  it('gerir ekkert fyrir demo-reikninginn', async () => {
    syncManager.setAccount('123');
    await syncManager.pull({ force: true });
    expect(pullData).not.toHaveBeenCalled();
  });

  it('sleppir þegar staðbundin breyting bíður eftir push (push vinnur)', async () => {
    syncManager.setAccount('AAA');
    syncManager.schedule(); // staðbundin breyting í bið
    await syncManager.pull({ force: true });
    expect(pullData).not.toHaveBeenCalled();
  });

  it('óbreytt ský er no-op', async () => {
    await seed();
    syncManager.setAccount('AAA');
    vi.mocked(pullData).mockResolvedValue({ unchanged: true, updated_at: 'T0' });
    await syncManager.pull({ force: true });
    expect(await db.grows.toArray()).toEqual([grow]);
  });

  it('flytur inn ský-gögn á tómu tæki', async () => {
    syncManager.setAccount('AAA');
    vi.mocked(pullData).mockResolvedValue({ data: cloudSnap, updated_at: 'T1' });
    await syncManager.pull({ force: true });
    expect(await db.grows.toArray()).toEqual([cloudGrow]);
  });

  it('fyrsta pull með staðbundin gögn ýtir þeim upp í stað þess að skrifa yfir', async () => {
    // Engin grunnlína (since=null í node — ekkert localStorage) + gögn til:
    // staðbundnu gögnin eiga að vinna (LWW), ekki hverfa þegjandi.
    await seed();
    syncManager.setAccount('AAA');
    vi.mocked(pullData).mockResolvedValue({ data: cloudSnap, updated_at: 'T1' });
    await syncManager.pull({ force: true });
    expect(await db.grows.toArray()).toEqual([grow]); // ekkert skrifað yfir
    expect(syncData).toHaveBeenCalledTimes(1); // ýtt í staðinn
  });

  it('pull-innflutningur ræsir ekki push í gegnum Dexie-hookana', async () => {
    installAutoSyncHooks();
    syncManager.setAccount('BBB');
    vi.mocked(pullData).mockResolvedValue({ data: cloudSnap, updated_at: 'T2' });
    await syncManager.pull({ force: true });
    expect(await db.grows.toArray()).toEqual([cloudGrow]);
    expect(syncData).not.toHaveBeenCalled();
    let status = '';
    const unsub = syncManager.subscribe((s) => {
      status = s.status;
    });
    unsub();
    expect(status).toBe('idle');
  });
});
