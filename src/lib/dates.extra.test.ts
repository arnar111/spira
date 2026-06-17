/**
 * dates.ts — extra edge cases not covered by the main dates.test.ts.
 * Boundary conditions, large values, leap-year dates, hour/minute boundaries.
 */
import { describe, expect, it } from 'vitest';
import { dayWord, longDate, relativeTime, shortDate } from '@/lib/dates';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('relativeTime — nákvæm mörk', () => {
  const NOW = Date.UTC(2026, 5, 7, 12);

  it('59 sekúndur → rétt í þessu', () => {
    expect(relativeTime(NOW - 59_000, NOW)).toBe('rétt í þessu');
  });

  it('1 mínúta nákvæm (60 000 ms)', () => {
    expect(relativeTime(NOW - 1 * MIN, NOW)).toBe('fyrir 1 mín');
  });

  it('59 mínútur → 59 mín, EKKI klst', () => {
    expect(relativeTime(NOW - 59 * MIN, NOW)).toBe('fyrir 59 mín');
  });

  it('nákvæmlega 60 mínútur → 1 klst', () => {
    expect(relativeTime(NOW - 60 * MIN, NOW)).toBe('fyrir 1 klst');
  });

  it('23 klukkustundir → 23 klst, EKKI dagur', () => {
    expect(relativeTime(NOW - 23 * HOUR, NOW)).toBe('fyrir 23 klst');
  });

  it('nákvæmlega 24 klukkustundir → 1 degi', () => {
    expect(relativeTime(NOW - 24 * HOUR, NOW)).toBe('fyrir 1 degi');
  });

  it('2 dagar → dögum (fleirtala)', () => {
    expect(relativeTime(NOW - 2 * DAY, NOW)).toBe('fyrir 2 dögum');
  });

  it('100 dagar → 100 dögum', () => {
    expect(relativeTime(NOW - 100 * DAY, NOW)).toBe('fyrir 100 dögum');
  });

  it('ts === now (núll munur) → rétt í þessu', () => {
    expect(relativeTime(NOW, NOW)).toBe('rétt í þessu');
  });

  it('framtíð klemmist við rétt í þessu (diff → 0)', () => {
    expect(relativeTime(NOW + DAY, NOW)).toBe('rétt í þessu');
  });
});

describe('shortDate / longDate — snið á ólíkum dagsetningum', () => {
  it('1. janúar (áramót)', () => {
    const ts = Date.UTC(2026, 0, 1, 12);
    const s = shortDate(ts);
    expect(s).toContain('1');
    // is-IS locale: 'jan.' eða 'jan'
    expect(s.toLowerCase()).toMatch(/jan/);
    expect(longDate(ts)).toContain('janúar');
    expect(longDate(ts)).toContain('2026');
  });

  it('31. desember', () => {
    const ts = Date.UTC(2025, 11, 31, 12);
    expect(longDate(ts)).toContain('desember');
    expect(longDate(ts)).toContain('2025');
  });

  it('hlaupár: 29. febrúar 2028', () => {
    const ts = Date.UTC(2028, 1, 29, 12);
    expect(shortDate(ts)).toContain('29');
    expect(longDate(ts)).toContain('febrúar');
    expect(longDate(ts)).toContain('2028');
  });

  it('Unix tími 0 (1. jan. 1970)', () => {
    // Should not throw, just format something reasonable
    expect(() => shortDate(0)).not.toThrow();
    expect(() => longDate(0)).not.toThrow();
  });
});

describe('dayWord — mörk og fleirtala', () => {
  it('0 → daga', () => expect(dayWord(0)).toBe('daga'));
  it('1 → dag', () => expect(dayWord(1)).toBe('dag'));
  it('-1 → dag (eintala í tölugildi)', () => expect(dayWord(-1)).toBe('dag'));
  it('2 → daga', () => expect(dayWord(2)).toBe('daga'));
  it('10 → daga', () => expect(dayWord(10)).toBe('daga'));
  it('21 → daga (ekki sérmeðhöndlun á 21)', () => expect(dayWord(21)).toBe('daga'));
  it('-5 → daga', () => expect(dayWord(-5)).toBe('daga'));
});
