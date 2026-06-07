import { describe, expect, it } from 'vitest';
import type { EnvironmentSample, LogEntry } from '@/lib/db';
import {
  ecSeries,
  lightHoursLogSeries,
  lightHoursSeries,
  meanWateringInterval,
  phSeries,
  values,
  wateringAmountSeries,
  wateringEvents,
  wateringIntervals,
} from '@/lib/series';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 5, 1, 12);

function log(over: Partial<LogEntry> & Pick<LogEntry, 'type'>): LogEntry {
  return {
    id: `l-${over.type}-${over.timestamp ?? T0}-${Math.random()}`,
    growId: 'g1',
    timestamp: T0,
    ...over,
  };
}

function sample(over: Partial<EnvironmentSample> = {}): EnvironmentSample {
  return { id: `e-${over.timestamp ?? T0}`, growId: 'g1', timestamp: T0, ...over };
}

describe('phSeries / ecSeries', () => {
  it('dregur pH og EC úr bæði water- og feed-loggum, raðað elst fyrst', () => {
    const logs: LogEntry[] = [
      log({ type: 'feed', timestamp: T0 + 2 * DAY, data: { ph: '6.0', ec: 1.6 } }),
      log({ type: 'water', timestamp: T0, data: { ph: 6.2, ec: '1.4' } }),
      log({ type: 'water', timestamp: T0 + 1 * DAY, data: { ph: 6.5 } }),
    ];
    expect(values(phSeries(logs))).toEqual([6.2, 6.5, 6.0]);
    // EC vantar í miðju-loggnum → fellur út.
    const ec = ecSeries(logs);
    expect(values(ec)).toEqual([1.4, 1.6]);
    expect(ec[0].t).toBe(T0);
  });

  it('sleppir gölluðum/vantandi gildum og öðrum log-gerðum', () => {
    const logs: LogEntry[] = [
      log({ type: 'water', data: { ph: 'ekki tala' } }),
      log({ type: 'note', data: { ph: 6.4 } }),
      log({ type: 'water', data: {} }),
      log({ type: 'water' }),
    ];
    expect(phSeries(logs)).toEqual([]);
  });
});

describe('wateringAmountSeries', () => {
  it('tekur aðeins amountMl úr vökvunarloggum', () => {
    const logs: LogEntry[] = [
      log({ type: 'water', timestamp: T0, data: { amountMl: 200 } }),
      log({ type: 'feed', timestamp: T0 + DAY, data: { amountMl: 999 } }),
      log({ type: 'water', timestamp: T0 + 2 * DAY, data: { amountMl: '150' } }),
    ];
    expect(values(wateringAmountSeries(logs))).toEqual([200, 150]);
  });
});

describe('lightHoursSeries (umhverfis-sýni)', () => {
  it('dregur lightHours úr EnvironmentSample, raðað elst fyrst', () => {
    const samples = [
      sample({ timestamp: T0 + DAY, lightHours: 16 }),
      sample({ timestamp: T0, lightHours: 18 }),
      sample({ timestamp: T0 + 2 * DAY }), // ekkert lightHours
    ];
    expect(values(lightHoursSeries(samples))).toEqual([18, 16]);
  });
});

describe('lightHoursLogSeries (environment-logg)', () => {
  it('dregur data.lightHours úr environment-loggum', () => {
    const logs: LogEntry[] = [
      log({ type: 'environment', timestamp: T0, data: { lightHours: 14 } }),
      log({ type: 'environment', timestamp: T0 + DAY, data: { lightHours: '12.5' } }),
      log({ type: 'water', data: { lightHours: 99 } }),
    ];
    expect(values(lightHoursLogSeries(logs))).toEqual([14, 12.5]);
  });
});

describe('wateringEvents / wateringIntervals / meanWateringInterval', () => {
  it('atburðir raðast elst fyrst með magni þegar það er til', () => {
    const logs: LogEntry[] = [
      log({ type: 'water', timestamp: T0 + 3 * DAY, data: { amountMl: 100 } }),
      log({ type: 'water', timestamp: T0 }),
    ];
    const ev = wateringEvents(logs);
    expect(ev.map((e) => e.t)).toEqual([T0, T0 + 3 * DAY]);
    expect(ev[0].amountMl).toBeUndefined();
    expect(ev[1].amountMl).toBe(100);
  });

  it('bil í dögum reiknast rétt milli vökvana', () => {
    const logs: LogEntry[] = [
      log({ type: 'water', timestamp: T0 }),
      log({ type: 'water', timestamp: T0 + 2 * DAY }),
      log({ type: 'water', timestamp: T0 + 5 * DAY }),
    ];
    expect(wateringIntervals(logs)).toEqual([2, 3]);
    expect(meanWateringInterval(logs)).toBeCloseTo(2.5, 6);
  });

  it('færri en tvær vökvanir → tómt bil og null meðaltal', () => {
    expect(wateringIntervals([log({ type: 'water' })])).toEqual([]);
    expect(meanWateringInterval([])).toBeNull();
    expect(meanWateringInterval([log({ type: 'water' })])).toBeNull();
  });
});
