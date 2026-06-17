/**
 * logSchema.ts — extra edge cases not covered by logSchema.test.ts.
 * Focus: zero as valid number, deeply nested garbage, all log types
 * round-trip through logData, formatLogData consistency.
 */
import { describe, expect, it } from 'vitest';
import type { LogType } from '@/lib/db';
import { logData, formatLogData, LOG_FIELDS, LOG_TYPE_META } from '@/lib/logSchema';

describe('logData — núll (0) er gilt gildi, ekki falsy', () => {
  it('water: amountMl=0 → 0 (ekki undefined)', () => {
    const d = logData('water', { amountMl: 0 });
    expect(d.amountMl).toBe(0);
  });

  it('water: ph=0 → 0', () => {
    const d = logData('water', { ph: 0 });
    expect(d.ph).toBe(0);
  });

  it('feed: doseMlPerL=0 → 0', () => {
    const d = logData('feed', { doseMlPerL: 0 });
    expect(d.doseMlPerL).toBe(0);
  });

  it('environment: lightHours=0 → 0 (dökkur dagur)', () => {
    const d = logData('environment', { lightHours: 0 });
    expect(d.lightHours).toBe(0);
  });

  it('harvest: podCount=0 → 0', () => {
    const d = logData('harvest', { podCount: 0 });
    expect(d.podCount).toBe(0);
  });

  it('pollinate: fruitCount=0 → 0 (aldin tínd niður)', () => {
    const d = logData('pollinate', { fruitCount: 0 });
    expect(d.fruitCount).toBe(0);
  });
});

describe('logData — null og undefined innihaldsreitir', () => {
  it('null gildi → undefined (ekki hrun)', () => {
    const d = logData('feed', { nutrient: null, doseMlPerL: null });
    expect(d.nutrient).toBeUndefined();
    expect(d.doseMlPerL).toBeUndefined();
  });

  it('hlutlægt grunngilt (object) í tölusvið → undefined', () => {
    const d = logData('water', { amountMl: {}, ph: [], ec: true });
    expect(d.amountMl).toBeUndefined();
    expect(d.ph).toBeUndefined();
    expect(d.ec).toBeUndefined();
  });
});

describe('logData — allar log-gerðir skila réttri grunnskipan', () => {
  const allTypes: LogType[] = [
    'water', 'feed', 'environment', 'harvest', 'pollinate',
    'prune', 'top', 'transplant', 'maintenance', 'pest', 'disease',
    'note', 'photo', 'phase_change',
  ];

  for (const type of allTypes) {
    it(`${type}: logData með tóm gögn kastar ekki`, () => {
      expect(() => logData(type, {})).not.toThrow();
    });

    it(`${type}: logData með undefined kastar ekki`, () => {
      expect(() => logData(type, undefined)).not.toThrow();
    });
  }
});

describe('formatLogData — núll-gildi myndast í flís', () => {
  it('water: 0 ml í flísinni', () => {
    expect(formatLogData('water', { amountMl: 0 })).toEqual(['0 ml']);
  });

  it('harvest: 0 stk birtist', () => {
    expect(formatLogData('harvest', { podCount: 0 })).toEqual(['0 stk']);
  });

  it('environment: 0 klst (dökkur dagur)', () => {
    expect(formatLogData('environment', { lightHours: 0 })).toEqual(['0 klst']);
  });
});

describe('formatLogData — aukastafasnið', () => {
  it('1.50 → 1.5 (trailing zero fjarlægt)', () => {
    expect(formatLogData('water', { ph: 1.50 })).toEqual(['pH 1.5']);
  });

  it('6.000 → 6', () => {
    expect(formatLogData('water', { ph: 6.000 })).toEqual(['pH 6']);
  });

  it('1.2345 → 1.23 (tveir aukastafir)', () => {
    expect(formatLogData('water', { ph: 1.2345 })).toEqual(['pH 1.23']);
  });
});

describe('LOG_FIELDS / LOG_TYPE_META — heildarsamkvæmni', () => {
  it('allar gerðir í LOG_TYPE_META hafa merki og tákn', () => {
    for (const m of LOG_TYPE_META) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.icon.length).toBeGreaterThan(0);
    }
  });

  it('LOG_FIELDS number-svið hafa alltaf step > 0', () => {
    for (const [, fields] of Object.entries(LOG_FIELDS)) {
      for (const f of fields ?? []) {
        if (f.kind === 'number' && f.step !== undefined) {
          expect(f.step).toBeGreaterThan(0);
        }
      }
    }
  });

  it('LOG_FIELDS select-svið hafa einkvæma value-gildi innan hvers sviðs', () => {
    for (const [, fields] of Object.entries(LOG_FIELDS)) {
      for (const f of fields ?? []) {
        if (f.kind === 'select' && f.options) {
          const vals = f.options.map((o) => o.value);
          expect(new Set(vals).size).toBe(vals.length);
        }
      }
    }
  });
});
