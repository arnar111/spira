import { describe, expect, it } from 'vitest';
import type { GrowPhase } from '@/lib/db';
import {
  DEFAULT_TARGET,
  HERB_DEFAULT_TARGET,
  LEAFY_DEFAULT_TARGET,
  bandStatus,
  envTargetForPhase,
  formatBand,
  statusLabel,
} from '@/lib/envTargets';

describe('envTargetForPhase', () => {
  it('spírun er heitasti og rakasti fasinn', () => {
    const t = envTargetForPhase('germinating');
    expect(t.tempC).toEqual({ min: 24, max: 28 });
    expect(t.humidityPct.max).toBe(80);
  });

  it('blómgun er svalari en vöxtur', () => {
    expect(envTargetForPhase('flowering').tempC.max).toBeLessThan(
      envTargetForPhase('vegetative').tempC.max,
    );
  });

  it('fasar án gildis falla á DEFAULT_TARGET', () => {
    for (const p of ['planning', 'dormant', 'finished', 'overwintering'] as GrowPhase[]) {
      expect(envTargetForPhase(p)).toBe(DEFAULT_TARGET);
    }
  });

  it('öll bönd eru gild (min ≤ max)', () => {
    const phases: GrowPhase[] = [
      'germinating',
      'seedling',
      'vegetative',
      'flowering',
      'fruiting',
      'ripening',
      'harvest',
    ];
    for (const p of phases) {
      const t = envTargetForPhase(p);
      expect(t.tempC.min, p).toBeLessThanOrEqual(t.tempC.max);
      expect(t.humidityPct.min, p).toBeLessThanOrEqual(t.humidityPct.max);
      expect(t.note.length, p).toBeGreaterThan(0);
    }
  });
});

describe('EC-bönd (5.5)', () => {
  it('EC hækkar með fasa: ungplöntur vægast, aldin sterkast', () => {
    expect(envTargetForPhase('germinating').ec).toEqual({ min: 0.8, max: 1.4 });
    expect(envTargetForPhase('seedling').ec).toEqual({ min: 0.8, max: 1.4 });
    expect(envTargetForPhase('vegetative').ec).toEqual({ min: 1.2, max: 2.0 });
    expect(envTargetForPhase('flowering').ec).toEqual({ min: 1.4, max: 2.4 });
    expect(envTargetForPhase('fruiting').ec).toEqual({ min: 1.6, max: 2.4 });
    expect(envTargetForPhase('ripening').ec).toEqual({ min: 1.6, max: 2.4 });
    expect(envTargetForPhase('harvest').ec).toEqual({ min: 1.6, max: 2.4 });
  });

  it('DEFAULT_TARGET (fasar án vaxtarlotu) hefur ekkert EC-band', () => {
    expect(DEFAULT_TARGET.ec).toBeUndefined();
    expect(envTargetForPhase('planning').ec).toBeUndefined();
  });

  it('öll skilgreind EC-bönd eru gild (min ≤ max)', () => {
    const phases: GrowPhase[] = [
      'germinating',
      'seedling',
      'vegetative',
      'flowering',
      'fruiting',
      'ripening',
      'harvest',
    ];
    for (const p of phases) {
      const ec = envTargetForPhase(p).ec;
      expect(ec, p).toBeDefined();
      if (ec) expect(ec.min, p).toBeLessThanOrEqual(ec.max);
    }
  });
});

describe('flokkasnið (herb/leafy, 5.5)', () => {
  it('án flokks er hegðunin nákvæmlega óbreytt (sama tilvísun)', () => {
    const phases: GrowPhase[] = ['germinating', 'vegetative', 'fruiting', 'planning'];
    for (const p of phases) {
      expect(envTargetForPhase(p, undefined), p).toBe(envTargetForPhase(p));
    }
  });

  it('aldinflokkar (pepper/tomato/strawberry) nota sjálfgefna sniðið', () => {
    expect(envTargetForPhase('vegetative', 'pepper')).toBe(envTargetForPhase('vegetative'));
    expect(envTargetForPhase('flowering', 'tomato')).toBe(envTargetForPhase('flowering'));
    expect(envTargetForPhase('fruiting', 'strawberry')).toBe(envTargetForPhase('fruiting'));
  });

  it('kryddjurtir fá mildara snið: 18–24°C, 40–60% raki, EC 1.0–1.6', () => {
    const t = envTargetForPhase('vegetative', 'herb');
    expect(t).toBe(HERB_DEFAULT_TARGET);
    expect(t.tempC).toEqual({ min: 18, max: 24 });
    expect(t.humidityPct).toEqual({ min: 40, max: 60 });
    expect(t.ec).toEqual({ min: 1.0, max: 1.6 });
  });

  it('kryddjurta-spírun er hlýrri/rakari en veg-fasinn þeirra', () => {
    const germ = envTargetForPhase('germinating', 'herb');
    const veg = envTargetForPhase('vegetative', 'herb');
    expect(germ.tempC.max).toBeGreaterThanOrEqual(veg.tempC.max);
    expect(germ.humidityPct.min).toBeGreaterThan(veg.humidityPct.min);
  });

  it('laufgrænmeti þolir svalara en kryddjurtir', () => {
    const leafy = envTargetForPhase('vegetative', 'leafy');
    expect(leafy).toBe(LEAFY_DEFAULT_TARGET);
    expect(leafy.tempC.min).toBeLessThan(HERB_DEFAULT_TARGET.tempC.min);
    expect(leafy.tempC.max).toBeLessThan(HERB_DEFAULT_TARGET.tempC.max);
    expect(leafy.ec).toEqual({ min: 1.0, max: 1.6 });
  });

  it('herb/leafy bönd eru gild og með íslenska nótu', () => {
    for (const cat of ['herb', 'leafy'] as const) {
      const phases: GrowPhase[] = ['germinating', 'seedling', 'vegetative', 'harvest'];
      for (const p of phases) {
        const t = envTargetForPhase(p, cat);
        expect(t.tempC.min, `${cat}/${p}`).toBeLessThanOrEqual(t.tempC.max);
        expect(t.humidityPct.min, `${cat}/${p}`).toBeLessThanOrEqual(t.humidityPct.max);
        if (t.ec) expect(t.ec.min, `${cat}/${p}`).toBeLessThanOrEqual(t.ec.max);
        expect(t.note.length, `${cat}/${p}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('bandStatus', () => {
  const band = { min: 18, max: 24 };
  it('flokkar undir/innan/yfir rétt, mörk meðtalin', () => {
    expect(bandStatus(15, band)).toBe('low');
    expect(bandStatus(18, band)).toBe('in');
    expect(bandStatus(21, band)).toBe('in');
    expect(bandStatus(24, band)).toBe('in');
    expect(bandStatus(27, band)).toBe('high');
  });
});

describe('snið', () => {
  it('formatBand og statusLabel gefa íslenskan texta', () => {
    expect(formatBand({ min: 20, max: 26 }, '°C')).toBe('20–26°C');
    expect(statusLabel('in')).toBe('innan marka');
    expect(statusLabel('low')).toBe('undir marki');
    expect(statusLabel('high')).toBe('yfir marki');
  });
});
