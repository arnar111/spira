/**
 * harvestStats.ts — additional edge cases not covered by harvestStats.test.ts.
 * Focus: gramsPerPod when weightG is 0, yieldStats with podCount=0 entries
 * mixed in, harvestTimeline stable sort, yieldByVariety with empty varietyId.
 */
import { describe, expect, it } from 'vitest';
import type { HarvestEntry, Plant } from '@/lib/db';
import { harvestTimeline, yieldByVariety, yieldStats } from '@/lib/harvestStats';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 5, 21, 12);

function h(over: Partial<HarvestEntry>): HarvestEntry {
  return {
    id: `h-${Math.random()}`,
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

describe('yieldStats — edge cases', () => {
  it('tínsla með weightG=0 er meðtalin í count en gefur 0 g/dag', () => {
    const s = yieldStats([h({ weightG: 0, podCount: 5 })], NOW);
    expect(s.count).toBe(1);
    expect(s.totalG).toBe(0);
    // 0g / 1 day = 0
    expect(s.gramsPerDay).toBe(0);
    // 0g / 5 pods = 0
    expect(s.gramsPerPod).toBe(0);
  });

  it('tínsla með undefined weightG er meðhöndluð sem 0', () => {
    // weightG is optional — harvestStats treats undefined as 0
    const entry = h({ podCount: 3 });
    delete (entry as Partial<HarvestEntry>).weightG;
    const s = yieldStats([entry], NOW);
    expect(s.totalG).toBe(0);
    expect(s.gramsPerPod).toBe(0);
  });

  it('podCount=0 á tínslu á EKKI að mynda gramsPerPod (null þegar engin pod)', () => {
    const s = yieldStats(
      [h({ weightG: 100, podCount: 0 }), h({ weightG: 50 })],
      NOW,
    );
    // No entry has podCount > 0, so gramsPerPod should be null
    expect(s.gramsPerPod).toBeNull();
    expect(s.totalG).toBe(150);
  });

  it('blönduð: ein tínsla með pod og ein án — gramsPerPod telur AÐEINS þyngd pod-tínslna', () => {
    const s = yieldStats(
      [
        h({ weightG: 100, podCount: 5, timestamp: NOW - DAY }),
        h({ weightG: 50, timestamp: NOW }), // engin pod
      ],
      NOW,
    );
    // totalG = 150 (öll þyngd), en gramsPerPod = podWeightG/totalPods = 100/5 = 20.
    // Þyngd pod-lausu tínslunnar (50 g) blæs EKKI upp g/pod meðaltalið.
    expect(s.gramsPerPod).toBeCloseTo(20, 6);
    expect(s.totalG).toBe(150);
    expect(s.totalPods).toBe(5);
  });

  it('tínsla langt í fortíð: gramsPerDay er lítið', () => {
    const s = yieldStats([h({ weightG: 100, timestamp: NOW - 1000 * DAY })], NOW);
    expect(s.gramsPerDay).toBeLessThan(1);
    expect(s.firstAt).toBe(NOW - 1000 * DAY);
    expect(s.lastAt).toBe(NOW - 1000 * DAY);
  });

  it('fleiri tínslur á sama tíma gefa rétta firstAt og lastAt', () => {
    const s = yieldStats(
      [h({ timestamp: NOW }), h({ timestamp: NOW }), h({ timestamp: NOW })],
      NOW,
    );
    expect(s.firstAt).toBe(NOW);
    expect(s.lastAt).toBe(NOW);
    expect(s.count).toBe(3);
  });
});

describe('harvestTimeline — stable sort', () => {
  it('tímaröð með þremur punktum', () => {
    const entries = [
      h({ timestamp: NOW, weightG: 30 }),
      h({ timestamp: NOW - 2 * DAY, weightG: 10 }),
      h({ timestamp: NOW - DAY, weightG: 20 }),
    ];
    const tl = harvestTimeline(entries);
    expect(tl.map((p) => p.weightG)).toEqual([10, 20, 30]);
    expect(tl[0].t).toBe(NOW - 2 * DAY);
    expect(tl[2].t).toBe(NOW);
  });

  it('tómt → tómt', () => {
    expect(harvestTimeline([])).toEqual([]);
  });

  it('tínsla með undefined weightG fær 0 þyngd', () => {
    const e = h({});
    delete (e as Partial<HarvestEntry>).weightG;
    const tl = harvestTimeline([e]);
    expect(tl[0].weightG).toBe(0);
  });
});

describe('yieldByVariety — edge cases', () => {
  it('tómt varietyId string fellur í afbrigðisheitið sem lykil', () => {
    // yieldByVariety uses `plant.varietyId || plant.variety`, svo tómur strengur
    // (falskur) fellur í afbrigðisheitið — plöntur með varietyId='' grúppast
    // með nafna sínum í stað þess að safnast allar undir ''.
    const out = yieldByVariety(
      [h({ plantId: 'p1', weightG: 50 })],
      [plant({ id: 'p1', varietyId: '', variety: 'Nafnlaus' })],
    );
    expect(out[0].key).toBe('Nafnlaus'); // '' fellur í afbrigðisheitið
    expect(out[0].label).toBe('Nafnlaus');
  });

  it('plöntur með tómt varietyId en sama heiti grúppast saman', () => {
    const out = yieldByVariety(
      [
        h({ plantId: 'p1', weightG: 40 }),
        h({ plantId: 'p2', weightG: 60 }),
      ],
      [
        plant({ id: 'p1', varietyId: '', variety: 'Nafnlaus' }),
        plant({ id: 'p2', varietyId: '', variety: 'Nafnlaus' }),
      ],
    );
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('Nafnlaus');
    expect(out[0].totalG).toBe(100);
    expect(out[0].count).toBe(2);
  });

  it('fleiri afbrigði raðast rétt eftir þyngd', () => {
    const plants = [
      plant({ id: 'p1', varietyId: 'v-a', variety: 'Pipar A' }),
      plant({ id: 'p2', varietyId: 'v-b', variety: 'Pipar B' }),
      plant({ id: 'p3', varietyId: 'v-c', variety: 'Pipar C' }),
    ];
    const harvests = [
      h({ plantId: 'p1', weightG: 50 }),
      h({ plantId: 'p2', weightG: 200 }),
      h({ plantId: 'p3', weightG: 100 }),
    ];
    const out = yieldByVariety(harvests, plants);
    expect(out.map((v) => v.key)).toEqual(['v-b', 'v-c', 'v-a']);
  });

  it('sama afbrigðið á mörgum plöntum leggst saman', () => {
    const plants = [
      plant({ id: 'p1', varietyId: 'shared', variety: 'Deilt' }),
      plant({ id: 'p2', varietyId: 'shared', variety: 'Deilt' }),
    ];
    const harvests = [
      h({ plantId: 'p1', weightG: 100, podCount: 4 }),
      h({ plantId: 'p2', weightG: 80, podCount: 3 }),
    ];
    const out = yieldByVariety(harvests, plants);
    expect(out).toHaveLength(1);
    expect(out[0].totalG).toBe(180);
    expect(out[0].totalPods).toBe(7);
    expect(out[0].count).toBe(2);
  });

  it('tínslur með weightG undefined teljast sem 0 g', () => {
    const e = h({ plantId: 'p1' });
    delete (e as Partial<HarvestEntry>).weightG;
    const out = yieldByVariety([e], [plant({ id: 'p1', varietyId: 'v1', variety: 'Test' })]);
    expect(out[0].totalG).toBe(0);
    expect(out[0].count).toBe(1);
  });
});
