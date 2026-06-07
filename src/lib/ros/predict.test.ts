import { describe, expect, it } from 'vitest';
import type { Plant, VarietyPreset } from '@/lib/db';
import { predictForPlants, predictHarvestWindow } from '@/lib/ros/predict';

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 5, 7, 12);

function mkPlant(over: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    growId: 'g1',
    variety: 'Prófpipar',
    category: 'pepper',
    startedFrom: 'seed',
    currentPhase: 'fruiting',
    archived: false,
    createdAt: NOW - 100 * DAY_MS,
    updatedAt: NOW - 100 * DAY_MS,
    ...over,
  };
}

function mkVariety(over: Partial<VarietyPreset> = {}): VarietyPreset {
  return {
    id: 'v1',
    commonName: 'Prófpipar',
    category: 'pepper',
    isBuiltIn: false,
    daysToHarvest: [90, 120],
    ...over,
  };
}

describe('predictHarvestWindow — null tilvik', () => {
  it('geymd planta → null', () => {
    expect(predictHarvestWindow(mkPlant({ archived: true }), mkVariety(), NOW)).toBeNull();
  });

  it('ekkert afbrigði → null', () => {
    expect(predictHarvestWindow(mkPlant(), undefined, NOW)).toBeNull();
  });

  it('afbrigði án daysToHarvest → null', () => {
    expect(
      predictHarvestWindow(mkPlant(), mkVariety({ daysToHarvest: undefined }), NOW),
    ).toBeNull();
  });

  it.each(['finished', 'dormant', 'overwintering', 'planning'] as const)(
    'fasi %s → null',
    (phase) => {
      expect(
        predictHarvestWindow(mkPlant({ currentPhase: phase }), mkVariety(), NOW),
      ).toBeNull();
    },
  );
});

describe('predictHarvestWindow — gluggareikningur', () => {
  it('upphaf velst spírun > sáning > stofnun', () => {
    const germ = NOW - 80 * DAY_MS;
    const sow = NOW - 95 * DAY_MS;
    const created = NOW - 100 * DAY_MS;
    const p = mkPlant({ germinatedDate: germ, sowDate: sow, createdAt: created });
    const pred = predictHarvestWindow(p, mkVariety(), NOW)!;
    expect(pred.windowStart).toBe(germ + 90 * DAY_MS);
    expect(pred.windowEnd).toBe(germ + 120 * DAY_MS);

    const noGerm = mkPlant({ sowDate: sow, createdAt: created });
    expect(predictHarvestWindow(noGerm, mkVariety(), NOW)!.windowStart).toBe(
      sow + 90 * DAY_MS,
    );

    const onlyCreated = mkPlant({ createdAt: created });
    expect(predictHarvestWindow(onlyCreated, mkVariety(), NOW)!.windowStart).toBe(
      created + 90 * DAY_MS,
    );
  });

  it('inni í glugganum: daysUntilStart neikvætt, framvinda full', () => {
    const start = NOW - 100 * DAY_MS;
    const p = mkPlant({ germinatedDate: start });
    const pred = predictHarvestWindow(p, mkVariety(), NOW)!;
    expect(pred.daysUntilStart).toBe(-10);
    expect(pred.daysUntilEnd).toBe(20);
    expect(pred.progress).toBe(1);
  });

  it('hálfnað að glugga: framvinda 0.5', () => {
    const start = NOW - 45 * DAY_MS;
    const pred = predictHarvestWindow(mkPlant({ germinatedDate: start }), mkVariety(), NOW)!;
    expect(pred.daysUntilStart).toBe(45);
    expect(pred.progress).toBeCloseTo(0.5);
  });

  it('minDays = 0 → framvinda telst full (engin deiling með núlli)', () => {
    const pred = predictHarvestWindow(
      mkPlant({ germinatedDate: NOW }),
      mkVariety({ daysToHarvest: [0, 30] }),
      NOW,
    )!;
    expect(pred.progress).toBe(1);
    expect(pred.daysUntilStart).toBe(0);
  });

  it('plantId fylgir með', () => {
    expect(predictHarvestWindow(mkPlant({ id: 'xyz' }), mkVariety(), NOW)!.plantId).toBe(
      'xyz',
    );
  });
});

describe('predictForPlants', () => {
  it('sleppir plöntum án spár og raðar eftir daysUntilStart vaxandi', () => {
    const far = mkPlant({ id: 'far', germinatedDate: NOW - 10 * DAY_MS });
    const near = mkPlant({ id: 'near', germinatedDate: NOW - 80 * DAY_MS });
    const past = mkPlant({ id: 'past', germinatedDate: NOW - 130 * DAY_MS });
    const none = mkPlant({ id: 'none' }); // ekkert afbrigði
    const out = predictForPlants(
      [far, none, near, past],
      (p) => (p.id === 'none' ? undefined : mkVariety()),
      NOW,
    );
    expect(out.map((o) => o.plant.id)).toEqual(['past', 'near', 'far']);
  });

  it('tómt inn → tómt út', () => {
    expect(predictForPlants([], () => mkVariety(), NOW)).toEqual([]);
  });
});
