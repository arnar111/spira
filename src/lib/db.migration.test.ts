// fake-indexeddb VERÐUR að hlaðast á undan Dexie (þarf indexedDB í node).
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Aðhvarfspróf fyrir aðallykla-skiptin á `rosAssessments` (plantId → id).
 *
 * Dexie styður EKKI að breyta aðallykli í stað ("Not yet support for changing
 * primary key"); rétta leiðin er að eyða töflunni (v5: null) og endurgera hana
 * með nýja lyklinum (v6: id). Hér hermum við eftir gömlum v3/v4-gagnagrunni og
 * staðfestum að nýja útgáfukeðjan (v1–v7, eins og í db.ts) opnist án villu og
 * endi með `id`-lyklaðri `rosAssessments` + `rosYieldChecks`.
 *
 * Lykilatriði: ef einhver „einfaldar" þetta aftur í eitt version-blokk sem
 * breytir lyklinum í stað, fellur þetta próf (eins og raunverulegir notendur á
 * v3/v4 gerðu við opnun).
 */

const DB_NAME = 'spira-migration-test';

const V1_STORES = {
  grows: 'id, name, category, startDate, archived',
  plants: 'id, growId, variety, currentPhase, archived',
  logs: 'id, growId, plantId, timestamp, type',
  photos: 'id, plantId, growId, takenAt',
  environment: 'id, growId, timestamp',
  harvests: 'id, growId, plantId, timestamp',
  varieties: 'id, commonName, category, isBuiltIn',
  meta: 'key',
} as const;

/** Gamli gagnagrunnurinn: stoppar í v4 með `rosAssessments` lyklað á `plantId`. */
function makeLegacyV4(): Dexie {
  const d = new Dexie(DB_NAME);
  d.version(1).stores(V1_STORES);
  d.version(2).stores({ rosMessages: 'id, growId, timestamp' });
  d.version(3).stores({ rosAssessments: 'plantId, growId' });
  d.version(4).stores({ rosReports: 'id, createdAt' });
  return d;
}

/** Núverandi keðja úr db.ts: v5 eyðir, v6 endurgerir með `id`, v7 bætir við checks. */
function makeCurrent(): Dexie {
  const d = makeLegacyV4();
  d.version(5).stores({ rosAssessments: null });
  d.version(6).stores({ rosAssessments: 'id, plantId, growId' });
  d.version(7).stores({ rosYieldChecks: 'id, plantId, growId' });
  return d;
}

describe('db migration — rosAssessments primary-key re-key', () => {
  afterEach(async () => {
    await Dexie.delete(DB_NAME);
  });

  it('upgrades a v3/v4 database to v7 without "changing primary key"', async () => {
    const legacy = makeLegacyV4();
    await legacy.open();
    expect(legacy.table('rosAssessments').schema.primKey.keyPath).toBe('plantId');
    await legacy
      .table('rosAssessments')
      .put({ plantId: 'p1', growId: 'g1', photoId: 'ph1', score: 7, text: 'x', createdAt: 1 });
    legacy.close();

    const current = makeCurrent();
    // Áður: þetta kastaði UpgradeError "Not yet support for changing primary key".
    await expect(current.open()).resolves.toBeTruthy();

    expect(current.table('rosAssessments').schema.primKey.keyPath).toBe('id');
    expect(current.tables.map((t) => t.name)).toContain('rosYieldChecks');
    // Taflan var endurgerð (eyðing+sköpun) svo eldra plantId-lyklaða matið fellur burt.
    expect(await current.table('rosAssessments').count()).toBe(0);
    current.close();
  });

  it('creates a fresh database directly at v7 with the id key', async () => {
    const fresh = makeCurrent();
    await fresh.open();
    expect(fresh.verno).toBe(7);
    expect(fresh.table('rosAssessments').schema.primKey.keyPath).toBe('id');
    expect(fresh.table('rosYieldChecks').schema.primKey.keyPath).toBe('id');
    fresh.close();
  });
});
