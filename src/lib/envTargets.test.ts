import { describe, expect, it } from 'vitest';
import type { GrowPhase } from '@/lib/db';
import {
  DEFAULT_TARGET,
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
