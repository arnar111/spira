import { describe, expect, it } from 'vitest';
import {
  REYKJAVIK_DAYLIGHT,
  daylightForMonth,
  daylightStatus,
  needsGrowLight,
} from '@/lib/daylight';

/** LED-þörf (< 10 klst dagsbirta): jan, feb, okt, nóv, des. */
const NEEDS_LIGHT: Record<number, boolean> = {
  1: true,
  2: true,
  3: false,
  4: false,
  5: false,
  6: false,
  7: false,
  8: false,
  9: false,
  10: true,
  11: true,
  12: true,
};

/** good ≥ 16 klst, ok ≥ 10 klst, annars low. */
const EXPECTED_TONE: Record<number, 'good' | 'ok' | 'low'> = {
  1: 'low',
  2: 'low',
  3: 'ok',
  4: 'ok',
  5: 'good',
  6: 'good',
  7: 'good',
  8: 'good',
  9: 'ok',
  10: 'low',
  11: 'low',
  12: 'low',
};

describe('daylightForMonth', () => {
  it('skilar réttum mánuði fyrir 1–12', () => {
    for (let m = 1; m <= 12; m++) {
      expect(daylightForMonth(m).month).toBe(m);
    }
  });

  it('vefur mánuði utan 1–12', () => {
    expect(daylightForMonth(13).month).toBe(1);
    expect(daylightForMonth(0).month).toBe(12);
  });

  it('birtutaflan er einkennandi fyrir Reykjavík (dimmur des, bjartur jún)', () => {
    expect(daylightForMonth(12).hours).toBeLessThan(6);
    expect(daylightForMonth(6).hours).toBeGreaterThan(20);
  });
});

describe('needsGrowLight', () => {
  it.each(Object.entries(NEEDS_LIGHT))('mánuður %s → %s', (month, needs) => {
    expect(needsGrowLight(Number(month))).toBe(needs);
  });
});

describe('daylightStatus', () => {
  it.each(Object.entries(EXPECTED_TONE))('mánuður %s → %s', (month, tone) => {
    expect(daylightStatus(Number(month)).tone).toBe(tone);
  });

  it('merkingar eru íslenskar og í samræmi við tón', () => {
    expect(daylightStatus(6).label).toBe('Náttúrubirta í toppstandi');
    expect(daylightStatus(3).label).toBe('Náttúrubirta nægir');
    expect(daylightStatus(12).label).toBe('Þörf á gróðurljósi');
  });
});

describe('REYKJAVIK_DAYLIGHT gögnin sjálf', () => {
  it('12 mánuðir í röð með nótum og aðgerðum', () => {
    expect(REYKJAVIK_DAYLIGHT).toHaveLength(12);
    REYKJAVIK_DAYLIGHT.forEach((d, i) => {
      expect(d.month).toBe(i + 1);
      expect(d.hours).toBeGreaterThan(0);
      expect(d.hours).toBeLessThanOrEqual(24);
      expect(d.windowNote.length).toBeGreaterThan(0);
      expect(d.action.length).toBeGreaterThan(0);
    });
  });
});
