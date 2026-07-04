import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GrowPhase, Plant } from '@/lib/db';
import {
  PHASES,
  PHASE_TO_DAY,
  TOTAL_CYCLE_DAYS,
  cycleProgress,
  daysSince,
  getPhaseForDay,
  growStageDay,
  phaseToDay,
  timelineForCategory,
} from '@/lib/phases';

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 5, 7, 12); // 2026-06-07 12:00Z

function mkPlant(over: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    growId: 'g1',
    variety: 'Prófpipar',
    category: 'pepper',
    startedFrom: 'seed',
    currentPhase: 'vegetative',
    archived: false,
    createdAt: NOW - 10 * DAY_MS,
    updatedAt: NOW - 10 * DAY_MS,
    ...over,
  };
}

describe('getPhaseForDay', () => {
  it('dagur 0 er spírun', () => {
    expect(getPhaseForDay(0).name).toBe('spírun');
  });

  it('fasaskil eru "frá og með" startDay', () => {
    expect(getPhaseForDay(13).name).toBe('spírun');
    expect(getPhaseForDay(14).name).toBe('seedling');
    expect(getPhaseForDay(130).name).toBe('harvest');
  });

  it('neikvæður dagur fellur á fyrsta fasa', () => {
    expect(getPhaseForDay(-5).name).toBe('spírun');
  });

  it('dagur langt umfram lotu helst í síðasta fasa', () => {
    expect(getPhaseForDay(9999).name).toBe('harvest');
  });

  it('virkar með annarri tímalínu', () => {
    const potato = timelineForCategory('potato');
    expect(getPhaseForDay(0, potato.phases).name).toBe('planta');
    expect(getPhaseForDay(100, potato.phases).name).toBe('harvest');
  });
});

describe('cycleProgress', () => {
  it('klemmir á [0, 1]', () => {
    expect(cycleProgress(-10)).toBe(0);
    expect(cycleProgress(0)).toBe(0);
    expect(cycleProgress(TOTAL_CYCLE_DAYS)).toBe(1);
    expect(cycleProgress(TOTAL_CYCLE_DAYS + 50)).toBe(1);
  });

  it('miðja lotu er 0.5', () => {
    expect(cycleProgress(70)).toBeCloseTo(0.5);
  });

  it('virðir annað totalDays', () => {
    expect(cycleProgress(50, 100)).toBeCloseTo(0.5);
  });
});

describe('daysSince', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('telur heila daga frá tímastimpli', () => {
    expect(daysSince(NOW - 5 * DAY_MS)).toBe(5);
    expect(daysSince(NOW)).toBe(0);
  });

  it('rúnnar niður (hálfur dagur telst 0)', () => {
    expect(daysSince(NOW - DAY_MS / 2)).toBe(0);
  });

  it('framtíðar-tímastimpill gefur 0, ekki neikvætt', () => {
    expect(daysSince(NOW + 10 * DAY_MS)).toBe(0);
  });
});

describe('timelineForCategory', () => {
  it('sjálfgefið er pipar-tímalínan', () => {
    expect(timelineForCategory().phases).toBe(PHASES);
    expect(timelineForCategory().totalDays).toBe(140);
  });

  it('óþekktur flokkur fellur á pipar', () => {
    expect(timelineForCategory('houseplant').totalDays).toBe(140);
    expect(timelineForCategory('other').totalDays).toBe(140);
  });

  it('hver ræktun hefur sína lotulengd', () => {
    expect(timelineForCategory('tomato').totalDays).toBe(85);
    expect(timelineForCategory('strawberry').totalDays).toBe(90);
    expect(timelineForCategory('potato').totalDays).toBe(115);
    expect(timelineForCategory('herb').totalDays).toBe(150);
    expect(timelineForCategory('leafy').totalDays).toBe(90);
  });
});

describe('kryddjurta- og lauftímalínur', () => {
  const herb = timelineForCategory('herb');
  const leafy = timelineForCategory('leafy');

  it('kryddjurtir: uppskera hefst um dag 40 og heldur út lotuna', () => {
    expect(getPhaseForDay(0, herb.phases).name).toBe('spírun');
    expect(getPhaseForDay(12, herb.phases).name).toBe('seedling');
    expect(getPhaseForDay(39, herb.phases).name).toBe('veg');
    expect(getPhaseForDay(40, herb.phases).name).toBe('harvest');
    expect(getPhaseForDay(149, herb.phases).name).toBe('harvest');
  });

  it('lauf: hraðari lota með klippingu frá degi 30', () => {
    expect(getPhaseForDay(0, leafy.phases).name).toBe('spírun');
    expect(getPhaseForDay(8, leafy.phases).name).toBe('seedling');
    expect(getPhaseForDay(29, leafy.phases).name).toBe('veg');
    expect(getPhaseForDay(30, leafy.phases).name).toBe('harvest');
  });

  it('phaseToDay dekkar hvern einasta vaxtarfasa á báðum línum', () => {
    // Pipar-varpanin ber alla GrowPhase-lykla — hún er viðmiðið.
    const allPhases = Object.keys(PHASE_TO_DAY) as GrowPhase[];
    for (const tl of [herb, leafy]) {
      for (const phase of allPhases) {
        expect(tl.phaseToDay[phase], `${phase} vantar`).toBeTypeOf('number');
        expect(tl.phaseToDay[phase], phase).toBeGreaterThanOrEqual(0);
        expect(tl.phaseToDay[phase], phase).toBeLessThanOrEqual(tl.totalDays);
      }
    }
  });

  it('dormant varpar á 0 og finished á lotulok', () => {
    expect(herb.phaseToDay.dormant).toBe(0);
    expect(herb.phaseToDay.finished).toBe(150);
    expect(leafy.phaseToDay.dormant).toBe(0);
    expect(leafy.phaseToDay.finished).toBe(90);
  });

  it('blómgun/aldin (njóli) varpast inn í uppskerutímabilið', () => {
    for (const tl of [herb, leafy]) {
      expect(tl.phaseToDay.flowering).toBeGreaterThanOrEqual(tl.phaseToDay.harvest);
      expect(tl.phaseToDay.fruiting).toBeGreaterThanOrEqual(tl.phaseToDay.harvest);
      expect(tl.phaseToDay.ripening).toBeGreaterThanOrEqual(tl.phaseToDay.harvest);
    }
  });

  it('phaseToDay-fallið virðir kryddjurtavörpunina', () => {
    expect(phaseToDay('harvest', herb.phaseToDay)).toBe(40);
    expect(phaseToDay('harvest', leafy.phaseToDay)).toBe(30);
  });
});

describe('phaseToDay', () => {
  it('varpar fasa á dag á pipar-tímalínunni', () => {
    expect(phaseToDay('planning')).toBe(0);
    expect(phaseToDay('flowering')).toBe(75);
    expect(phaseToDay('finished')).toBe(140);
  });

  it('virðir aðra vörpun', () => {
    const potato = timelineForCategory('potato');
    expect(phaseToDay('flowering', potato.phaseToDay)).toBe(60);
  });
});

describe('growStageDay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('notar dagatalsaldur þegar engin planta er lengra komin', () => {
    const start = NOW - 50 * DAY_MS;
    const plants = [mkPlant({ currentPhase: 'germinating' })];
    expect(growStageDay(start, plants)).toBe(50);
  });

  it('lengst komna virka plantan dregur framvinduna áfram', () => {
    const start = NOW - 5 * DAY_MS; // splunkuný ræktun
    const plants = [
      mkPlant({ id: 'a', currentPhase: 'seedling' }),
      mkPlant({ id: 'b', currentPhase: 'flowering' }), // dagur 75 á pipar-línu
    ];
    expect(growStageDay(start, plants)).toBe(75);
  });

  it('geymdar (archived) plöntur telja ekki', () => {
    const start = NOW - 5 * DAY_MS;
    const plants = [mkPlant({ currentPhase: 'flowering', archived: true })];
    expect(growStageDay(start, plants)).toBe(5);
  });

  it('tóm plöntulista gefur dagatalsaldur', () => {
    expect(growStageDay(NOW - 12 * DAY_MS, [])).toBe(12);
  });
});
