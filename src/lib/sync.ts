import {
  db,
  type Grow,
  type Plant,
  type LogEntry,
  type EnvironmentSample,
  type HarvestEntry,
  type AppMeta,
} from './db';
import { signIn, syncData } from './account';

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

// Device-local meta keys that must never travel in the synced snapshot.
// `cloudUpdatedAt` records the server `updated_at` of the snapshot this device
// currently holds, so startup pulls can tell whether the cloud is newer.
const CLOUD_BASELINE_KEY = 'cloudUpdatedAt';
const LOCAL_ONLY_META_KEYS = new Set<string>(['lastSyncedAt', CLOUD_BASELINE_KEY]);

export async function getCloudBaseline(): Promise<string | null> {
  const row = await db.meta.get(CLOUD_BASELINE_KEY);
  return typeof row?.value === 'string' ? row.value : null;
}

export async function setCloudBaseline(updatedAt: string | null | undefined): Promise<void> {
  if (typeof updatedAt !== 'string' || updatedAt.length === 0) return;
  await db.meta.put({ key: CLOUD_BASELINE_KEY, value: updatedAt });
}

// Lexicographic comparison is unreliable across timestamp formats, so compare
// the parsed epoch values; a remote with no known local baseline is "newer".
function isRemoteNewer(remote: string | null, baseline: string | null): boolean {
  if (!remote) return false;
  if (!baseline) return true;
  const r = Date.parse(remote);
  const b = Date.parse(baseline);
  if (Number.isNaN(r) || Number.isNaN(b)) return remote !== baseline;
  return r > b;
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
    meta: meta.filter((m) => !LOCAL_ONLY_META_KEYS.has(m.key)),
  };
}

export async function importSnapshot(snapshot: unknown): Promise<boolean> {
  if (!isSnapshot(snapshot)) return false;
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
  return true;
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

function isSnapshot(value: unknown): value is SnapshotV1 {
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
  private pullInFlight: Promise<boolean> | null = null;
  // While suspended, Dexie write hooks don't schedule a push — used so importing
  // a freshly-pulled snapshot doesn't immediately echo it back to the server.
  private suspended = false;

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
    if (this.suspended) return;
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
      const { updated_at } = await syncData(this.code, snapshot);
      await setCloudBaseline(updated_at);
      const now = Date.now();
      this.lastSyncedAt = now;
      this.setStatus('idle', now);
    } catch (err) {
      console.error('[sync] failed', err);
      this.setStatus('error', this.lastSyncedAt);
    }
  }

  private async runSuspended<T>(fn: () => Promise<T>): Promise<T> {
    this.suspended = true;
    try {
      return await fn();
    } finally {
      this.suspended = false;
    }
  }

  /**
   * Fetch the cloud snapshot and adopt it locally if the server's copy is newer
   * than what this device last synced — this is what lets a second device (or a
   * returning session) see edits made elsewhere. Skips when there are unsynced
   * local changes (a queued/failed push) so we never clobber them, unless
   * `force` is set. Network/lookup failures are swallowed so startup never
   * blocks on connectivity. Returns true when local data was replaced.
   */
  async pullLatest(opts?: { force?: boolean }): Promise<boolean> {
    if (!this.code || this.isDemo()) return false;
    if (
      !opts?.force &&
      (this.timer || this.status === 'pending' || this.status === 'error')
    ) {
      return false;
    }
    if (this.pullInFlight) return this.pullInFlight;
    if (this.inFlight) {
      try {
        await this.inFlight;
      } catch {
        /* push error is reported separately */
      }
    }
    this.pullInFlight = this.runPull();
    try {
      return await this.pullInFlight;
    } finally {
      this.pullInFlight = null;
    }
  }

  private async runPull(): Promise<boolean> {
    const code = this.code;
    if (!code) return false;
    this.setStatus('syncing', this.lastSyncedAt);
    try {
      const remote = await signIn(code);
      const remoteUpdatedAt =
        typeof remote.updated_at === 'string' ? remote.updated_at : null;
      let changed = false;
      if (isRemoteNewer(remoteUpdatedAt, await getCloudBaseline())) {
        changed = await this.runSuspended(() => importSnapshot(remote.data));
      }
      await setCloudBaseline(remoteUpdatedAt);
      const now = Date.now();
      this.lastSyncedAt = now;
      this.setStatus('idle', now);
      return changed;
    } catch (err) {
      console.error('[sync] pull failed', err);
      // A failed pull shouldn't surface as a sync error — local data is intact.
      this.setStatus('idle', this.lastSyncedAt);
      return false;
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
