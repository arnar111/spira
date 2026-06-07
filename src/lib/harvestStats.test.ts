import { describe, expect, it } from 'vitest';
import type { HarvestEntry, Plant } from '@/lib/db';
import {
  harvestTimeline,
  yieldByVariety,
  yieldStats,
} from '@/lib/harvestStats';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 5, 21, 12);

function h(over: Partial<HarvestEntry>): HarvestEntry {
  return {
    id: `h-${over.timestamp ?? NOW}-${Math.random()}`,
    growId: 'g1',
    plantId: 'p1',
    timestamp: NOW,
    weightG: 0,
    ...over,
  };
}

function plant(over: Partial<Plant> & Pick<Plant, 'id'>): Plant {
  return {
    growId: 'g1',
    variety: 'Prófpipar',
    category: 'pepper',
    startedFrom: 'seed',
    currentPhase: 'harvest',
    archived: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

describe('yieldStats', () => {
  it('tómt → núll-afköst', () => {
    const s = yieldStats([], NOW);
    expect(s.totalG).toBe(0);
    expect(s.gramsPerDay).toBeNull();
    expect(s.gramsPerPod).toBeNull();
  });

  it('reiknar g/dag, g/pod og tínslur/viku frá fyrstu tínslu', () => {
    const harvests = [
      h({ timestamp: NOW - 10 * DAY, weightG: 100, podCount: 5 }),
      h({ timestamp: NOW, weightG: 100, podCount: 5 }),
    ];
    const s = yieldStats(harvests, NOW);
    expect(s.totalG).toBe(200);
    expect(s.totalPods).toBe(10);
    expect(s.count).toBe(2);
    expect(s.gramsPerPod).toBe(20);
    expect(s.gramsPerDay).toBeCloseTo(20, 6); // 200g / 10 dagar
    expect(s.harvestsPerWeek).toBeCloseTo(1.4, 6); // 2 tínslur / (10/7) vikur
    expect(s.firstAt).toBe(NOW - 10 * DAY);
    expect(s.lastAt).toBe(NOW);
  });

  it('ein tínsla notar a.m.k. 1 dag (engin óendanleg afköst)', () => {
    const s = yieldStats([h({ timestamp: NOW, weightG: 50 })], NOW);
    expect(s.gramsPerDay).toBe(50); // 50g / 1 dagur (lágmark)
    expect(s.gramsPerPod).toBeNull(); // engin pod
  });
});

describe('harvestTimeline', () => {
  it('raðar tínslum elst fyrst með þyngd', () => {
    const tl = harvestTimeline([
      h({ timestamp: NOW, weightG: 30 }),
      h({ timestamp: NOW - DAY, weightG: 20 }),
    ]);
    expect(tl.map((p) => p.weightG)).toEqual([20, 30]);
  });
});

describe('yieldByVariety', () => {
  it('safnar þvert á ræktanir (líka geymdar) og raðar eftir þyngd', () => {
    const plants = [
      plant({ id: 'p1', varietyId: 'pepper-a', variety: 'Pipar A' }),
      plant({ id: 'p2', varietyId: 'pepper-b', variety: 'Pipar B', archived: true, growId: 'g2' }),
      plant({ id: 'p3', varietyId: 'pepper-a', variety: 'Pipar A', growId: 'g2' }),
    ];
    const harvests = [
      h({ plantId: 'p1', weightG: 100, podCount: 4 }),
      h({ plantId: 'p3', weightG: 50, podCount: 2 }),
      h({ plantId: 'p2', weightG: 200, podCount: 8 }),
    ];
    const out = yieldByVariety(harvests, plants);
    expect(out.map((v) => v.key)).toEqual(['pepper-b', 'pepper-a']);
    expect(out[0].totalG).toBe(200);
    expect(out[1].totalG).toBe(150); // p1 + p3 sama afbrigði
    expect(out[1].count).toBe(2);
  });

  it('tínslur án þekktrar plöntu falla út', () => {
    const out = yieldByVariety([h({ plantId: 'óþekkt', weightG: 99 })], []);
    expect(out).toEqual([]);
  });

  it('notar afbrigðisheiti sem lykil þegar varietyId vantar', () => {
    const out = yieldByVariety(
      [h({ plantId: 'p1', weightG: 10 })],
      [plant({ id: 'p1', variety: 'Nafnlaus' })],
    );
    expect(out[0].key).toBe('Nafnlaus');
    expect(out[0].label).toBe('Nafnlaus');
  });
});
