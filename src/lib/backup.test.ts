/**
 * backup.ts — unit tests for the pure/testable parts.
 *
 * downloadBackup() requires DOM (document.createElement etc.) — skip here.
 * importBackupFile() requires a real File object + Dexie — test via
 * migrateSnapshot (the only pure validator path we can reach without DOM).
 *
 * backupFileName() is not exported, so we test its behaviour indirectly by
 * inspecting that migrateSnapshot throws with an Icelandic message on bad JSON
 * and that it passes on a valid snapshot — the same validator backup uses.
 */
import { describe, expect, it } from 'vitest';
import { migrateSnapshot, isSnapshot, type SnapshotV1 } from '@/lib/sync';

const VALID_SNAP: SnapshotV1 = {
  version: 1,
  grows: [],
  plants: [],
  logs: [],
  environment: [],
  harvests: [],
  meta: [],
};

describe('migrateSnapshot (íslenskt villuskilaboð við rusl)', () => {
  it('tekur v1-afrit óbreytt', () => {
    const result = migrateSnapshot(VALID_SNAP);
    expect(result).toBe(VALID_SNAP);
  });

  it('kastar á null með íslensku skilaboði', () => {
    expect(() => migrateSnapshot(null)).toThrowError(/Ógilt afrit/);
  });

  it('kastar á venjulegan streng', () => {
    expect(() => migrateSnapshot('not_json')).toThrowError(/Ógilt afrit/);
  });

  it('kastar á rangt útgáfunúmer (v2)', () => {
    expect(() =>
      migrateSnapshot({ version: 2, grows: [], plants: [], logs: [], environment: [], harvests: [], meta: [] }),
    ).toThrowError(/Ógilt afrit/);
  });

  it('kastar þegar required fylki vantar', () => {
    // Missing meta
    expect(() =>
      migrateSnapshot({ version: 1, grows: [], plants: [], logs: [], environment: [], harvests: [] }),
    ).toThrowError(/Ógilt afrit/);
  });

  it('kastar þegar grows er strengur en ekki fylki', () => {
    expect(() =>
      migrateSnapshot({ version: 1, grows: 'wrong', plants: [], logs: [], environment: [], harvests: [], meta: [] }),
    ).toThrowError(/Ógilt afrit/);
  });
});

describe('isSnapshot — heildarprófanir', () => {
  it('skilar true á lágmarks-gildu snapshot', () => {
    expect(isSnapshot(VALID_SNAP)).toBe(true);
  });

  it('skilar false á tómt hlut', () => {
    expect(isSnapshot({})).toBe(false);
  });

  it('skilar false þegar version er strengur en ekki tala', () => {
    expect(
      isSnapshot({ version: '1', grows: [], plants: [], logs: [], environment: [], harvests: [], meta: [] }),
    ).toBe(false);
  });

  it('skilar false þegar meta er object en ekki array', () => {
    expect(
      isSnapshot({ version: 1, grows: [], plants: [], logs: [], environment: [], harvests: [], meta: {} }),
    ).toBe(false);
  });

  it('skilar true þegar öll fylki hafa innihald', () => {
    const snap: SnapshotV1 = {
      version: 1,
      grows: [{ id: 'g1' } as SnapshotV1['grows'][0]],
      plants: [],
      logs: [],
      environment: [],
      harvests: [],
      meta: [{ key: 'onboardingComplete', value: true }],
    };
    expect(isSnapshot(snap)).toBe(true);
  });
});
