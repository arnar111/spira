import {
  db,
  type Grow,
  type Plant,
  type LogEntry,
  type EnvironmentSample,
  type HarvestEntry,
  type AppMeta,
} from './db';
import { syncData } from './account';

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
type Listener = (status: SyncStatus, lastSyncedAt: number | null) => void;

class SyncManager {
  private code: string | null = null;
  private status: SyncStatus = 'idle';
  private lastSyncedAt: number | null = null;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private pendingAfterFlight = false;

  setAccount(code: string | null) {
    if (this.code === code) return;
    this.code = code;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.setStatus('idle', null);
  }

  private isDemo(): boolean {
    return this.code === '123';
  }

  schedule(): void {
    if (!this.code) return;
    if (this.isDemo()) return;
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
    listener(this.status, this.lastSyncedAt);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async run(): Promise<void> {
    if (!this.code) return;
    this.setStatus('syncing', this.lastSyncedAt);
    try {
      const snapshot = await exportSnapshot();
      await syncData(this.code, snapshot);
      const now = Date.now();
      this.lastSyncedAt = now;
      this.setStatus('idle', now);
    } catch (err) {
      console.error('[sync] failed', err);
      this.setStatus('error', this.lastSyncedAt);
    }
  }

  private setStatus(status: SyncStatus, lastSyncedAt: number | null) {
    this.status = status;
    this.lastSyncedAt = lastSyncedAt;
    for (const listener of this.listeners) listener(status, lastSyncedAt);
  }
}

export const syncManager = new SyncManager();
export type { SyncStatus };

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
}
