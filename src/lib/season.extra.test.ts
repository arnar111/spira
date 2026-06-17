/**
 * season.ts — extra edge cases for growIsOutdoor and seasonForMonth beyond
 * what season.test.ts already covers.
 */
import { describe, expect, it } from 'vitest';
import { growIsOutdoor, seasonForMonth, frostRisk, isGrowingSeason } from '@/lib/season';

describe('growIsOutdoor — edge cases', () => {
  // These supplement the base cases in season.test.ts.

  it('tómur plöntulisti → innandyra (not outdoor)', () => {
    expect(growIsOutdoor({}, [])).toBe(false);
  });

  it('allir plöntur geymdir, einnig kartöflur → innandyra', () => {
    const plants = [
      { archived: true, category: 'potato' },
      { archived: true, category: 'potato' },
    ];
    expect(growIsOutdoor({}, plants)).toBe(false);
  });

  it('blönduð: ein virk kartafla + geymdar paprikur → útiræktun', () => {
    const plants = [
      { archived: false, category: 'pepper' },
      { archived: true, category: 'potato' },
      { archived: false, category: 'potato' },
    ];
    expect(growIsOutdoor({}, plants)).toBe(true);
  });

  it('garden locationKey + environment=indoor: environment vinnur (indoor)', () => {
    expect(growIsOutdoor({ environment: 'indoor', locationKey: 'garden' })).toBe(false);
  });

  it('outdoor environment + virk kartafla: environment ræður (outdoor)', () => {
    expect(
      growIsOutdoor({ environment: 'outdoor' }, [{ archived: false, category: 'potato' }]),
    ).toBe(true);
  });

  it('locationKey tent (ekki garden) og engin plöntur → innandyra', () => {
    expect(growIsOutdoor({ locationKey: 'tent' })).toBe(false);
  });

  it('locationKey undefined og engin plöntur → innandyra', () => {
    expect(growIsOutdoor({ locationKey: undefined })).toBe(false);
  });

  it('aðeins tómatar (ekki kartöflur) gera ræktun EKKI útiræktun', () => {
    const plants = [{ archived: false, category: 'tomato' }];
    expect(growIsOutdoor({}, plants)).toBe(false);
  });
});

describe('seasonForMonth — yfirflæðisbreyting og hlutlæg mörk', () => {
  it('mánuður 14 → mánuður 2 (febrúar)', () => {
    const s = seasonForMonth(14);
    expect(s.month).toBe(2);
  });

  it('mánuður 24 → mánuður 12 (desember)', () => {
    const s = seasonForMonth(24);
    expect(s.month).toBe(12);
  });

  it('mánuður -11 → mánuður 1 (janúar)', () => {
    const s = seasonForMonth(-11);
    expect(s.month).toBe(1);
  });

  it('frostlausir mánuðir eru einungis 6, 7, 8', () => {
    const frostFree = [6, 7, 8];
    for (let m = 1; m <= 12; m++) {
      expect(frostRisk(m) === 'none').toBe(frostFree.includes(m));
    }
  });

  it('isGrowingSeason er satt þegar frost er ekki "hard"', () => {
    // Maí (5) og september (9) hafa "risk" → growing season
    expect(isGrowingSeason(5)).toBe(true);
    expect(isGrowingSeason(9)).toBe(true);
    // Desember (12) hefur "hard" → ekki growing season
    expect(isGrowingSeason(12)).toBe(false);
  });
});
