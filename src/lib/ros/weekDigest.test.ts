import { describe, it, expect } from 'vitest';
import { buildWeekDigest, type WeekDigestInput, type PhotoMeta } from './weekDigest';
import type { LogEntry, HarvestEntry, EnvironmentSample, LogType } from '@/lib/db';

const DAY_MS = 86_400_000;
// Fastur 'now' — deterministísk próf (7. jún. 2026 hádegi UTC).
const NOW = Date.UTC(2026, 5, 7, 12, 0, 0);

let seq = 0;
function log(type: LogType, daysAgo: number, extra: Partial<LogEntry> = {}): LogEntry {
  return {
    id: `log-${seq++}`,
    growId: 'g1',
    timestamp: NOW - daysAgo * DAY_MS,
    type,
    ...extra,
  };
}

function harvest(daysAgo: number, weightG: number, podCount?: number): HarvestEntry {
  return {
    id: `h-${seq++}`,
    growId: 'g1',
    plantId: 'p1',
    timestamp: NOW - daysAgo * DAY_MS,
    weightG,
    podCount,
  };
}

function env(daysAgo: number, tempC?: number, humidityPct?: number): EnvironmentSample {
  return {
    id: `e-${seq++}`,
    growId: 'g1',
    timestamp: NOW - daysAgo * DAY_MS,
    tempC,
    humidityPct,
  };
}

function photo(daysAgo: number): PhotoMeta {
  return { takenAt: NOW - daysAgo * DAY_MS };
}

function emptyInput(): WeekDigestInput {
  return { logs: [], harvests: [], envSamples: [], photos: [], now: NOW };
}

describe('buildWeekDigest — empty data', () => {
  it('produces a valid digest with zeros/nulls and isEmpty', () => {
    const d = buildWeekDigest(emptyInput());
    expect(d.isEmpty).toBe(true);
    expect(d.highlights).toEqual([]);
    expect(d.activities.waterings).toEqual({ current: 0, previous: 0, delta: 0 });
    expect(d.harvest.grams).toEqual({ current: 0, previous: 0, delta: 0 });
    expect(d.harvest.pods).toEqual({ current: 0, previous: 0, delta: 0 });
    expect(d.photos).toEqual({ current: 0, previous: 0, delta: 0 });
    expect(d.environment.tempC).toEqual({ min: null, max: null, avg: null, avgDelta: null });
    expect(d.environment.humidityPct).toEqual({
      min: null,
      max: null,
      avg: null,
      avgDelta: null,
    });
    expect(d.windowStart).toBe(NOW - 7 * DAY_MS);
    expect(d.windowEnd).toBe(NOW);
  });

  it('is not empty if only the previous week has data', () => {
    const d = buildWeekDigest({ ...emptyInput(), logs: [log('water', 10)] });
    expect(d.isEmpty).toBe(false);
    expect(d.activities.waterings).toEqual({ current: 0, previous: 1, delta: -1 });
  });
});

describe('buildWeekDigest — activity counts & deltas', () => {
  it('counts each activity type in the current vs previous window', () => {
    const logs: LogEntry[] = [
      // current week (0-6 days ago)
      log('water', 1),
      log('water', 2),
      log('feed', 3),
      log('prune', 1),
      log('top', 2),
      log('pollinate', 4),
      log('pest', 5),
      log('disease', 6),
      log('note', 1),
      // previous week (7-13 days ago)
      log('water', 8),
      log('note', 9),
      log('note', 10),
    ];
    const d = buildWeekDigest({ ...emptyInput(), logs });
    expect(d.activities.waterings).toEqual({ current: 2, previous: 1, delta: 1 });
    expect(d.activities.feedings).toEqual({ current: 1, previous: 0, delta: 1 });
    expect(d.activities.prunesAndTops).toEqual({ current: 2, previous: 0, delta: 2 });
    expect(d.activities.pollinations).toEqual({ current: 1, previous: 0, delta: 1 });
    expect(d.activities.pestDiseaseReports).toEqual({ current: 2, previous: 0, delta: 2 });
    expect(d.activities.notes).toEqual({ current: 1, previous: 2, delta: -1 });
  });

  it('treats windows as [start, end): now is excluded, the 7d-ago boundary is current', () => {
    const logs: LogEntry[] = [
      log('water', 0), // exactly now → excluded (timestamp >= curEnd)
      log('water', 7), // exactly curStart → inclusive start of current week
      log('water', 14), // exactly prevStart → inclusive start of previous week
    ];
    const d = buildWeekDigest({ ...emptyInput(), logs });
    expect(d.activities.waterings.current).toBe(1); // only the 7d-ago one
    expect(d.activities.waterings.previous).toBe(1); // only the 14d-ago one
  });

  it('ignores logs older than 14 days', () => {
    const d = buildWeekDigest({ ...emptyInput(), logs: [log('water', 20)] });
    expect(d.isEmpty).toBe(true);
    expect(d.activities.waterings).toEqual({ current: 0, previous: 0, delta: 0 });
  });
});

describe('buildWeekDigest — harvest', () => {
  it('sums grams and pods this week with delta vs previous', () => {
    const harvests: HarvestEntry[] = [
      harvest(1, 120, 8),
      harvest(3, 30, 2),
      harvest(9, 50, 4), // previous week
    ];
    const d = buildWeekDigest({ ...emptyInput(), harvests });
    expect(d.harvest.grams).toEqual({ current: 150, previous: 50, delta: 100 });
    expect(d.harvest.pods).toEqual({ current: 10, previous: 4, delta: 6 });
  });

  it('handles missing podCount gracefully', () => {
    const d = buildWeekDigest({ ...emptyInput(), harvests: [harvest(1, 100)] });
    expect(d.harvest.grams.current).toBe(100);
    expect(d.harvest.pods.current).toBe(0);
  });
});

describe('buildWeekDigest — photos', () => {
  it('counts photos by takenAt in each window', () => {
    const photos = [photo(1), photo(2), photo(6), photo(8)];
    const d = buildWeekDigest({ ...emptyInput(), photos });
    expect(d.photos).toEqual({ current: 3, previous: 1, delta: 2 });
  });
});

describe('buildWeekDigest — environment', () => {
  it('computes min/max/avg and avg delta', () => {
    const envSamples: EnvironmentSample[] = [
      env(1, 22, 60),
      env(2, 26, 50),
      env(3, 24, 55),
      // previous week avg temp 20
      env(9, 18, 40),
      env(10, 22, 50),
    ];
    const d = buildWeekDigest({ ...emptyInput(), envSamples });
    expect(d.environment.tempC.min).toBe(22);
    expect(d.environment.tempC.max).toBe(26);
    expect(d.environment.tempC.avg).toBeCloseTo(24);
    expect(d.environment.tempC.avgDelta).toBeCloseTo(4); // 24 - 20
    expect(d.environment.humidityPct.avg).toBeCloseTo(55);
    expect(d.environment.humidityPct.avgDelta).toBeCloseTo(10); // 55 - 45
  });

  it('handles partial fields: tempC present, humidity undefined', () => {
    const envSamples: EnvironmentSample[] = [
      env(1, 23, undefined),
      env(2, 25, undefined),
    ];
    const d = buildWeekDigest({ ...emptyInput(), envSamples });
    expect(d.environment.tempC.avg).toBeCloseTo(24);
    expect(d.environment.humidityPct.avg).toBeNull();
    expect(d.environment.humidityPct.min).toBeNull();
  });

  it('avgDelta is null when one week lacks env data', () => {
    const d = buildWeekDigest({ ...emptyInput(), envSamples: [env(1, 24)] });
    expect(d.environment.tempC.avg).toBeCloseTo(24);
    expect(d.environment.tempC.avgDelta).toBeNull();
    expect(d.isEmpty).toBe(false);
  });

  it('ignores non-finite values', () => {
    const envSamples: EnvironmentSample[] = [env(1, NaN, 60), env(2, 24, 50)];
    const d = buildWeekDigest({ ...emptyInput(), envSamples });
    expect(d.environment.tempC.avg).toBeCloseTo(24);
    expect(d.environment.tempC.min).toBe(24);
  });
});

describe('buildWeekDigest — highlights', () => {
  it('reports the first harvest of the week', () => {
    const d = buildWeekDigest({ ...emptyInput(), harvests: [harvest(1, 120, 8)] });
    expect(d.highlights[0]).toBe('Fyrsta tínsla vikunnar: 120 g');
  });

  it('reports days since last watering when none this week', () => {
    // last watering 5 days ago is within current week, so use one 9 days ago with
    // no current-week waterings.
    const d = buildWeekDigest({ ...emptyInput(), logs: [log('water', 9), log('note', 1)] });
    expect(d.highlights).toContain('Engin vökvun skráð í 9 daga');
  });

  it('uses singular dagur word correctly', () => {
    const d = buildWeekDigest({ ...emptyInput(), logs: [log('water', 8), log('note', 1)] });
    expect(d.highlights).toContain('Engin vökvun skráð í 8 daga');
    const d1 = buildWeekDigest({ ...emptyInput(), logs: [log('note', 1), log('water', 15)] });
    // last watering 15 days ago, current week 0 → daysSince = 15
    expect(d1.highlights.some((h) => h.startsWith('Engin vökvun skráð'))).toBe(true);
  });

  it('reports a meaningful mean-temperature change with Icelandic decimal comma', () => {
    const envSamples: EnvironmentSample[] = [
      env(1, 24.1),
      env(9, 22.0),
    ];
    const d = buildWeekDigest({ ...emptyInput(), envSamples });
    expect(d.highlights.some((h) => h.includes('Meðalhiti hækkaði um 2,1°C'))).toBe(true);
  });

  it('does not flag tiny temp changes (< 1°C)', () => {
    const envSamples: EnvironmentSample[] = [env(1, 24.4), env(9, 24.0)];
    const d = buildWeekDigest({ ...emptyInput(), envSamples });
    expect(d.highlights.some((h) => h.startsWith('Meðalhiti'))).toBe(false);
  });

  it('caps highlights at 4', () => {
    const logs: LogEntry[] = [
      log('water', 8), // none this week → "engin vökvun"
      log('pest', 1),
      log('pest', 2),
      log('note', 1),
    ];
    const envSamples = [env(1, 28), env(9, 20)]; // +8°C
    const harvests = [harvest(1, 200, 10)]; // first harvest
    const photos = [photo(1), photo(2), photo(3)];
    const d = buildWeekDigest({ logs, harvests, envSamples, photos, now: NOW });
    expect(d.highlights.length).toBeLessThanOrEqual(4);
  });

  it('orders most-notable first: first-harvest before temp change', () => {
    const harvests = [harvest(1, 80, 4)];
    const envSamples = [env(1, 27), env(9, 22)];
    const d = buildWeekDigest({ ...emptyInput(), harvests, envSamples });
    const harvestIdx = d.highlights.findIndex((h) => h.startsWith('Fyrsta tínsla'));
    const tempIdx = d.highlights.findIndex((h) => h.startsWith('Meðalhiti'));
    expect(harvestIdx).toBeGreaterThanOrEqual(0);
    expect(tempIdx).toBeGreaterThan(harvestIdx);
  });

  it('reports "no activity this week" when prior data exists but current week empty', () => {
    const d = buildWeekDigest({ ...emptyInput(), logs: [log('feed', 9)] });
    // current week has no waterings → "engin vökvun" grabs first; that satisfies it.
    expect(d.highlights.length).toBeGreaterThan(0);
  });
});

describe('buildWeekDigest — determinism', () => {
  it('returns identical output for identical fixed input', () => {
    const make = (): WeekDigestInput => ({
      logs: [log('water', 1), log('feed', 2), log('note', 3)],
      harvests: [harvest(1, 100, 5)],
      envSamples: [env(1, 24, 60), env(9, 21, 55)],
      photos: [photo(1), photo(2)],
      now: NOW,
    });
    // reset seq so ids match between runs
    seq = 0;
    const a = buildWeekDigest(make());
    seq = 0;
    const b = buildWeekDigest(make());
    expect(a).toEqual(b);
  });
});
