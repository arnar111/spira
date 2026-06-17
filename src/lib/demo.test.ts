// fake-indexeddb VERÐUR að hlaðast á undan db.ts
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_CODE, DEMO_NAME, seedDemoData } from '@/lib/demo';
import { db } from '@/lib/db';
import { clearLocalData } from '@/lib/sync';

beforeEach(async () => {
  await clearLocalData();
  await db.varieties.clear();
  await db.rosMessages.clear();
  await db.rosAssessments.clear();
  await db.rosReports.clear();
});

describe('DEMO_CODE / DEMO_NAME fastar', () => {
  it('DEMO_CODE er "123"', () => {
    expect(DEMO_CODE).toBe('123');
  });

  it('DEMO_NAME er ekki tómur strengur', () => {
    expect(typeof DEMO_NAME).toBe('string');
    expect(DEMO_NAME.length).toBeGreaterThan(0);
  });
});

describe('seedDemoData', () => {
  it('setur inn margar ræktanir', async () => {
    await seedDemoData();
    const grows = await db.grows.toArray();
    expect(grows.length).toBeGreaterThanOrEqual(3);
  });

  it('setur inn plöntur tengdar ræktununum', async () => {
    await seedDemoData();
    const plants = await db.plants.toArray();
    expect(plants.length).toBeGreaterThan(0);

    // Öll plöntur hafa growId sem er til í grows töflu
    const grows = await db.grows.toArray();
    const growIds = new Set(grows.map((g) => g.id));
    for (const p of plants) {
      expect(growIds.has(p.growId)).toBe(true);
    }
  });

  it('setur inn skráningar (logs) fyrir plönturnar', async () => {
    await seedDemoData();
    const logs = await db.logs.toArray();
    expect(logs.length).toBeGreaterThan(0);
  });

  it('setur inn umhverfisgögn (environment samples)', async () => {
    await seedDemoData();
    const env = await db.environment.toArray();
    expect(env.length).toBeGreaterThan(0);
  });

  it('setur onboardingComplete í meta', async () => {
    await seedDemoData();
    const meta = await db.meta.get('onboardingComplete');
    expect(meta?.value).toBe(true);
  });

  it('er idempotent: tvær hringferðir gefa sömu niðurstöður', async () => {
    await seedDemoData();
    const first = await db.grows.count();

    await seedDemoData();
    const second = await db.grows.count();

    expect(first).toBe(second);
  });

  it('öll grows hafa archived=false', async () => {
    await seedDemoData();
    const grows = await db.grows.toArray();
    for (const g of grows) {
      expect(g.archived).toBe(false);
    }
  });

  it('plantið með elsta sáningardaginn er í fruiting eða síðara fasi', async () => {
    await seedDemoData();
    const plants = await db.plants.toArray();
    // Tent grow með 102 daga sáningartíma ætti að hafa fruiting plöntur
    const fruitingOrLater = plants.filter((p) =>
      ['fruiting', 'ripening', 'harvest'].includes(p.currentPhase),
    );
    expect(fruitingOrLater.length).toBeGreaterThan(0);
  });

  it('uppskera (harvests) er til í tent-ræktun', async () => {
    await seedDemoData();
    const harvests = await db.harvests.toArray();
    // Tent grow with startedDaysAgo > 90 gets harvest entries
    expect(harvests.length).toBeGreaterThan(0);
  });

  it('öll plöntu-ID eru einkvæm', async () => {
    await seedDemoData();
    const plants = await db.plants.toArray();
    const ids = plants.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uppskeru-tímamark er sett í fortíð', async () => {
    await seedDemoData();
    const now = Date.now();
    const harvests = await db.harvests.toArray();
    for (const h of harvests) {
      expect(h.timestamp).toBeLessThanOrEqual(now);
    }
  });
});
