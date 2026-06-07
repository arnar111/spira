import { describe, it, expect } from 'vitest';
import { plantPace, paceLabel } from './growthTrack';
import type { Plant, GrowPhase } from '@/lib/db';

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

function plant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    growId: 'g1',
    variety: 'Habanero',
    category: 'pepper',
    startedFrom: 'seed',
    currentPhase: 'vegetative' as GrowPhase,
    archived: false,
    createdAt: NOW - 30 * DAY,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('plantPace', () => {
  it('skilar null fyrir geymda plöntu', () => {
    expect(plantPace(plant({ archived: true }), [30, 40], NOW)).toBeNull();
  });

  it('skilar null án afbrigðaglugga', () => {
    expect(plantPace(plant(), undefined, NOW)).toBeNull();
  });

  it('skilar null í fasa þar sem samanburður á ekki við', () => {
    expect(plantPace(plant({ currentPhase: 'finished' }), [30, 40], NOW)).toBeNull();
    expect(plantPace(plant({ currentPhase: 'planning' }), [30, 40], NOW)).toBeNull();
  });

  it('telur aldur frá spírun ef hún er til', () => {
    const p = plant({ germinatedDate: NOW - 34 * DAY, sowDate: NOW - 50 * DAY });
    expect(plantPace(p, [30, 40], NOW)?.ageDays).toBe(34);
  });

  it('fellur til baka á sáningu, svo stofnun, fyrir aldur', () => {
    const p = plant({ sowDate: NOW - 20 * DAY, createdAt: NOW - 99 * DAY });
    expect(plantPace(p, [30, 40], NOW)?.ageDays).toBe(20);
  });

  it('„á áætlun" þegar aldur er innan gluggans', () => {
    const p = plant({ germinatedDate: NOW - 35 * DAY, currentPhase: 'flowering' });
    const pace = plantPace(p, [30, 40], NOW);
    expect(pace?.status).toBe('onTrack');
    expect(pace?.offsetDays).toBeNull();
  });

  it('„á undan" þegar uppskerutilbúin fyrir lágmark gluggans', () => {
    const p = plant({ germinatedDate: NOW - 27 * DAY, currentPhase: 'harvest' });
    const pace = plantPace(p, [30, 40], NOW);
    expect(pace?.status).toBe('ahead');
    expect(pace?.offsetDays).toBe(3);
  });

  it('„á eftir" þegar komin fram yfir hámark án aldina', () => {
    const p = plant({ germinatedDate: NOW - 45 * DAY, currentPhase: 'vegetative' });
    const pace = plantPace(p, [30, 40], NOW);
    expect(pace?.status).toBe('behind');
    expect(pace?.offsetDays).toBe(5);
  });

  it('fullyrðir ekki „á eftir" þegar plantan er þegar að mynda aldin', () => {
    const p = plant({ germinatedDate: NOW - 45 * DAY, currentPhase: 'fruiting' });
    expect(plantPace(p, [30, 40], NOW)?.status).toBe('onTrack');
  });
});

describe('paceLabel', () => {
  it('íslenskur texti fyrir á undan/á eftir, með eintölu', () => {
    expect(paceLabel({ ageDays: 27, window: [30, 40], status: 'ahead', offsetDays: 3 })).toBe(
      '3 dögum á undan áætlun',
    );
    expect(paceLabel({ ageDays: 45, window: [30, 40], status: 'behind', offsetDays: 1 })).toBe(
      '1 degi á eftir áætlun',
    );
  });

  it('null fyrir „á áætlun"', () => {
    expect(paceLabel({ ageDays: 35, window: [30, 40], status: 'onTrack', offsetDays: null })).toBeNull();
  });
});
