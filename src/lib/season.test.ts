import { describe, expect, it } from 'vitest';
import {
  frostRisk,
  growIsOutdoor,
  isGrowingSeason,
  seasonForMonth,
  seasonStatus,
  type FrostRisk,
} from '@/lib/season';

/** Frostdagatal Reykjavíkur — síðasta vorfrost ~lok maí, fyrsta haustfrost ~lok sept. */
const EXPECTED_FROST: Record<number, FrostRisk> = {
  1: 'hard',
  2: 'hard',
  3: 'hard',
  4: 'hard',
  5: 'risk',
  6: 'none',
  7: 'none',
  8: 'none',
  9: 'risk',
  10: 'hard',
  11: 'hard',
  12: 'hard',
};

describe('frostRisk / seasonForMonth', () => {
  it.each(Object.entries(EXPECTED_FROST))('mánuður %s → %s', (month, risk) => {
    expect(frostRisk(Number(month))).toBe(risk);
  });

  it('seasonForMonth skilar réttum mánuði með nafni og ráði', () => {
    for (let m = 1; m <= 12; m++) {
      const season = seasonForMonth(m);
      expect(season.month).toBe(m);
      expect(season.name.length).toBeGreaterThan(0);
      expect(season.outdoorNote.length).toBeGreaterThan(0);
    }
  });

  it('vefur mánuði utan 1–12', () => {
    expect(seasonForMonth(13).month).toBe(1);
    expect(seasonForMonth(0).month).toBe(12);
    expect(seasonForMonth(-1).month).toBe(11);
  });
});

describe('isGrowingSeason', () => {
  it('satt maí–september (frost ekki "hard")', () => {
    for (let m = 1; m <= 12; m++) {
      expect(isGrowingSeason(m)).toBe(EXPECTED_FROST[m] !== 'hard');
    }
  });
});

describe('seasonStatus', () => {
  it('frostlaus → good', () => {
    expect(seasonStatus(7)).toEqual({ tone: 'good', label: 'Frostlaus vaxtartími' });
  });

  it('jaðarmánuður → ok', () => {
    expect(seasonStatus(5).tone).toBe('ok');
    expect(seasonStatus(9).tone).toBe('ok');
  });

  it('vetrarfrost → low', () => {
    expect(seasonStatus(1).tone).toBe('low');
    expect(seasonStatus(12).tone).toBe('low');
  });
});

describe('growIsOutdoor (grow-only útgáfan í season.ts)', () => {
  it('environment ræður þegar það er sett', () => {
    expect(growIsOutdoor({ environment: 'outdoor' })).toBe(true);
    expect(growIsOutdoor({ environment: 'indoor' })).toBe(false);
    // environment vinnur fram yfir locationKey
    expect(growIsOutdoor({ environment: 'indoor', locationKey: 'garden' })).toBe(false);
  });

  it('fellur á locationKey "garden" þegar environment vantar', () => {
    expect(growIsOutdoor({ locationKey: 'garden' })).toBe(true);
    expect(growIsOutdoor({ locationKey: 'window' })).toBe(false);
  });

  it('hvorugt sett → innandyra', () => {
    expect(growIsOutdoor({})).toBe(false);
  });

  // ATH: Rós-vélin hefur sína plöntu-meðvituðu útgáfu sem telur kartöflur
  // alltaf útiræktun — sá munur er staðfestur í ros/engine.test.ts (4.3 sameinar).
});
