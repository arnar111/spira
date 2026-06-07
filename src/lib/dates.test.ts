import { describe, expect, it } from 'vitest';
import { dayWord, longDate, relativeTime, shortDate } from '@/lib/dates';

const TS = Date.UTC(2026, 5, 7, 12); // 7. júní 2026

describe('shortDate / longDate', () => {
  it('íslensk snið', () => {
    expect(shortDate(TS)).toContain('7');
    expect(shortDate(TS).toLowerCase()).toContain('jún');
    expect(longDate(TS)).toContain('júní');
    expect(longDate(TS)).toContain('2026');
  });
});

describe('relativeTime', () => {
  const MIN = 60_000;
  it('þrep: rétt í þessu → mín → klst → dagar', () => {
    expect(relativeTime(TS, TS)).toBe('rétt í þessu');
    expect(relativeTime(TS - 5 * MIN, TS)).toBe('fyrir 5 mín');
    expect(relativeTime(TS - 3 * 60 * MIN, TS)).toBe('fyrir 3 klst');
    expect(relativeTime(TS - 24 * 60 * MIN, TS)).toBe('fyrir 1 degi');
    expect(relativeTime(TS - 5 * 24 * 60 * MIN, TS)).toBe('fyrir 5 dögum');
  });

  it('framtíðar-tímastimpill klemmist á „rétt í þessu"', () => {
    expect(relativeTime(TS + 10 * MIN, TS)).toBe('rétt í þessu');
  });
});

describe('dayWord', () => {
  it('eintala/fleirtala, líka neikvætt', () => {
    expect(dayWord(1)).toBe('dag');
    expect(dayWord(-1)).toBe('dag');
    expect(dayWord(0)).toBe('daga');
    expect(dayWord(5)).toBe('daga');
  });
});
