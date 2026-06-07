import { describe, expect, it } from 'vitest';
import type { Plant } from '@/lib/db';
import { buildCountPrompt, parseCount } from '@/lib/ros/yieldCount';

const plant: Plant = {
  id: 'p1',
  growId: 'g1',
  variety: 'Sungold',
  category: 'tomato',
  startedFrom: 'seed',
  currentPhase: 'fruiting',
  archived: false,
  createdAt: 0,
  updatedAt: 0,
};

describe('buildCountPrompt', () => {
  it('nefnir plöntu, afbrigði og fast snið', () => {
    const p = buildCountPrompt(plant, 'aldin');
    expect(p).toContain('Sungold');
    expect(p).toContain('FJÖLDI:');
    expect(p).toContain('aldin');
  });

  it('skiptir um talningareiningu eftir kind', () => {
    expect(buildCountPrompt(plant, 'blóm')).toContain('blóm');
    expect(buildCountPrompt(plant, 'klasar')).toContain('klasa');
  });
});

describe('parseCount', () => {
  it('les FJÖLDI-línuna', () => {
    expect(parseCount('FJÖLDI: 14\nÉg sá 14 þroskuð aldin.')).toBe(14);
    expect(parseCount('**FJÖLDI: 0** Myndin er óskýr.')).toBe(0);
  });

  it('þolir bil og hástafi', () => {
    expect(parseCount('fjöldi : 7')).toBe(7);
  });

  it('fellur á fyrstu tölu ef FJÖLDI vantar', () => {
    expect(parseCount('Ég tel 9 ber á myndinni.')).toBe(9);
  });

  it('skilar null ef engin tala finnst', () => {
    expect(parseCount('Engin planta sjáanleg.')).toBeNull();
  });
});
