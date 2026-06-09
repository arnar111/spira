import {
  db,
  type Grow,
  type Plant,
  type LogEntry,
  type EnvironmentSample,
  type HarvestEntry,
  type AppMeta,
} from './db';
import { pullData, syncData } from './account';
import { announce } from './announce';

export interface SnapshotV1 {
  version: 1;
  grows: Grow[];
  plants: Plant[];
  logs: LogEntry[];
  environment: EnvironmentSample[];
  harvests: HarvestEntry[];
  meta: AppMeta[];
}

const SNAPSHOT_VERSION = 1;
const SYNC_DEBOUNCE_MS = 1200;
/** Lágmarksbil milli sjálfvirkra pull-tékka (visibilitychange getur skotið ört). */
const PULL_MIN_INTERVAL_MS = 60_000;

/**
 * Síðasta updated_at sem þetta tæki sá í skýinu — tækisbundið (localStorage,
 * EKKI í synced meta). Notað til að þekkja hvort annað tæki hafi ýtt á eftir
 * okkur, svo innskráð tæki sæki breytingar í stað þess að bara ýta (samleitni
 * milli tækja; áður sótti tæki gögn aðeins einu sinni — við innskráningu).
 */
const CLOUD_STAMP_KEY = 'spira:cloudUpdatedAt';

export function recordCloudUpdatedAt(stamp: string | null | undefined): void {
  if (typeof localStorage === 'undefined') return;
  if (stamp) localStorage.setItem(CLOUD_STAMP_KEY, stamp);
  else localStorage.removeItem(CLOUD_STAMP_KEY);
}

function getCloudUpdatedAt(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(CLOUD_STAMP_KEY);
}

export async function exportSnapshot(): Promise<SnapshotV1> {
  const [grows, plants, logs, environment, harvests, meta] = await Promise.all([
    db.grows.toArray(),
    db.plants.toArray(),
    db.logs.toArray(),
    db.environment.toArray(),
    db.harvests.toArray(),
    db.meta.toArray(),
  ]);
  return {
    version: SNAPSHOT_VERSION,
    grows,
    plants,
    logs,
    environment,
    harvests,
    meta: meta.filter((m) => m.key !== 'lastSyncedAt'),
  };
}

export async function importSnapshot(snapshot: unknown): Promise<void> {
  if (!isSnapshot(snapshot)) return;
  await db.transaction(
    'rw',
    [db.grows, db.plants, db.logs, db.environment, db.harvests, db.meta],
    async () => {
      await Promise.all([
        db.grows.clear(),
        db.plants.clear(),
        db.logs.clear(),
        db.environment.clear(),
        db.harvests.clear(),
      ]);
      await Promise.all([
        snapshot.grows.length ? db.grows.bulkAdd(snapshot.grows) : null,
        snapshot.plants.length ? db.plants.bulkAdd(snapshot.plants) : null,
        snapshot.logs.length ? db.logs.bulkAdd(snapshot.logs) : null,
        snapshot.environment.length ? db.environment.bulkAdd(snapshot.environment) : null,
        snapshot.harvests.length ? db.harvests.bulkAdd(snapshot.harvests) : null,
        snapshot.meta.length ? db.meta.bulkPut(snapshot.meta) : null,
      ]);
    },
  );
}

export async function clearLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.grows, db.plants, db.logs, db.environment, db.harvests, db.meta, db.photos],
    async () => {
      await Promise.all([
        db.grows.clear(),
        db.plants.clear(),
        db.logs.clear(),
        db.environment.clear(),
        db.harvests.clear(),
        db.meta.clear(),
        db.photos.clear(),
      ]);
    },
  );
}

export function isSnapshot(value: unknown): value is SnapshotV1 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<SnapshotV1>;
  return (
    v.version === SNAPSHOT_VERSION &&
    Array.isArray(v.grows) &&
    Array.isArray(v.plants) &&
    Array.isArray(v.logs) &&
    Array.isArray(v.environment) &&
    Array.isArray(v.harvests) &&
    Array.isArray(v.meta)
  );
}

/**
 * Eina hliðið fyrir innflutt afrit (5.2). Í dag staðfestir þetta bara v1, en
 * þetta er staðurinn til að bæta við v2→v1 umbreytingu seinna án þess að snerta
 * innflutnings-UI-ið. Kastar ef gögnin eru ekki gilt Spíra-afrit.
 */
export function migrateSnapshot(raw: unknown): SnapshotV1 {
  if (isSnapshot(raw)) return raw;
  throw new Error('Ógilt afrit — þetta er ekki gilt Spíra-afrit.');
}

type SyncStatus = 'idle' | 'pending' | 'syncing' | 'error';

/**
 * Síðasta villuboð frá netþjóni er geymt svo „Synci klikkaði"-merkið geti birt
 * ástæðuna og boðið „Reyna aftur" (1.1 — gagnsæi á sync-villum).
 */
interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;
}
type Listener = (state: SyncState) => void;

class SyncManager {
  private code: string | null = null;
  private status: SyncStatus = 'idle';
  private lastSyncedAt: number | null = null;
  private lastError: string | null = null;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private pendingAfterFlight = false;
  private pullInFlight: Promise<void> | null = null;
  private lastPullAt = 0;
  /** > 0 á meðan pull-innflutningur stendur — Dexie-hookarnir eiga ekki að ýta honum strax upp aftur. */
  private suspendDepth = 0;

  setAccount(code: string | null) {
    if (this.code === code) return;
    this.code = code;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.lastError = null;
    this.lastPullAt = 0;
    if (code === null) recordCloudUpdatedAt(null);
    this.setStatus('idle', null);
  }

  private isDemo(): boolean {
    return this.code === '123';
  }

  schedule(): void {
    if (!this.code) return;
    if (this.isDemo()) return;
    if (this.suspendDepth > 0) return;
    if (this.timer) clearTimeout(this.timer);
    this.setStatus('pending', this.lastSyncedAt);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, SYNC_DEBOUNCE_MS);
  }

  async flush(): Promise<void> {
    if (!this.code) return;
    if (this.isDemo()) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.inFlight) {
      this.pendingAfterFlight = true;
      await this.inFlight;
      return;
    }
    this.inFlight = this.run();
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
      if (this.pendingAfterFlight) {
        this.pendingAfterFlight = false;
        await this.flush();
      }
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Handvirk samstilling núna — notað af „Reyna aftur"-hnappnum. */
  async syncNow(): Promise<void> {
    if (!this.code || this.isDemo()) return;
    this.lastError = null;
    await this.flush();
  }

  /**
   * Sækir nýjustu gögn úr skýinu hafi annað tæki ýtt á eftir okkur (ræst við
   * ræsingu, `online` og þegar flipinn verður sýnilegur). Push vinnur alltaf:
   * bíði staðbundin breyting (timer/inFlight/villa) sleppum við — innflutningur
   * myndi annars eyða henni. Whole-snapshot last-write-wins eins og push-leiðin.
   */
  async pull(opts?: { force?: boolean }): Promise<void> {
    if (!this.code || this.isDemo()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (this.pullInFlight) {
      await this.pullInFlight;
      return;
    }
    if (this.timer || this.inFlight || this.status === 'pending' || this.status === 'syncing') return;
    if (this.lastError) return;
    const now = Date.now();
    if (!opts?.force && now - this.lastPullAt < PULL_MIN_INTERVAL_MS) return;
    this.lastPullAt = now;
    this.pullInFlight = this.runPull();
    try {
      await this.pullInFlight;
    } finally {
      this.pullInFlight = null;
    }
  }

  private async runPull(): Promise<void> {
    const code = this.code;
    if (!code) return;
    try {
      const since = getCloudUpdatedAt();
      const res = await pullData(code, since);
      if (res.unchanged || !res.updated_at) return;
      // Endurtékk eftir netbið: hafi notandinn breytt einhverju á meðan vinnur
      // push-leiðin — næsta pull nær skýinu þegar allt er aftur í ró.
      if (this.code !== code || this.timer || this.inFlight) return;
      if (!since) {
        // Fyrsta pull á þessu tæki (t.d. eftir uppfærslu) OG staðbundin gögn
        // til: við vitum ekki hvort skýið er nýrra — ýtum staðbundnu gögnunum
        // frekar upp (LWW) en að skrifa yfir þau þegjandi. Stimpillinn skráist
        // við ýtinguna og samleitnin tekur við þaðan.
        const hasLocalData = (await db.grows.count()) > 0 || (await db.plants.count()) > 0;
        if (hasLocalData) {
          await this.flush();
          return;
        }
      }
      if (!isSnapshot(res.data)) return;
      this.suspendDepth++;
      try {
        await importSnapshot(res.data);
      } finally {
        this.suspendDepth--;
      }
      recordCloudUpdatedAt(res.updated_at);
      announce('Gögn samstillt úr skýinu');
    } catch (err) {
      console.warn('[sync] pull failed', err);
    }
  }

  private snapshot(): SyncState {
    return {
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  private async run(): Promise<void> {
    if (!this.code) return;
    const wasError = this.status === 'error' || this.lastError !== null;
    this.setStatus('syncing', this.lastSyncedAt);
    try {
      const snapshot = await exportSnapshot();
      const { updated_at } = await syncData(this.code, snapshot);
      recordCloudUpdatedAt(updated_at);
      const now = Date.now();
      this.lastSyncedAt = now;
      this.lastError = null;
      this.setStatus('idle', now);
      if (wasError) announce('Samstilling tókst');
    } catch (err) {
      console.error('[sync] failed', err);
      this.lastError =
        err instanceof Error && err.message
          ? err.message
          : 'Óþekkt villa við samstillingu.';
      this.setStatus('error', this.lastSyncedAt);
    }
  }

  private setStatus(status: SyncStatus, lastSyncedAt: number | null) {
    this.status = status;
    this.lastSyncedAt = lastSyncedAt;
    const state = this.snapshot();
    for (const listener of this.listeners) listener(state);
  }
}

export const syncManager = new SyncManager();
export type { SyncStatus, SyncState };

let hooksInstalled = false;

export function installAutoSyncHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  const tables = [db.grows, db.plants, db.logs, db.environment, db.harvests];
  const trigger = () => syncManager.schedule();
  for (const table of tables) {
    table.hook('creating', trigger);
    table.hook('updating', trigger);
    table.hook('deleting', trigger);
  }
  // Pull-kveikjur: nettenging kemur aftur / flipinn verður sýnilegur (notandi
  // skiptir á milli tækja). Ræsingar-pull er kallað beint úr App.tsx.
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void syncManager.pull());
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void syncManager.pull();
    });
  }
}
