import { describe, expect, it } from 'vitest';
import type { LogType } from '@/lib/db';
import { LOG_FIELDS, LOG_TYPE_META, formatLogData, logData } from '@/lib/logSchema';

describe('formatLogData', () => {
  it('skilar tómu fylki án data', () => {
    expect(formatLogData('water', undefined)).toEqual([]);
    expect(formatLogData('water', {})).toEqual([]);
  });

  describe('water', () => {
    it('öll svið í réttri röð', () => {
      expect(
        formatLogData('water', { amountMl: 200, ph: 6.2, ec: 1.4, runoffMl: 50 }),
      ).toEqual(['200 ml', 'pH 6.2', 'EC 1.4', '50 ml frárennsli']);
    });

    it('tölur sem strengir eru þvingaðar', () => {
      expect(formatLogData('water', { amountMl: '250', ph: '6.50' })).toEqual([
        '250 ml',
        'pH 6.5',
      ]);
    });

    it('gallað gildi er sleppt, ekki hrun', () => {
      expect(formatLogData('water', { amountMl: 'abc', ph: NaN, ec: null })).toEqual([]);
      expect(formatLogData('water', { amountMl: Infinity, ph: 6 })).toEqual(['pH 6']);
    });

    it('núll er gilt gildi (0 ml frárennsli er upplýsing)', () => {
      expect(formatLogData('water', { runoffMl: 0 })).toEqual(['0 ml frárennsli']);
    });
  });

  describe('feed', () => {
    it('áburðarheiti + skammtur + EC + pH', () => {
      expect(
        formatLogData('feed', { nutrient: 'CalMag', doseMlPerL: 2, ec: 1.6, ph: 6.0 }),
      ).toEqual(['CalMag', '2 ml/L', 'EC 1.6', 'pH 6']);
    });

    it('tómur strengur sem áburðarheiti er sleppt', () => {
      expect(formatLogData('feed', { nutrient: '   ' })).toEqual([]);
    });
  });

  describe('environment', () => {
    it('hiti, raki, ljóstími', () => {
      expect(
        formatLogData('environment', { tempC: 24, humidityPct: 60, lightHours: 18 }),
      ).toEqual(['24°C', '60%', '18 klst']);
    });
  });

  describe('harvest', () => {
    it('þyngd og fjöldi', () => {
      expect(formatLogData('harvest', { weightG: 120, podCount: 8 })).toEqual([
        '120 g',
        '8 stk',
      ]);
    });
  });

  describe('pollinate', () => {
    it('þekkt aðferð fær íslenskt heiti úr LOG_FIELDS', () => {
      expect(formatLogData('pollinate', { method: 'pensill' })).toEqual(['Pensill']);
      expect(formatLogData('pollinate', { method: 'rafmagnstannbursti' })).toEqual([
        'Rafmagnstannbursti',
      ]);
    });

    it('óþekkt aðferð birtist hrá', () => {
      expect(formatLogData('pollinate', { method: 'blástur' })).toEqual(['blástur']);
    });
  });

  describe('prune / top / transplant', () => {
    it('detail-textinn er flísin', () => {
      expect(formatLogData('prune', { detail: 'neðri blöð fjarlægð' })).toEqual([
        'neðri blöð fjarlægð',
      ]);
      expect(formatLogData('top', { detail: 'toppað við 5. hnút' })).toEqual([
        'toppað við 5. hnút',
      ]);
      expect(formatLogData('transplant', { detail: 'í 7L pott' })).toEqual(['í 7L pott']);
    });
  });

  describe('maintenance', () => {
    it('þekkt verk fær íslenskt heiti', () => {
      expect(formatLogData('maintenance', { task: 'clean_tank' })).toEqual([
        'Hreinsa vatnstank',
      ]);
      expect(formatLogData('maintenance', { task: 'replace_lingot' })).toEqual([
        'Skipta um Lingot',
      ]);
    });

    it('óþekkt verk birtist hrátt', () => {
      expect(formatLogData('maintenance', { task: 'vacuum_floor' })).toEqual([
        'vacuum_floor',
      ]);
    });
  });

  it('gerðir án skipulagðra sviða skila alltaf tómu', () => {
    const freeform: LogType[] = ['note', 'photo', 'phase_change'];
    for (const type of freeform) {
      expect(formatLogData(type, { anything: 123, note: 'x' })).toEqual([]);
    }
  });

  // 3.4: meindýr/sjúkdómar fá skipulögð svið (tegund + umfang + nánar).
  describe('meindýr/sjúkdómar (3.4)', () => {
    it('meindýr þýðir tegund og umfang í íslensk merki', () => {
      expect(
        formatLogData('pest', { kind: 'spunamitill', severity: 'midlungs', detail: 'á bakhlið' }),
      ).toEqual(['Spunamítill', 'Miðlungs', 'á bakhlið']);
    });

    it('sjúkdómur sömuleiðis, óþekkt gildi falla á hrátt gildi', () => {
      expect(formatLogData('disease', { kind: 'gramygla', severity: 'mikil' })).toEqual([
        'Grámygla',
        'Mikið',
      ]);
      expect(formatLogData('pest', { kind: 'óþekkt' })).toEqual(['óþekkt']);
    });

    it('tóm gögn → engin merki', () => {
      expect(formatLogData('pest', {})).toEqual([]);
      expect(formatLogData('disease', undefined)).toEqual([]);
    });
  });

  it('snyrtir aukastafi (200.00 → 200, 6.999 → 7)', () => {
    expect(formatLogData('water', { amountMl: 200.0 })).toEqual(['200 ml']);
    expect(formatLogData('water', { ph: 6.999 })).toEqual(['pH 7']);
    expect(formatLogData('water', { ec: 1.25 })).toEqual(['EC 1.25']);
  });
});

describe('logData (týpaða lagið, 4.3)', () => {
  it('þvingar tölustrengi og snyrtir texta', () => {
    expect(logData('water', { amountMl: '250', ph: 6.2 })).toEqual({
      amountMl: 250,
      ph: 6.2,
      ec: undefined,
      runoffMl: undefined,
    });
    expect(logData('feed', { nutrient: '  CalMag  ' }).nutrient).toBe('CalMag');
  });

  it('gölluð gildi verða undefined, ekki hrun', () => {
    const d = logData('water', { amountMl: 'abc', ph: NaN, ec: null, runoffMl: Infinity });
    expect(d).toEqual({ amountMl: undefined, ph: undefined, ec: undefined, runoffMl: undefined });
  });

  it('undefined data og frjálsar gerðir skila tómu', () => {
    expect(logData('water', undefined).ph).toBeUndefined();
    expect(logData('note', { anything: 1 })).toEqual({});
    expect(logData('phase_change', undefined)).toEqual({});
  });

  it('pest/disease: kind + severity + detail', () => {
    expect(logData('pest', { kind: 'lus', severity: 'mikil', detail: ' á blöðum ' })).toEqual({
      kind: 'lus',
      severity: 'mikil',
      detail: 'á blöðum',
    });
  });
});

describe('LOG_FIELDS / LOG_TYPE_META samkvæmni', () => {
  it('öll select-svið hafa valkosti', () => {
    for (const fields of Object.values(LOG_FIELDS)) {
      for (const f of fields ?? []) {
        if (f.kind === 'select') {
          expect(f.options?.length ?? 0).toBeGreaterThan(0);
        }
      }
    }
  });

  it('engin tvítekin gerð í LOG_TYPE_META', () => {
    const ids = LOG_TYPE_META.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
