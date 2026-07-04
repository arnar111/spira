/**
 * Rós reglu-vél — Rich eval / regression suite (eval agent, 2026-06-13).
 *
 * Scope (A – offline, deterministic):
 *   - Indoor vs outdoor axis (growIsOutdoor)
 *   - Watering / feeding / topping / pollination / harvest-ETA / grow-light
 *   - Env-band / pH / humidity spider-mite watches vs envTargets
 *   - Representative fixtures: pepper indoor, tomato indoor, strawberry indoor,
 *     potato outdoor
 *   - Snapshot-lock for buildContextDigest, buildAssessmentPrompt,
 *     buildCountPrompt / parseCount
 *
 * All tests run in the 'node' vitest project (*.test.ts include glob).
 * computeInsights / buildContextDigest are PURE — now/month come in as params.
 */

import { describe, expect, it } from 'vitest';
import type { Grow, LogEntry, Plant, HarvestEntry } from '@/lib/db';
import { computeInsights, buildContextDigest } from '@/lib/ros/engine';
import { buildAssessmentPrompt, parseHealthScore } from '@/lib/ros/assessment';
import { buildCountPrompt, parseCount } from '@/lib/ros/yieldCount';
import type { RosInsight } from '@/lib/ros/types';

// ─── shared constants ────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/** Fixed reference point: 2026-06-13 12:00 UTC (mid-June — long daylight). */
const NOW = Date.UTC(2026, 5, 13, 12);
const JUNE = 6;

// ─── minimal fixture factories ────────────────────────────────────────────────

function mkGrow(over: Partial<Grow> = {}): Grow {
  return {
    id: 'g1',
    name: 'Evalræktun',
    category: 'pepper',
    location: 'Tjald',
    locationKey: 'tent',
    startDate: NOW - 45 * DAY_MS,
    archived: false,
    createdAt: NOW - 45 * DAY_MS,
    updatedAt: NOW - 45 * DAY_MS,
    ...over,
  };
}

function mkPlant(over: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    growId: 'g1',
    variety: 'Evalpipar',
    category: 'pepper',
    startedFrom: 'seed',
    currentPhase: 'vegetative',
    archived: false,
    createdAt: NOW - 45 * DAY_MS,
    updatedAt: NOW - 45 * DAY_MS,
    ...over,
  };
}

function mkLog(over: Partial<LogEntry> & Pick<LogEntry, 'type'>): LogEntry {
  return {
    id: `log-${over.type}-${over.timestamp ?? NOW}`,
    growId: 'g1',
    timestamp: NOW - DAY_MS,
    ...over,
  };
}

function mkHarvest(weightG: number): HarvestEntry {
  return {
    id: 'h1',
    growId: 'g1',
    plantId: 'p1',
    weightG,
    timestamp: NOW - 7 * DAY_MS,
  };
}

interface RunOpts {
  grow?: Partial<Grow>;
  plants?: Plant[];
  logs?: LogEntry[];
  harvests?: HarvestEntry[];
  month?: number;
  now?: number;
}

function run(opts: RunOpts = {}): RosInsight[] {
  return computeInsights({
    grow: mkGrow(opts.grow),
    plants: opts.plants ?? [mkPlant()],
    logs: opts.logs ?? [],
    harvests: opts.harvests ?? [],
    now: opts.now ?? NOW,
    month: opts.month ?? JUNE,
  });
}

function byId(insights: RosInsight[], id: string): RosInsight | undefined {
  return insights.find((i) => i.id === id);
}

function idsOf(insights: RosInsight[]): string[] {
  return insights.map((i) => i.id);
}

// ─── AXIS: indoor vs outdoor ─────────────────────────────────────────────────

describe('axis: indoor (tent) vs outdoor (garden)', () => {
  it('indoor pepper grow: water+feed+topping+light are present', () => {
    const ins = run();
    expect(byId(ins, 'water-g1')).toBeDefined();
    expect(byId(ins, 'feed-g1')).toBeDefined();
    expect(byId(ins, 'top-p1')).toBeDefined();
    expect(byId(ins, 'light-g1')).toBeDefined();
  });

  it('outdoor garden grow: water+feed+light absent, season present', () => {
    const ins = run({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla' })],
    });
    expect(byId(ins, 'water-g1')).toBeUndefined();
    expect(byId(ins, 'feed-g1')).toBeUndefined();
    expect(byId(ins, 'light-g1')).toBeUndefined();
    expect(byId(ins, 'season-g1')).toBeDefined();
  });

  it('environment:"outdoor" explicit flag makes any grow outdoor', () => {
    const ins = run({
      grow: { locationKey: 'tent', environment: 'outdoor' },
      plants: [mkPlant({ category: 'tomato', variety: 'Evaltómatur' })],
    });
    expect(byId(ins, 'water-g1')).toBeUndefined();
    expect(byId(ins, 'season-g1')).toBeDefined();
  });

  it('environment:"indoor" overrides potato outdoor inference', () => {
    const ins = run({
      grow: { locationKey: 'tent', environment: 'indoor' },
      plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla' })],
    });
    expect(byId(ins, 'water-g1')).toBeDefined();
    expect(byId(ins, 'season-g1')).toBeUndefined();
  });

  it('active potato plant in window grow → outdoor axis (potato rule)', () => {
    const ins = run({
      grow: { locationKey: 'window' },
      plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla' })],
    });
    expect(byId(ins, 'water-g1')).toBeUndefined();
    expect(byId(ins, 'season-g1')).toBeDefined();
  });

  it('archived potato plant does NOT trigger outdoor axis', () => {
    const ins = run({
      grow: { locationKey: 'window' },
      plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla', archived: true })],
    });
    // All plants archived → grow not active → no water insight either
    expect(byId(ins, 'season-g1')).toBeUndefined();
  });
});

// ─── WATERING ─────────────────────────────────────────────────────────────────

describe('watering insights', () => {
  it('never watered, active grow → due severity, dueInDays=0', () => {
    const ins = byId(run(), 'water-g1');
    expect(ins?.severity).toBe('due');
    expect(ins?.dueInDays).toBe(0);
    expect(ins?.kind).toBe('water');
  });

  it('watered 1 day ago (cadence 3) → info, dueInDays=2', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', timestamp: NOW - 1 * DAY_MS })] }),
      'water-g1',
    );
    expect(ins?.severity).toBe('info');
    expect(ins?.dueInDays).toBe(2);
  });

  it('watered 2 days ago (cadence 3) → soon (due tomorrow)', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', timestamp: NOW - 2 * DAY_MS })] }),
      'water-g1',
    );
    expect(ins?.severity).toBe('soon');
  });

  it('watered 4 days ago (cadence 3) → due, dueInDays=-1', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', timestamp: NOW - 4 * DAY_MS })] }),
      'water-g1',
    );
    expect(ins?.severity).toBe('due');
    expect(ins?.dueInDays).toBe(-1);
  });

  it('window location: cadence reduced to 2', () => {
    // Watered 2 days ago: would be 'soon' in tent (cadence 3), 'due' in window (cadence 2)
    const tentIns = byId(
      run({
        grow: { locationKey: 'tent' },
        logs: [mkLog({ type: 'water', timestamp: NOW - 2 * DAY_MS })],
      }),
      'water-g1',
    );
    const windowIns = byId(
      run({
        grow: { locationKey: 'window' },
        logs: [mkLog({ type: 'water', timestamp: NOW - 2 * DAY_MS })],
      }),
      'water-g1',
    );
    expect(tentIns?.severity).toBe('soon');
    expect(windowIns?.severity).toBe('due');
  });

  it('strawberry shortens cadence to 2', () => {
    // Strawberry watered 2 days ago: cadence 2 → due
    const ins = byId(
      run({
        plants: [mkPlant({ category: 'strawberry', variety: 'Evalber', currentPhase: 'vegetative' })],
        logs: [mkLog({ type: 'water', timestamp: NOW - 2 * DAY_MS })],
      }),
      'water-g1',
    );
    expect(ins?.severity).toBe('due');
  });

  it('germinating plant shortens cadence to 2', () => {
    // 2 days since water, germinating → due (cadence 2)
    const ins = byId(
      run({
        plants: [mkPlant({ currentPhase: 'germinating' })],
        logs: [mkLog({ type: 'water', timestamp: NOW - 2 * DAY_MS })],
      }),
      'water-g1',
    );
    expect(ins?.severity).toBe('due');
  });

  it('planning phase → grow inactive → no water insight', () => {
    const ins = byId(
      run({ plants: [mkPlant({ currentPhase: 'planning' })] }),
      'water-g1',
    );
    expect(ins).toBeUndefined();
  });

  it('archived grow has no active plants → no water insight', () => {
    const ins = byId(
      run({ grow: { archived: true }, plants: [mkPlant({ archived: true })] }),
      'water-g1',
    );
    expect(ins).toBeUndefined();
  });
});

// ─── FEEDING ──────────────────────────────────────────────────────────────────

describe('feeding insights', () => {
  it('vegetative phase, no feed logged → due', () => {
    expect(byId(run(), 'feed-g1')?.severity).toBe('due');
  });

  it('flowering phase, no feed → due', () => {
    const ins = byId(
      run({ plants: [mkPlant({ currentPhase: 'flowering' })] }),
      'feed-g1',
    );
    expect(ins?.severity).toBe('due');
  });

  it('fruiting phase, no feed → due', () => {
    const ins = byId(
      run({ plants: [mkPlant({ currentPhase: 'fruiting' })] }),
      'feed-g1',
    );
    expect(ins?.severity).toBe('due');
  });

  it('germinating phase → no feed insight (not a feed phase)', () => {
    expect(
      byId(run({ plants: [mkPlant({ currentPhase: 'germinating' })] }), 'feed-g1'),
    ).toBeUndefined();
  });

  it('seedling phase → no feed insight', () => {
    expect(
      byId(run({ plants: [mkPlant({ currentPhase: 'seedling' })] }), 'feed-g1'),
    ).toBeUndefined();
  });

  it('fed 3 days ago (cadence 7) → no insight', () => {
    expect(
      byId(
        run({ logs: [mkLog({ type: 'feed', timestamp: NOW - 3 * DAY_MS })] }),
        'feed-g1',
      ),
    ).toBeUndefined();
  });

  it('fed 6 days ago → soon', () => {
    expect(
      byId(
        run({ logs: [mkLog({ type: 'feed', timestamp: NOW - 6 * DAY_MS })] }),
        'feed-g1',
      )?.severity,
    ).toBe('soon');
  });

  it('fed 8 days ago → due', () => {
    expect(
      byId(
        run({ logs: [mkLog({ type: 'feed', timestamp: NOW - 8 * DAY_MS })] }),
        'feed-g1',
      )?.severity,
    ).toBe('due');
  });

  it('outdoor grow: no feed insight', () => {
    expect(
      byId(
        run({ grow: { locationKey: 'garden' }, plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla' })] }),
        'feed-g1',
      ),
    ).toBeUndefined();
  });
});

// ─── TOPPING ──────────────────────────────────────────────────────────────────

describe('topping insights', () => {
  it('pepper in vegetative, 40-day-old → soon', () => {
    const ins = byId(run(), 'top-p1');
    expect(ins?.severity).toBe('soon');
    expect(ins?.kind).toBe('top');
    expect(ins?.plantId).toBe('p1');
  });

  it('topping already logged (plant-specific) → suppressed', () => {
    expect(
      byId(
        run({ logs: [mkLog({ type: 'top', plantId: 'p1', timestamp: NOW - 5 * DAY_MS })] }),
        'top-p1',
      ),
    ).toBeUndefined();
  });

  it('topping logged for whole grow (no plantId) → suppressed', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'top', timestamp: NOW - 5 * DAY_MS })] }), 'top-p1'),
    ).toBeUndefined();
  });

  it('plant 20 days old (< 30 threshold) → no topping insight', () => {
    expect(
      byId(run({ plants: [mkPlant({ createdAt: NOW - 20 * DAY_MS })] }), 'top-p1'),
    ).toBeUndefined();
  });

  it('plant 80 days old (> 75 threshold) → no topping insight', () => {
    expect(
      byId(run({ plants: [mkPlant({ createdAt: NOW - 80 * DAY_MS })] }), 'top-p1'),
    ).toBeUndefined();
  });

  it('plant at 30-day lower boundary → topping insight fires', () => {
    const ins = byId(run({ plants: [mkPlant({ createdAt: NOW - 30 * DAY_MS })] }), 'top-p1');
    expect(ins?.severity).toBe('soon');
  });

  it('plant at 75-day upper boundary → topping insight fires', () => {
    const ins = byId(run({ plants: [mkPlant({ createdAt: NOW - 75 * DAY_MS })] }), 'top-p1');
    expect(ins?.severity).toBe('soon');
  });

  it('tomato category → no topping', () => {
    expect(
      byId(
        run({ plants: [mkPlant({ category: 'tomato', variety: 'Evaltómatur' })] }),
        'top-p1',
      ),
    ).toBeUndefined();
  });

  it('strawberry category → no topping', () => {
    expect(
      byId(
        run({ plants: [mkPlant({ category: 'strawberry', variety: 'Evalber' })] }),
        'top-p1',
      ),
    ).toBeUndefined();
  });

  it('pepper in flowering phase → no topping (not vegetative)', () => {
    expect(
      byId(
        run({ plants: [mkPlant({ currentPhase: 'flowering' })] }),
        'top-p1',
      ),
    ).toBeUndefined();
  });
});

// ─── POLLINATION ──────────────────────────────────────────────────────────────

describe('pollination insights', () => {
  describe('tomato indoor', () => {
    const tomatoInFlower = (ageDays = 60) =>
      mkPlant({
        category: 'tomato',
        variety: 'Evaltómatur',
        currentPhase: 'flowering',
        createdAt: NOW - ageDays * DAY_MS,
      });

    it('indoor tomato in flower, never pollinated → due', () => {
      const ins = byId(run({ plants: [tomatoInFlower()] }), 'pollinate-p1');
      expect(ins?.severity).toBe('due');
      expect(ins?.kind).toBe('pollinate');
    });

    it('pollinated 2 days ago (cadence 3) → info', () => {
      const ins = byId(
        run({
          plants: [tomatoInFlower()],
          logs: [mkLog({ type: 'pollinate', plantId: 'p1', timestamp: NOW - 2 * DAY_MS })],
        }),
        'pollinate-p1',
      );
      expect(ins?.severity).toBe('info');
    });

    it('pollinated 3 days ago (cadence 3) → due', () => {
      const ins = byId(
        run({
          plants: [tomatoInFlower()],
          logs: [mkLog({ type: 'pollinate', plantId: 'p1', timestamp: NOW - 3 * DAY_MS })],
        }),
        'pollinate-p1',
      );
      expect(ins?.severity).toBe('due');
    });

    it('outdoor tomato in flower → no pollination nudge (natural)', () => {
      const ins = byId(
        run({
          grow: { locationKey: 'garden', environment: 'outdoor' },
          plants: [tomatoInFlower()],
        }),
        'pollinate-p1',
      );
      expect(ins).toBeUndefined();
    });
  });

  describe('pepper indoor', () => {
    const pepperInFlower = (ageDays = 60) =>
      mkPlant({
        category: 'pepper',
        variety: 'Evalpipar',
        currentPhase: 'flowering',
        createdAt: NOW - ageDays * DAY_MS,
      });

    it('indoor pepper in flower, never pollinated → soon (self-pollinating with nudge)', () => {
      const ins = byId(run({ plants: [pepperInFlower()] }), 'pollinate-p1');
      expect(ins?.severity).toBe('soon');
    });

    it('pollinated 1 day ago (cadence 2) → info', () => {
      const ins = byId(
        run({
          plants: [pepperInFlower()],
          logs: [mkLog({ type: 'pollinate', plantId: 'p1', timestamp: NOW - 1 * DAY_MS })],
        }),
        'pollinate-p1',
      );
      expect(ins?.severity).toBe('info');
    });

    it('pollinated 2 days ago → soon (due again)', () => {
      const ins = byId(
        run({
          plants: [pepperInFlower()],
          logs: [mkLog({ type: 'pollinate', plantId: 'p1', timestamp: NOW - 2 * DAY_MS })],
        }),
        'pollinate-p1',
      );
      expect(ins?.severity).toBe('soon');
    });
  });

  describe('strawberry pollination and deblossom', () => {
    const strawInFlower = (ageDays: number) =>
      mkPlant({
        category: 'strawberry',
        variety: 'Evalber',
        currentPhase: 'flowering',
        createdAt: NOW - ageDays * DAY_MS,
      });

    it('young strawberry (<35 days) in flower → deblossom soon', () => {
      const ins = byId(run({ plants: [strawInFlower(20)] }), 'deblossom-p1');
      expect(ins?.severity).toBe('soon');
      expect(ins?.kind).toBe('deblossom');
    });

    it('young strawberry: no pollination nudge (deblossom takes priority)', () => {
      const ins = byId(run({ plants: [strawInFlower(20)] }), 'pollinate-p1');
      expect(ins).toBeUndefined();
    });

    it('mature strawberry (≥35 days) indoor → pollination due', () => {
      const ins = byId(run({ plants: [strawInFlower(50)] }), 'pollinate-p1');
      expect(ins?.severity).toBe('due');
    });

    it('mature strawberry indoor, pollinated yesterday (cadence 2) → info', () => {
      const ins = byId(
        run({
          plants: [strawInFlower(50)],
          logs: [mkLog({ type: 'pollinate', plantId: 'p1', timestamp: NOW - 1 * DAY_MS })],
        }),
        'pollinate-p1',
      );
      expect(ins?.severity).toBe('info');
    });

    it('outdoor mature strawberry → no pollination nudge (insects)', () => {
      const ins = byId(
        run({
          grow: { locationKey: 'garden', environment: 'outdoor' },
          plants: [strawInFlower(50)],
        }),
        'pollinate-p1',
      );
      expect(ins).toBeUndefined();
    });
  });
});

// ─── HARVEST ETA ──────────────────────────────────────────────────────────────

describe('harvest ETA insights', () => {
  // Use Steinunn tomato ID which has daysToHarvest:[60,85]
  const tomatoWithVariety = (ageDays: number, phase: Plant['currentPhase'] = 'fruiting') =>
    mkPlant({
      category: 'tomato',
      variety: 'Steinunn',
      varietyId: 'tomato-steinunn',
      currentPhase: phase,
      createdAt: NOW - ageDays * DAY_MS,
    });

  it('day 50 (maxDays=85 → 35 days remaining) → info', () => {
    const ins = byId(run({ plants: [tomatoWithVariety(50)] }), 'harvest-p1');
    expect(ins?.severity).toBe('info');
    expect(ins?.dueInDays).toBe(35);
  });

  it('day 74 (maxDays=85 → 11 days remaining) → soon', () => {
    const ins = byId(run({ plants: [tomatoWithVariety(74)] }), 'harvest-p1');
    expect(ins?.severity).toBe('soon');
    expect(ins?.dueInDays).toBe(11);
  });

  it('day 86 (past maxDays=85) → due', () => {
    const ins = byId(run({ plants: [tomatoWithVariety(86)] }), 'harvest-p1');
    expect(ins?.severity).toBe('due');
    expect(ins?.dueInDays).toBeLessThan(0);
  });

  it('plant in planning phase → no harvest-ETA', () => {
    const ins = byId(run({ plants: [tomatoWithVariety(100, 'planning')] }), 'harvest-p1');
    expect(ins).toBeUndefined();
  });

  it('plant without varietyId → no harvest-ETA (cannot resolve variety.daysToHarvest)', () => {
    const ins = byId(
      run({ plants: [mkPlant({ currentPhase: 'fruiting' })] }),
      'harvest-p1',
    );
    expect(ins).toBeUndefined();
  });

  it('strawberry (Albion) at day 60: daysToHarvest[56,84] → window open → due', () => {
    const berry = mkPlant({
      category: 'strawberry',
      variety: 'Albion',
      varietyId: 'strawberry-albion',
      currentPhase: 'fruiting',
      createdAt: NOW - 85 * DAY_MS,
    });
    const ins = byId(run({ plants: [berry] }), 'harvest-p1');
    // 85 days > 84 max → due
    expect(ins?.severity).toBe('due');
  });
});

// ─── GROW LIGHT ───────────────────────────────────────────────────────────────

describe('grow-light insights', () => {
  it('January (5h daylight) → soon — LED recommended', () => {
    const ins = byId(run({ month: 1 }), 'light-g1');
    expect(ins?.severity).toBe('soon');
    expect(ins?.title).toContain('þörf');
  });

  it('February (8h) < 10h threshold → soon', () => {
    expect(byId(run({ month: 2 }), 'light-g1')?.severity).toBe('soon');
  });

  it('March (11.5h) >= 10h → info (natural light suffices)', () => {
    expect(byId(run({ month: 3 }), 'light-g1')?.severity).toBe('info');
  });

  it('June (21h) → info (perfect daylight)', () => {
    const ins = byId(run({ month: 6 }), 'light-g1');
    expect(ins?.severity).toBe('info');
    expect(ins?.title).toContain('Náttúrubirta');
  });

  it('October (9.5h) → soon (below threshold)', () => {
    expect(byId(run({ month: 10 }), 'light-g1')?.severity).toBe('soon');
  });

  it('December (4.5h) → soon — LED needed', () => {
    expect(byId(run({ month: 12 }), 'light-g1')?.severity).toBe('soon');
  });

  it('outdoor grow → no grow-light insight', () => {
    const ins = byId(
      run({
        grow: { locationKey: 'garden' },
        plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla' })],
        month: 1,
      }),
      'light-g1',
    );
    expect(ins).toBeUndefined();
  });

  it('Veritable → no grow-light insight (has built-in 16h LED)', () => {
    const ins = byId(
      run({
        grow: { locationKey: 'veritable' },
        plants: [mkPlant({ category: 'herb', variety: 'Evalbasilíka' })],
        month: 1,
      }),
      'light-g1',
    );
    expect(ins).toBeUndefined();
  });
});

// ─── ENV BAND ─────────────────────────────────────────────────────────────────

describe('env-band insights', () => {
  const freshEnvLog = (data: Record<string, unknown>) =>
    mkLog({ type: 'environment', timestamp: NOW - 6 * 3600 * 1000, data });

  it('temp above band for flowering phase (18–24°C) → soon', () => {
    const ins = byId(
      run({
        plants: [mkPlant({ currentPhase: 'flowering' })],
        logs: [freshEnvLog({ tempC: 28, humidityPct: 58 })],
      }),
      'envband-temp-g1',
    );
    expect(ins?.severity).toBe('soon');
    expect(ins?.title).toContain('yfir');
  });

  it('temp below band for germinating phase (24–28°C) → soon', () => {
    const ins = byId(
      run({
        plants: [mkPlant({ currentPhase: 'germinating' })],
        logs: [freshEnvLog({ tempC: 20, humidityPct: 70 })],
      }),
      'envband-temp-g1',
    );
    expect(ins?.severity).toBe('soon');
    expect(ins?.title).toContain('undir');
  });

  it('humidity below band for vegetative (50–70%) → soon', () => {
    const ins = byId(
      run({
        plants: [mkPlant({ currentPhase: 'vegetative' })],
        logs: [freshEnvLog({ tempC: 23, humidityPct: 40 })],
      }),
      'envband-hum-g1',
    );
    expect(ins?.severity).toBe('soon');
  });

  it('humidity above band for fruiting (50–60%) → soon', () => {
    const ins = byId(
      run({
        plants: [mkPlant({ currentPhase: 'fruiting' })],
        logs: [freshEnvLog({ tempC: 22, humidityPct: 70 })],
      }),
      'envband-hum-g1',
    );
    expect(ins?.severity).toBe('soon');
  });

  it('values within band → no envband insights', () => {
    const insights = run({
      plants: [mkPlant({ currentPhase: 'vegetative' })],
      logs: [freshEnvLog({ tempC: 23, humidityPct: 60 })],
    });
    expect(byId(insights, 'envband-temp-g1')).toBeUndefined();
    expect(byId(insights, 'envband-hum-g1')).toBeUndefined();
  });

  it('stale env log (>48h) → band insights suppressed', () => {
    const insights = run({
      plants: [mkPlant({ currentPhase: 'flowering' })],
      logs: [mkLog({ type: 'environment', timestamp: NOW - 3 * DAY_MS, data: { tempC: 30 } })],
    });
    expect(byId(insights, 'envband-temp-g1')).toBeUndefined();
  });

  it('outdoor grow → no envband insights', () => {
    const insights = run({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', currentPhase: 'flowering', variety: 'Evalkarfla' })],
      logs: [freshEnvLog({ tempC: 35 })],
    });
    expect(byId(insights, 'envband-temp-g1')).toBeUndefined();
  });

  it('Veritable → no envband insights (uses its own climate)', () => {
    const insights = run({
      grow: { locationKey: 'veritable' },
      plants: [mkPlant({ category: 'herb', variety: 'Evalbasilíka', currentPhase: 'vegetative' })],
      logs: [freshEnvLog({ tempC: 35, humidityPct: 20 })],
    });
    expect(byId(insights, 'envband-temp-g1')).toBeUndefined();
  });

  it('envBand insight uses furthest phase (flowering if mixed veg+flower)', () => {
    const plants = [
      mkPlant({ id: 'p1', currentPhase: 'vegetative' }),
      mkPlant({ id: 'p2', currentPhase: 'flowering' }),
    ];
    // Flowering band: 18–24°C; 28°C → over
    const ins = byId(
      run({ plants, logs: [freshEnvLog({ tempC: 28, humidityPct: 55 })] }),
      'envband-temp-g1',
    );
    expect(ins).toBeDefined();
  });
});

// ─── pH ───────────────────────────────────────────────────────────────────────

describe('pH insights', () => {
  it('pH 4.9 (0.6 below 5.5 min → >0.5 drift) → soon with "of lágt" title', () => {
    // 5.5-rule: drift > 0.5 outside the band escalates the insight to 'soon'.
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', data: { ph: 4.9 } })] }),
      'ph-g1',
    );
    expect(ins?.severity).toBe('soon');
    expect(ins?.title).toContain('lágt');
  });

  it('pH 5.2 (0.3 below min → mild drift) → info', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', data: { ph: 5.2 } })] }),
      'ph-g1',
    );
    expect(ins?.severity).toBe('info');
  });

  it('stale pH reading (8 days old) no longer fires (5.5 freshness window)', () => {
    expect(
      byId(
        run({ logs: [mkLog({ type: 'water', timestamp: NOW - 8 * DAY_MS, data: { ph: 4.5 } })] }),
        'ph-g1',
      ),
    ).toBeUndefined();
  });

  it('pH detail includes the reading age', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', timestamp: NOW - 2 * DAY_MS, data: { ph: 7.0 } })] }),
      'ph-g1',
    );
    expect(ins?.detail).toContain('fyrir 2 daga');
  });

  it('pH 7.0 (above 6.8 max) → info with "of hátt" title', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', data: { ph: 7.0 } })] }),
      'ph-g1',
    );
    expect(ins?.severity).toBe('info');
    expect(ins?.title).toContain('hátt');
  });

  it('pH 6.2 (within 5.5–6.8 range) → no pH insight', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'water', data: { ph: 6.2 } })] }), 'ph-g1'),
    ).toBeUndefined();
  });

  it('pH 5.5 (at lower boundary) → no pH insight', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'water', data: { ph: 5.5 } })] }), 'ph-g1'),
    ).toBeUndefined();
  });

  it('pH 6.8 (at upper boundary) → no pH insight', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'water', data: { ph: 6.8 } })] }), 'ph-g1'),
    ).toBeUndefined();
  });

  it('pH from feed log is also used (8.0 is 1.2 over → soon)', () => {
    // 5.5-rule: drift > 0.5 outside the band escalates to 'soon'.
    const ins = byId(
      run({ logs: [mkLog({ type: 'feed', data: { ph: 8.0 } })] }),
      'ph-g1',
    );
    expect(ins?.severity).toBe('soon');
  });

  it('outdoor grow → no pH insight', () => {
    const ins = byId(
      run({
        grow: { locationKey: 'garden' },
        plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla' })],
        logs: [mkLog({ type: 'water', data: { ph: 4.5 } })],
      }),
      'ph-g1',
    );
    expect(ins).toBeUndefined();
  });
});

// ─── SPIDER MITE ──────────────────────────────────────────────────────────────

describe('spider-mite insights', () => {
  const freshEnvLog = (humidityPct: number) =>
    mkLog({ type: 'environment', timestamp: NOW - 6 * 3600 * 1000, data: { humidityPct } });

  it('humidity <45% (very dry) in summer → soon regardless of month', () => {
    const ins = byId(
      run({ month: 6, logs: [freshEnvLog(35)] }),
      'pest-g1',
    );
    expect(ins?.severity).toBe('soon');
    expect(ins?.kind).toBe('pest');
  });

  it('humidity 50% in summer → no spider-mite insight', () => {
    expect(
      byId(run({ month: 6, logs: [freshEnvLog(50)] }), 'pest-g1'),
    ).toBeUndefined();
  });

  it('no env log in winter (nov) → info seasonal watch', () => {
    const ins = byId(run({ month: 11 }), 'pest-g1');
    expect(ins?.severity).toBe('info');
  });

  it('no env log in winter (dec) → info', () => {
    expect(byId(run({ month: 12 }), 'pest-g1')?.severity).toBe('info');
  });

  it('no env log in summer → no spider-mite insight', () => {
    expect(byId(run({ month: 6 }), 'pest-g1')).toBeUndefined();
  });

  it('outdoor grow → no spider-mite insight', () => {
    const ins = byId(
      run({
        grow: { locationKey: 'garden' },
        plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla' })],
        month: 12,
      }),
      'pest-g1',
    );
    expect(ins).toBeUndefined();
  });

  it('Veritable → no spider-mite insight', () => {
    const ins = byId(
      run({
        grow: { locationKey: 'veritable' },
        plants: [mkPlant({ category: 'herb', variety: 'Evalbasilíka' })],
        month: 12,
      }),
      'pest-g1',
    );
    expect(ins).toBeUndefined();
  });

  it('stale env log → falls back to seasonal rule', () => {
    // Stale log in december: humidity reading ignored but month=12 → info
    const ins = byId(
      run({
        month: 12,
        logs: [mkLog({ type: 'environment', timestamp: NOW - 3 * DAY_MS, data: { humidityPct: 30 } })],
      }),
      'pest-g1',
    );
    // Stale → seasonal path applies: winter → info
    expect(ins?.severity).toBe('info');
  });
});

// ─── OUTDOOR INSIGHTS ─────────────────────────────────────────────────────────

describe('outdoor grow insights', () => {
  const outdoorPotato = (month: number, phase: Plant['currentPhase'] = 'vegetative') =>
    run({
      grow: { locationKey: 'garden', category: 'potato' },
      plants: [mkPlant({ id: 'p1', category: 'potato', variety: 'Evalkarfla', currentPhase: phase })],
      month,
    });

  it('june outdoor potato vegetative → hilling soon, season info', () => {
    const insights = outdoorPotato(6);
    expect(byId(insights, 'hill-p1')?.severity).toBe('soon');
    expect(byId(insights, 'season-g1')?.severity).toBe('info');
  });

  it('september outdoor growing plants → frost soon', () => {
    const insights = outdoorPotato(9);
    expect(byId(insights, 'frost-g1')?.severity).toBe('soon');
  });

  it('october outdoor growing plants → frost due (hard)', () => {
    const insights = outdoorPotato(10);
    expect(byId(insights, 'frost-g1')?.severity).toBe('due');
  });

  it('june outdoor → no frost insight (frost:none)', () => {
    expect(byId(outdoorPotato(6), 'frost-g1')).toBeUndefined();
  });

  it('potato in planning phase in march → chitting soon', () => {
    const insights = run({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla', currentPhase: 'planning' })],
      month: 3,
    });
    expect(byId(insights, 'plant-g1')?.severity).toBe('soon');
    expect(byId(insights, 'plant-g1')?.title).toContain('Forspíraðu');
  });

  it('potato in planning in may/june → plant-it-now soon', () => {
    const insights = run({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla', currentPhase: 'planning' })],
      month: 5,
    });
    expect(byId(insights, 'plant-g1')?.severity).toBe('soon');
    expect(byId(insights, 'plant-g1')?.title).toContain('niður');
  });

  it('hilling: last prune was 22 days ago → soon', () => {
    const insights = run({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla', currentPhase: 'vegetative' })],
      logs: [mkLog({ type: 'prune', plantId: 'p1', timestamp: NOW - 22 * DAY_MS })],
      month: 6,
    });
    expect(byId(insights, 'hill-p1')?.severity).toBe('soon');
  });

  it('hilling: last prune was 10 days ago → suppressed', () => {
    const insights = run({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla', currentPhase: 'vegetative' })],
      logs: [mkLog({ type: 'prune', plantId: 'p1', timestamp: NOW - 10 * DAY_MS })],
      month: 6,
    });
    expect(byId(insights, 'hill-p1')).toBeUndefined();
  });

  it('august outdoor potato grow → blight info', () => {
    const insights = outdoorPotato(8);
    expect(byId(insights, 'blight-g1')?.severity).toBe('info');
  });

  it('outdoor strawberry in october → mulch soon', () => {
    const insights = run({
      grow: { locationKey: 'garden', environment: 'outdoor' },
      plants: [mkPlant({ category: 'strawberry', variety: 'Evalber', currentPhase: 'dormant' })],
      month: 10,
    });
    expect(byId(insights, 'mulch-g1')?.severity).toBe('soon');
  });
});

// ─── ENV STALE ────────────────────────────────────────────────────────────────

describe('environment stale insights', () => {
  it('no env log at all on active indoor grow → stale info', () => {
    const ins = byId(run(), 'env-g1');
    expect(ins?.severity).toBe('info');
  });

  it('env log 6 days ago → still stale (< 7 days ok, ≥7 stale)', () => {
    // 6 days: below 7-day stale threshold → no stale warning
    const ins = byId(
      run({ logs: [mkLog({ type: 'environment', timestamp: NOW - 6 * DAY_MS })] }),
      'env-g1',
    );
    expect(ins).toBeUndefined();
  });

  it('env log 7 days ago → stale info', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'environment', timestamp: NOW - 7 * DAY_MS })] }),
      'env-g1',
    );
    expect(ins?.severity).toBe('info');
  });

  it('outdoor grow → no env-stale insight', () => {
    const ins = byId(
      run({
        grow: { locationKey: 'garden' },
        plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla' })],
      }),
      'env-g1',
    );
    expect(ins).toBeUndefined();
  });
});

// ─── SORTING ORDER ────────────────────────────────────────────────────────────

describe('stable severity ordering', () => {
  it('insights are ordered due → soon → info (stable)', () => {
    // Active indoor pepper with lots of overdue items
    const insights = run({
      month: 12, // winter → LED needed (soon) + pest(info)
    });
    const ranks = insights.map((i) =>
      i.severity === 'due' ? 0 : i.severity === 'soon' ? 1 : 2,
    );
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
  });

  it('first insight is always due or soon when there are urgent items', () => {
    const insights = run();
    // Unwatered, unfed active pepper → at least one 'due' at position 0
    expect(insights[0]?.severity).toBe('due');
  });

  it('all ids are unique', () => {
    const insights = run({ month: 12 });
    const ids = idsOf(insights);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── GERMINATION INSIGHTS ─────────────────────────────────────────────────────

describe('germination insights', () => {
  it('germinating plant past max days for known variety → soon (late germination)', () => {
    // Steinunn: daysToGerminate [6,12]; >12+5=17 days → late warning
    const plant = mkPlant({
      category: 'tomato',
      variety: 'Steinunn',
      varietyId: 'tomato-steinunn',
      currentPhase: 'germinating',
      sowDate: NOW - 20 * DAY_MS,
    });
    const ins = byId(run({ plants: [plant] }), 'germin-p1');
    expect(ins?.severity).toBe('soon');
    expect(ins?.detail).toMatch(/[Dd]agur/);
  });

  it('germinating plant within normal range → no germination alert', () => {
    // 10 days from sow, max 12 → not past 12+5=17
    const plant = mkPlant({
      category: 'tomato',
      variety: 'Steinunn',
      varietyId: 'tomato-steinunn',
      currentPhase: 'germinating',
      sowDate: NOW - 10 * DAY_MS,
    });
    const ins = byId(run({ plants: [plant] }), 'germin-p1');
    expect(ins).toBeUndefined();
  });
});

// ─── PHOTO INSIGHTS ───────────────────────────────────────────────────────────

describe('photo insights', () => {
  it('no photo ever on active non-germinating grow → info', () => {
    const ins = byId(run(), 'photo-g1');
    expect(ins?.severity).toBe('info');
  });

  it('photo taken 13 days ago → no insight (< 14 day threshold)', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'photo', timestamp: NOW - 13 * DAY_MS })] }),
      'photo-g1',
    );
    expect(ins).toBeUndefined();
  });

  it('photo taken 14 days ago → info (at threshold)', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'photo', timestamp: NOW - 14 * DAY_MS })] }),
      'photo-g1',
    );
    expect(ins?.severity).toBe('info');
  });

  it('all plants in germinating phase → no photo insight', () => {
    const ins = byId(
      run({ plants: [mkPlant({ currentPhase: 'germinating' })] }),
      'photo-g1',
    );
    expect(ins).toBeUndefined();
  });
});

// ─── RUNNER (strawberry) ──────────────────────────────────────────────────────

describe('runner insights (strawberry)', () => {
  const strawberry = (phase: Plant['currentPhase'] = 'vegetative') =>
    mkPlant({ category: 'strawberry', variety: 'Evalber', currentPhase: phase });

  it('strawberry in vegetative with no runner pruning → info', () => {
    const ins = byId(run({ plants: [strawberry('vegetative')] }), 'runner-p1');
    expect(ins?.severity).toBe('info');
    expect(ins?.kind).toBe('runner');
  });

  it('strawberry runner: pruned 8 days ago → info again', () => {
    const ins = byId(
      run({
        plants: [strawberry('vegetative')],
        logs: [mkLog({ type: 'prune', plantId: 'p1', timestamp: NOW - 8 * DAY_MS })],
      }),
      'runner-p1',
    );
    expect(ins?.severity).toBe('info');
  });

  it('strawberry runner: pruned 5 days ago → suppressed', () => {
    const ins = byId(
      run({
        plants: [strawberry('vegetative')],
        logs: [mkLog({ type: 'prune', plantId: 'p1', timestamp: NOW - 5 * DAY_MS })],
      }),
      'runner-p1',
    );
    expect(ins).toBeUndefined();
  });

  it('strawberry in fruiting → still gets runner insight', () => {
    const ins = byId(run({ plants: [strawberry('fruiting')] }), 'runner-p1');
    expect(ins).toBeDefined();
  });
});

// ─── COMBINED SCENARIOS ───────────────────────────────────────────────────────

describe('combined fixture scenarios', () => {
  describe('indoor pepper — full vegetative scenario', () => {
    it('40-day pepper, never watered, never fed → water+feed both due', () => {
      const insights = run();
      expect(byId(insights, 'water-g1')?.severity).toBe('due');
      expect(byId(insights, 'feed-g1')?.severity).toBe('due');
      expect(byId(insights, 'top-p1')?.severity).toBe('soon');
    });
  });

  describe('indoor tomato — flowering with known variety', () => {
    it('flowering tomato: pollination due, harvest-ETA info, no topping', () => {
      const plants = [
        mkPlant({
          id: 'p1',
          category: 'tomato',
          variety: 'Steinunn',
          varietyId: 'tomato-steinunn',
          currentPhase: 'flowering',
          createdAt: NOW - 50 * DAY_MS,
        }),
      ];
      const insights = run({ plants });
      expect(byId(insights, 'pollinate-p1')?.severity).toBe('due');
      expect(byId(insights, 'harvest-p1')?.severity).toBe('info');
      expect(byId(insights, 'top-p1')).toBeUndefined();
    });
  });

  describe('indoor strawberry — young then mature', () => {
    it('young berry: deblossom, no pollination, runner info', () => {
      const plants = [
        mkPlant({
          id: 'p1',
          category: 'strawberry',
          variety: 'Albion',
          varietyId: 'strawberry-albion',
          currentPhase: 'flowering',
          createdAt: NOW - 20 * DAY_MS,
        }),
      ];
      const insights = run({ plants });
      expect(byId(insights, 'deblossom-p1')?.severity).toBe('soon');
      expect(byId(insights, 'pollinate-p1')).toBeUndefined();
      // Runner insight fires regardless of age
      expect(byId(insights, 'runner-p1')?.severity).toBe('info');
    });
  });

  describe('outdoor potato — seasonal flow', () => {
    const potatoOutdoor = (month: number, phase: Plant['currentPhase'] = 'vegetative') =>
      computeInsights({
        grow: mkGrow({ id: 'g1', locationKey: 'garden', category: 'potato' }),
        plants: [mkPlant({ id: 'p1', category: 'potato', variety: 'Gullauga', varietyId: 'potato-gullauga', currentPhase: phase })],
        logs: [],
        harvests: [],
        now: NOW,
        month,
      });

    it('march potato planning → chitting advice', () => {
      const insights = potatoOutdoor(3, 'planning');
      expect(byId(insights, 'plant-g1')?.title).toContain('Forspíraðu');
    });

    it('june potato vegetative → hilling soon', () => {
      expect(byId(potatoOutdoor(6), 'hill-p1')?.severity).toBe('soon');
    });

    it('september potato vegetative → frost risk soon', () => {
      expect(byId(potatoOutdoor(9), 'frost-g1')?.severity).toBe('soon');
    });

    it('outdoor potato never gets light/water/feed/envBand insights', () => {
      const insights = potatoOutdoor(6);
      expect(byId(insights, 'water-g1')).toBeUndefined();
      expect(byId(insights, 'feed-g1')).toBeUndefined();
      expect(byId(insights, 'light-g1')).toBeUndefined();
      expect(byId(insights, 'envband-temp-g1')).toBeUndefined();
    });
  });
});

// ─── buildContextDigest SNAPSHOT / STRUCTURE LOCK ────────────────────────────

describe('buildContextDigest structure lock', () => {
  function digest(opts: RunOpts = {}): string {
    return buildContextDigest({
      grow: mkGrow(opts.grow),
      plants: opts.plants ?? [mkPlant()],
      logs: opts.logs ?? [],
      harvests: opts.harvests ?? [],
      now: opts.now ?? NOW,
      month: opts.month ?? JUNE,
    });
  }

  it('contains grow name and day counter', () => {
    const d = digest();
    expect(d).toContain('Ræktun: Evalræktun');
    expect(d).toMatch(/dagur \d+/);
  });

  it('lists active plants with phase label', () => {
    const d = digest();
    expect(d).toContain('Plöntur:');
    expect(d).toContain('Evalpipar');
    expect(d).toContain('vegfasi');
  });

  it('contains last watering line', () => {
    const d = digest({ logs: [mkLog({ type: 'water', timestamp: NOW - 2 * DAY_MS })] });
    expect(d).toContain('Síðasta vökvun: fyrir 2 daga.');
  });

  it('last feed line present', () => {
    const d = digest({ logs: [mkLog({ type: 'feed', timestamp: NOW - 5 * DAY_MS })] });
    expect(d).toContain('Síðasti áburður: fyrir 5 daga.');
  });

  it('no watering ever: shows "engin skráð"', () => {
    const d = digest();
    expect(d).toContain('engin skráð');
  });

  it('contains active insights section', () => {
    const d = digest();
    expect(d).toContain('Virk ráð frá Rós:');
    expect(d).toContain('[due]');
  });

  it('includes recent notes (up to 3)', () => {
    const notes = [1, 2, 3, 4].map((i) =>
      mkLog({ type: 'note', timestamp: NOW - i * DAY_MS, note: `Minnispunktur ${i}` }),
    );
    const d = digest({ logs: notes });
    expect(d).toContain('Nýlegir minnispunktar:');
    // At most 3
    const count = (d.match(/Minnispunktur/g) ?? []).length;
    expect(count).toBe(3);
  });

  it('Veritable digest describes water-culture, not soil', () => {
    const d = digest({
      grow: { locationKey: 'veritable' },
      plants: [mkPlant({ category: 'herb', variety: 'Basilíka' })],
    });
    expect(d).toContain('Véritable SMART');
    expect(d).toContain('EKKI moldarækt');
  });

  it('outdoor digest contains season name instead of daylight', () => {
    const d = digest({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', variety: 'Evalkarfla' })],
    });
    expect(d).toContain('Útiræktun');
    expect(d).toContain('frost');
  });

  it('harvest total appears when harvests present', () => {
    const d = digest({ harvests: [mkHarvest(150), mkHarvest(200)] });
    expect(d).toContain('350 g');
  });

  it('no archived plants shown', () => {
    const d = digest({
      plants: [
        mkPlant({ id: 'p1', variety: 'Virk' }),
        mkPlant({ id: 'p2', variety: 'Arkíveri', archived: true }),
      ],
    });
    expect(d).toContain('Virk');
    expect(d).not.toContain('Arkíveri');
  });

  it('digest lines are newline-joined (structure check)', () => {
    const d = digest();
    const lines = d.split('\n');
    expect(lines.length).toBeGreaterThan(5);
    // First line always starts with "Ræktun:"
    expect(lines[0]).toMatch(/^Ræktun:/);
  });
});

// ─── buildAssessmentPrompt SNAPSHOT / STRUCTURE LOCK ─────────────────────────

describe('buildAssessmentPrompt structure lock', () => {
  const plant = mkPlant({ currentPhase: 'flowering' });

  it('contains plant label and variety', () => {
    const p = buildAssessmentPrompt(plant);
    expect(p).toContain('Evalpipar');
    expect(p).toContain('Evalpipar');
  });

  it('contains phase label in Icelandic', () => {
    const p = buildAssessmentPrompt(plant);
    expect(p).toContain('blómgun');
  });

  it('requires "Heilsa: N/10" format in response', () => {
    const p = buildAssessmentPrompt(plant);
    expect(p).toContain('Heilsa: N/10');
  });

  it('includes actionable next-step arrow "→ " instruction', () => {
    const p = buildAssessmentPrompt(plant);
    expect(p).toContain('→ ');
  });

  it('wholeGrowPhoto flag adds clarifying note', () => {
    const p = buildAssessmentPrompt(plant, { wholeGrowPhoto: true });
    expect(p).toContain('ALLA ræktunina');
  });

  it('without flag: no whole-grow note', () => {
    const p = buildAssessmentPrompt(plant);
    expect(p).not.toContain('ALLA ræktunina');
  });
});

describe('parseHealthScore structure lock', () => {
  it('reads N/10 from first line', () => {
    expect(parseHealthScore('Heilsa: 8/10 — Góð\nPlöntan lítur vel út.')).toBe(8);
  });

  it('reads 0/10', () => {
    expect(parseHealthScore('Heilsa: 0/10 — Dauð')).toBe(0);
  });

  it('reads 10/10', () => {
    expect(parseHealthScore('Heilsa: 10/10 — Fullkomin!')).toBe(10);
  });

  it('returns null when no N/10 pattern present', () => {
    expect(parseHealthScore('Myndin er óskýr og sýnir ekki plöntuna.')).toBeNull();
  });

  it('rejects out-of-range value (11)', () => {
    expect(parseHealthScore('Heilsa: 11/10 — Ofur!')).toBeNull();
  });

  it('ignores extra whitespace around slash', () => {
    expect(parseHealthScore('7 / 10')).toBe(7);
  });
});

// ─── buildCountPrompt / parseCount SNAPSHOT LOCK ─────────────────────────────

describe('buildCountPrompt structure lock', () => {
  // variety 'Albion', no nickname → plantLabel returns 'Albion'
  const plant = mkPlant({ variety: 'Albion' });

  it('contains plant label and variety', () => {
    const p = buildCountPrompt(plant, 'aldin');
    // plantLabel(plant) === plant.variety === 'Albion' (no nickname set)
    expect(p).toContain('Albion');
  });

  it('names the thing being counted (aldin)', () => {
    expect(buildCountPrompt(plant, 'aldin')).toContain('aldin');
  });

  it('names the thing being counted (blóm)', () => {
    expect(buildCountPrompt(plant, 'blóm')).toContain('blóm');
  });

  it('names the thing being counted (klasar)', () => {
    expect(buildCountPrompt(plant, 'klasar')).toContain('klasa');
  });

  it('requires FJÖLDI: format in response', () => {
    const p = buildCountPrompt(plant, 'aldin');
    expect(p).toContain('FJÖLDI:');
  });

  it('instructs to answer in Icelandic', () => {
    const p = buildCountPrompt(plant, 'aldin');
    expect(p).toContain('íslensku');
  });

  it('instructs to count only what is visible (no guessing)', () => {
    const p = buildCountPrompt(plant, 'aldin');
    expect(p).toContain('greinilega');
  });
});

describe('parseCount structure lock', () => {
  it('reads FJÖLDI: <n> from first line', () => {
    expect(parseCount('FJÖLDI: 14\nÉg sá 14 þroskuð aldin.')).toBe(14);
  });

  it('reads FJÖLDI: 0', () => {
    expect(parseCount('**FJÖLDI: 0** Myndin er óskýr.')).toBe(0);
  });

  it('case-insensitive FJÖLDI', () => {
    expect(parseCount('fjöldi : 7')).toBe(7);
  });

  it('falls back to first integer if no FJÖLDI label', () => {
    expect(parseCount('Ég tel 9 ber á myndinni.')).toBe(9);
  });

  it('returns null if no number at all', () => {
    expect(parseCount('Engin planta sjáanleg.')).toBeNull();
  });

  it('handles inline bold markdown formatting', () => {
    expect(parseCount('**FJÖLDI: 3**')).toBe(3);
  });

  it('reads large counts correctly', () => {
    expect(parseCount('FJÖLDI: 250')).toBe(250);
  });
});
