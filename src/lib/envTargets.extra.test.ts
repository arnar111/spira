/**
 * envTargets.ts — boundary value analysis for bandStatus, plus
 * statusLabel exhaustiveness and formatBand formatting edge cases.
 */
import { describe, expect, it } from 'vitest';
import {
  bandStatus,
  envTargetForPhase,
  formatBand,
  statusLabel,
  DEFAULT_TARGET,
} from '@/lib/envTargets';

describe('bandStatus — mörk (closed interval [min, max])', () => {
  const band = { min: 20, max: 26 };

  it('nákvæmlega á min → in', () => expect(bandStatus(20, band)).toBe('in'));
  it('nákvæmlega á max → in', () => expect(bandStatus(26, band)).toBe('in'));
  it('rétt undir min (19.9) → low', () => expect(bandStatus(19.9, band)).toBe('low'));
  it('rétt yfir max (26.1) → high', () => expect(bandStatus(26.1, band)).toBe('high'));
  it('miðja bils → in', () => expect(bandStatus(23, band)).toBe('in'));
  it('neikvætt gildi er low þegar band er jákvætt', () =>
    expect(bandStatus(-5, band)).toBe('low'));

  it('bandStatus með 0-width bandi ([10, 10])', () => {
    const zero = { min: 10, max: 10 };
    expect(bandStatus(10, zero)).toBe('in');
    expect(bandStatus(9.9, zero)).toBe('low');
    expect(bandStatus(10.1, zero)).toBe('high');
  });
});

describe('statusLabel — íslenskur texti', () => {
  it('in → "innan marka"', () => expect(statusLabel('in')).toBe('innan marka'));
  it('low → "undir marki"', () => expect(statusLabel('low')).toBe('undir marki'));
  it('high → "yfir marki"', () => expect(statusLabel('high')).toBe('yfir marki'));
});

describe('formatBand — snið', () => {
  it('formatBand notar þann strik-staf', () => {
    const result = formatBand({ min: 18, max: 24 }, '°C');
    // Should contain the en-dash (–), not a hyphen
    expect(result).toBe('18–24°C');
  });

  it('eining er bara % án bils', () => {
    expect(formatBand({ min: 50, max: 70 }, '%')).toBe('50–70%');
  });

  it('tóm eining gefur tölurnar án einingar', () => {
    expect(formatBand({ min: 1, max: 9 }, '')).toBe('1–9');
  });
});

describe('envTargetForPhase — fasa-traust', () => {
  it('öll 7 skilgreind bönd hafa min < max eða min = max (gild bil)', () => {
    const defined = [
      'germinating',
      'seedling',
      'vegetative',
      'flowering',
      'fruiting',
      'ripening',
      'harvest',
    ] as const;
    for (const p of defined) {
      const t = envTargetForPhase(p);
      expect(t.tempC.min).toBeLessThanOrEqual(t.tempC.max);
      expect(t.humidityPct.min).toBeLessThanOrEqual(t.humidityPct.max);
    }
  });

  it('DEFAULT_TARGET er vari-gildi fyrir óskilgreinda fasa', () => {
    // planning og overwintering eru ekki í TARGETS
    expect(envTargetForPhase('planning')).toBe(DEFAULT_TARGET);
    expect(envTargetForPhase('overwintering')).toBe(DEFAULT_TARGET);
    expect(envTargetForPhase('dormant')).toBe(DEFAULT_TARGET);
    expect(envTargetForPhase('finished')).toBe(DEFAULT_TARGET);
  });

  it('spírun hefur hæsta tempC.min af öllum skilgreindum fösum', () => {
    const germinating = envTargetForPhase('germinating');
    const others = [
      'seedling',
      'vegetative',
      'flowering',
      'fruiting',
      'ripening',
      'harvest',
    ] as const;
    for (const p of others) {
      expect(germinating.tempC.min).toBeGreaterThanOrEqual(envTargetForPhase(p).tempC.min);
    }
  });
});
