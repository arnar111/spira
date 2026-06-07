import { describe, expect, it } from 'vitest';
import type { EnvironmentSample, HarvestEntry, LogEntry, Plant } from '@/lib/db';
import type {
  PepperVariety,
  PotatoVariety,
  StrawberryVariety,
  TomatoVariety,
  Variety,
} from '@/lib/varieties';
import { estimateGrowYield, estimatePlantYield } from '@/lib/ros/yield';

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 5, 7, 12);

function mkPlant(over: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    growId: 'g1',
    variety: 'Próf',
    category: 'tomato',
    startedFrom: 'seed',
    currentPhase: 'fruiting',
    archived: false,
    createdAt: NOW - 60 * DAY_MS,
    germinatedDate: NOW - 60 * DAY_MS,
    updatedAt: NOW,
    ...over,
  };
}

function mkHarvest(over: Partial<HarvestEntry> = {}): HarvestEntry {
  return {
    id: 'h' + Math.random(),
    growId: 'g1',
    plantId: 'p1',
    timestamp: NOW - 5 * DAY_MS,
    weightG: 100,
    ...over,
  };
}

function mkPollinate(fruitCount: number, ts = NOW - 2 * DAY_MS): LogEntry {
  return {
    id: 'l' + Math.random(),
    growId: 'g1',
    plantId: 'p1',
    timestamp: ts,
    type: 'pollinate',
    data: { method: 'pensill', fruitCount },
  };
}

const TOMATO: TomatoVariety = {
  id: 'tomato-test',
  commonName: 'Próftómatur',
  scientificName: 'Solanum lycopersicum',
  category: 'tomato',
  isBuiltIn: true,
  glyph: 'round_red',
  fruitColor: 'red',
  growthHabit: 'indeterminate',
  fruitWeightG: 100,
  fruitShape: 'Kúla',
  flavor: '',
  origin: '',
  daysToGerminate: [6, 12],
  daysToHarvest: [60, 85],
  matureHeightCm: 100,
  suitableLocations: ['window'],
  notes: '',
  care: {} as TomatoVariety['care'],
};

const PEPPER: PepperVariety = {
  id: 'pepper-test',
  commonName: 'Prófpipar',
  scientificName: 'Capsicum annuum',
  category: 'pepper',
  isBuiltIn: true,
  chili: 'jalapeno',
  motherSpecies: 'Jalapeño',
  color: 'green',
  shu: 5000,
  flavor: '',
  origin: '',
  daysToGerminate: [7, 14],
  daysToHarvest: [70, 90],
  matureHeightCm: 70,
  suitableLocations: ['window'],
  notes: '',
};

const STRAWBERRY: StrawberryVariety = {
  id: 'strawberry-test',
  commonName: 'Prófber',
  scientificName: 'Fragaria',
  category: 'strawberry',
  isBuiltIn: true,
  glyph: 'classic',
  fruitColor: 'red',
  berryType: 'day-neutral',
  fruitWeightG: 20,
  flavor: '',
  origin: '',
  daysToGerminate: [14, 28],
  daysToHarvest: [56, 84],
  matureHeightCm: 30,
  suitableLocations: ['window'],
  notes: '',
  care: {} as StrawberryVariety['care'],
};

const POTATO: PotatoVariety = {
  id: 'potato-test',
  commonName: 'Prófkartafla',
  scientificName: 'Solanum tuberosum',
  category: 'potato',
  isBuiltIn: true,
  glyph: 'yellow',
  skinColor: 'yellow',
  maturity: 'maincrop',
  use: 'Almenn',
  flavor: '',
  origin: '',
  daysToGerminate: [14, 21],
  daysToHarvest: [90, 120],
  matureHeightCm: 55,
  suitableLocations: ['garden'],
  notes: '',
  care: {} as PotatoVariety['care'],
};

function base(over: Partial<Parameters<typeof estimatePlantYield>[0]> = {}) {
  return {
    plant: mkPlant(),
    variety: TOMATO as Variety,
    harvests: [],
    logs: [],
    now: NOW,
    ...over,
  };
}

describe('estimatePlantYield — null tilvik', () => {
  it('geymd planta → null', () => {
    expect(estimatePlantYield(base({ plant: mkPlant({ archived: true }) }))).toBeNull();
  });

  it.each(['finished', 'dormant', 'overwintering', 'planning'] as const)(
    'fasi %s → null',
    (phase) => {
      expect(estimatePlantYield(base({ plant: mkPlant({ currentPhase: phase }) }))).toBeNull();
    },
  );

  it('kryddjurt → null', () => {
    expect(
      estimatePlantYield(base({ plant: mkPlant({ category: 'herb' }), variety: undefined })),
    ).toBeNull();
  });

  it('lauf/ávöxtur/pottaplanta/annað → null', () => {
    for (const category of ['leafy', 'fruit', 'houseplant', 'other'] as const) {
      expect(
        estimatePlantYield(base({ plant: mkPlant({ category }), variety: undefined })),
      ).toBeNull();
    }
  });

  it('of snemma (vöxtur) og engin tínsla né talning → null', () => {
    expect(
      estimatePlantYield(base({ plant: mkPlant({ currentPhase: 'vegetative' }) })),
    ).toBeNull();
  });
});

describe('estimatePlantYield — tómatur (happy path)', () => {
  it('skilar bili með afbrigðisþyngd og klasaviðmiði', () => {
    const est = estimatePlantYield(base())!;
    expect(est).not.toBeNull();
    expect(est.highG).toBeGreaterThan(est.lowG);
    expect(est.remainingHighG).toBeGreaterThan(0);
    expect(est.basis.some((b) => b.includes('100 g/aldin'))).toBe(true);
    expect(est.basis.some((b) => b.includes('klasar'))).toBe(true);
  });

  it('hitaleiðrétting hækkar klasafjölda', () => {
    const cold: EnvironmentSample[] = [{ id: 'e1', growId: 'g1', timestamp: NOW, tempC: 18 }];
    const warm: EnvironmentSample[] = [{ id: 'e2', growId: 'g1', timestamp: NOW, tempC: 23 }];
    const c = estimatePlantYield(base({ envSamples: cold }))!;
    const w = estimatePlantYield(base({ envSamples: warm }))!;
    expect(w.remainingHighG).toBeGreaterThan(c.remainingHighG);
  });
});

describe('estimatePlantYield — paprika', () => {
  it('jalapeño notar stærðarflokk fyrir fjölda og þyngd', () => {
    const est = estimatePlantYield(
      base({ plant: mkPlant({ category: 'pepper' }), variety: PEPPER as Variety }),
    )!;
    expect(est.remainingHighG).toBeGreaterThan(0);
    expect(est.basis.some((b) => b.includes('jalapeno'))).toBe(true);
  });
});

describe('estimatePlantYield — jarðarber', () => {
  it('notar tímabilsviðmið skalað eftir fasa', () => {
    const est = estimatePlantYield(
      base({ plant: mkPlant({ category: 'strawberry' }), variety: STRAWBERRY as Variety }),
    )!;
    expect(est.remainingHighG).toBeGreaterThan(0);
    expect(est.basis.some((b) => b.includes('tímabilsuppskera'))).toBe(true);
  });

  it('blómgun gefur lægra mat en aldinfasi', () => {
    const flower = estimatePlantYield(
      base({
        plant: mkPlant({ category: 'strawberry', currentPhase: 'flowering' }),
        variety: STRAWBERRY as Variety,
      }),
    )!;
    const fruit = estimatePlantYield(
      base({
        plant: mkPlant({ category: 'strawberry', currentPhase: 'fruiting' }),
        variety: STRAWBERRY as Variety,
      }),
    )!;
    expect(flower.remainingHighG).toBeLessThan(fruit.remainingHighG);
  });
});

describe('estimatePlantYield — kartöflur', () => {
  it('skalar línulega að fullum þroska', () => {
    const young = estimatePlantYield(
      base({
        plant: mkPlant({ category: 'potato', germinatedDate: NOW - 30 * DAY_MS }),
        variety: POTATO as Variety,
      }),
    )!;
    const mature = estimatePlantYield(
      base({
        plant: mkPlant({ category: 'potato', germinatedDate: NOW - 110 * DAY_MS }),
        variety: POTATO as Variety,
      }),
    )!;
    expect(mature.remainingHighG).toBeGreaterThan(young.remainingHighG);
    expect(young.basis.some((b) => b.includes('hnýði'))).toBe(true);
    expect(young.basis.some((b) => b.includes('þroska'))).toBe(true);
  });

  it('snemmyrki gefur minna en aðalyrki', () => {
    const early = estimatePlantYield(
      base({
        plant: mkPlant({ category: 'potato', germinatedDate: NOW - 110 * DAY_MS }),
        variety: { ...POTATO, maturity: 'early' } as Variety,
      }),
    )!;
    const main = estimatePlantYield(
      base({
        plant: mkPlant({ category: 'potato', germinatedDate: NOW - 110 * DAY_MS }),
        variety: POTATO as Variety,
      }),
    )!;
    expect(early.remainingHighG).toBeLessThan(main.remainingHighG);
  });
});

describe('estimatePlantYield — lærður prior > viðmið', () => {
  it('g/pod úr tínslum kemur í stað afbrigðisþyngdar', () => {
    const harvests = [
      mkHarvest({ weightG: 124, podCount: 10 }),
      mkHarvest({ weightG: 124, podCount: 10 }),
      mkHarvest({ weightG: 124, podCount: 10 }),
    ];
    const est = estimatePlantYield(base({ harvests }))!;
    expect(est.basis.some((b) => b.includes('byggt á 3 tínslum'))).toBe(true);
    expect(est.confidence).toBe('há'); // ≥ 3 tínslur með pod-tölu
    expect(est.harvestedG).toBe(372);
  });

  it('1 tínsla með pod gefur lægra traust en 3', () => {
    const one = estimatePlantYield(base({ harvests: [mkHarvest({ weightG: 50, podCount: 5 })] }))!;
    expect(one.confidence).not.toBe('há');
  });
});

describe('estimatePlantYield — manualCount forgangur', () => {
  it('manualCount-rök trompa viðmiðafjölda', () => {
    const est = estimatePlantYield(base({ manualCount: 14 }))!;
    expect(est.basis.some((b) => b.includes('talning af mynd: 14 aldin'))).toBe(true);
    // 14 aldin × 100 g = 1400 g
    expect(est.remainingLowG).toBe(1400);
    expect(est.remainingHighG).toBe(1400);
    expect(est.confidence).toBe('miðlungs'); // þröngt bil
  });

  it('pollinate-skráning innan 30 daga virkar sem manualCount', () => {
    const est = estimatePlantYield(base({ logs: [mkPollinate(8)] }))!;
    expect(est.basis.some((b) => b.includes('talning af mynd: 8 aldin'))).toBe(true);
  });

  it('of gömul pollinate-skráning er hunsuð', () => {
    const est = estimatePlantYield(base({ logs: [mkPollinate(8, NOW - 40 * DAY_MS)] }))!;
    expect(est.basis.some((b) => b.includes('talning af mynd'))).toBe(false);
  });

  it('bein manualCount-rök trompa skráningu', () => {
    const est = estimatePlantYield(base({ manualCount: 20, logs: [mkPollinate(8)] }))!;
    expect(est.basis.some((b) => b.includes('20 aldin'))).toBe(true);
  });
});

describe('estimatePlantYield — fasi víkkar/þrengir', () => {
  it('þroskafasi gefur þrengra (hærra traust) en blómgun', () => {
    const flower = estimatePlantYield(base({ plant: mkPlant({ currentPhase: 'flowering' }) }))!;
    const ripen = estimatePlantYield(base({ plant: mkPlant({ currentPhase: 'ripening' }) }))!;
    expect(flower.confidence).toBe('lág');
    expect(ripen.confidence).toBe('miðlungs');
  });
});

describe('estimatePlantYield — tínt dregst frá / klemma', () => {
  it('heild = eftirstöðvar + þegar tínt', () => {
    const est = estimatePlantYield(base({ harvests: [mkHarvest({ weightG: 200 })] }))!;
    expect(est.harvestedG).toBe(200);
    expect(est.lowG).toBe(est.remainingLowG + 200);
    expect(est.highG).toBe(est.remainingHighG + 200);
    expect(est.basis.some((b) => b.includes('þegar tínt: 200 g'))).toBe(true);
  });

  it('eftirstöðvar klemmast aldrei undir 0', () => {
    const est = estimatePlantYield(base())!;
    expect(est.remainingLowG).toBeGreaterThanOrEqual(0);
    expect(est.remainingHighG).toBeGreaterThanOrEqual(0);
  });

  it('snemma í fasa með tínslu en án talningar → aðeins tínt', () => {
    const est = estimatePlantYield(
      base({
        plant: mkPlant({ currentPhase: 'vegetative' }),
        harvests: [mkHarvest({ weightG: 50 })],
      }),
    )!;
    expect(est).not.toBeNull();
    expect(est.harvestedG).toBe(50);
    expect(est.remainingLowG).toBe(0);
  });
});

describe('estimatePlantYield — determinismi', () => {
  it('sama inntak gefur sömu niðurstöðu', () => {
    const a = estimatePlantYield(base());
    const b = estimatePlantYield(base());
    expect(a).toEqual(b);
  });
});

describe('estimateGrowYield — samtala', () => {
  it('leggur saman plöntur og sleppir null-tilvikum', () => {
    const plants = [
      mkPlant({ id: 'p1' }),
      mkPlant({ id: 'p2', category: 'herb' }), // null
      mkPlant({ id: 'p3' }),
    ];
    const getVariety = (p: Plant): Variety | undefined =>
      p.category === 'tomato' ? (TOMATO as Variety) : undefined;
    const out = estimateGrowYield(
      plants,
      getVariety,
      () => [],
      () => [],
      undefined,
      NOW,
    );
    expect(out.plants).toHaveLength(2);
    const single = estimatePlantYield(base())!;
    expect(out.remainingHighG).toBe(single.remainingHighG * 2);
    expect(out.lowG).toBe(single.lowG * 2);
  });

  it('tóm ræktun gefur núll', () => {
    const out = estimateGrowYield([], () => undefined, () => [], () => [], undefined, NOW);
    expect(out).toEqual({ lowG: 0, highG: 0, remainingLowG: 0, remainingHighG: 0, plants: [] });
  });
});
