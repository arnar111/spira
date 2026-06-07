import { describe, expect, it } from 'vitest';
import type { Grow, LogEntry, Plant } from '@/lib/db';
import { growIsOutdoor as seasonGrowIsOutdoor } from '@/lib/season';
import { buildContextDigest, computeInsights } from '@/lib/ros/engine';
import type { RosInsight } from '@/lib/ros/types';

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 5, 7, 12); // 2026-06-07
const JUNE = 6;

function mkGrow(over: Partial<Grow> = {}): Grow {
  return {
    id: 'g1',
    name: 'Prófræktun',
    category: 'pepper',
    location: 'Tjald',
    locationKey: 'tent',
    startDate: NOW - 40 * DAY_MS,
    archived: false,
    createdAt: NOW - 40 * DAY_MS,
    updatedAt: NOW - 40 * DAY_MS,
    ...over,
  };
}

function mkPlant(over: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    growId: 'g1',
    // Nafn utan vörulistans svo afbrigðis-tengdar innsýnir (uppskeru-ETA o.fl.)
    // trufli ekki sviðsmyndirnar nema prófið biðji um það.
    variety: 'Prófpipar',
    category: 'pepper',
    startedFrom: 'seed',
    currentPhase: 'vegetative',
    archived: false,
    createdAt: NOW - 40 * DAY_MS,
    updatedAt: NOW - 40 * DAY_MS,
    ...over,
  };
}

function mkLog(over: Partial<LogEntry> & Pick<LogEntry, 'type'>): LogEntry {
  return {
    id: `log-${over.type}-${over.timestamp ?? NOW}`,
    growId: 'g1',
    timestamp: NOW - DAY_MS,
    ...over,
  };
}

function run(
  over: {
    grow?: Partial<Grow>;
    plants?: Plant[];
    logs?: LogEntry[];
    month?: number;
  } = {},
): RosInsight[] {
  return computeInsights({
    grow: mkGrow(over.grow),
    plants: over.plants ?? [mkPlant()],
    logs: over.logs ?? [],
    harvests: [],
    now: NOW,
    month: over.month ?? JUNE,
  });
}

function byId(insights: RosInsight[], id: string): RosInsight | undefined {
  return insights.find((i) => i.id === id);
}

describe('vökvun (innandyra)', () => {
  it('engin vökvun skráð á virka ræktun → due', () => {
    const ins = byId(run(), 'water-g1');
    expect(ins?.severity).toBe('due');
    expect(ins?.dueInDays).toBe(0);
  });

  it('vökvað fyrir 1 degi (tíðni 3) → info "í lagi"', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', timestamp: NOW - 1 * DAY_MS })] }),
      'water-g1',
    );
    expect(ins?.severity).toBe('info');
    expect(ins?.dueInDays).toBe(2);
  });

  it('vökvað fyrir 2 dögum → soon (á morgun)', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', timestamp: NOW - 2 * DAY_MS })] }),
      'water-g1',
    );
    expect(ins?.severity).toBe('soon');
  });

  it('vökvað fyrir 5 dögum → due, dueInDays neikvætt', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', timestamp: NOW - 5 * DAY_MS })] }),
      'water-g1',
    );
    expect(ins?.severity).toBe('due');
    expect(ins?.dueInDays).toBe(-2);
  });

  it('gluggi þornar hraðar: tíðni 2 í stað 3', () => {
    // Vökvað fyrir 2 dögum: í tjaldi væri það 'soon', í glugga er það 'due'.
    const ins = byId(
      run({
        grow: { locationKey: 'window' },
        logs: [mkLog({ type: 'water', timestamp: NOW - 2 * DAY_MS })],
      }),
      'water-g1',
    );
    expect(ins?.severity).toBe('due');
  });

  it('óvirk ræktun (öll plöntur í skipulagi) fær enga vökvunar-áminningu', () => {
    expect(
      byId(run({ plants: [mkPlant({ currentPhase: 'planning' })] }), 'water-g1'),
    ).toBeUndefined();
  });
});

describe('áburður (innandyra)', () => {
  it('vaxtarfasi án áburðar → due', () => {
    expect(byId(run(), 'feed-g1')?.severity).toBe('due');
  });

  it('gefið fyrir 3 dögum (tíðni 7) → engin áminning', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'feed', timestamp: NOW - 3 * DAY_MS })] }), 'feed-g1'),
    ).toBeUndefined();
  });

  it('gefið fyrir 6 dögum → soon', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'feed', timestamp: NOW - 6 * DAY_MS })] }), 'feed-g1')
        ?.severity,
    ).toBe('soon');
  });

  it('gefið fyrir 8 dögum → due', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'feed', timestamp: NOW - 8 * DAY_MS })] }), 'feed-g1')
        ?.severity,
    ).toBe('due');
  });

  it('spírunarfasi þarf ekki áburð', () => {
    expect(
      byId(run({ plants: [mkPlant({ currentPhase: 'germinating' })] }), 'feed-g1'),
    ).toBeUndefined();
  });
});

describe('toppun', () => {
  it('paprika í vegfasa, 30–75 daga gömul, ótoppuð → soon', () => {
    const ins = byId(run(), 'top-p1'); // sjálfgefin planta er 40 daga
    expect(ins?.severity).toBe('soon');
    expect(ins?.plantId).toBe('p1');
  });

  it('þegar toppað → engin áminning', () => {
    expect(
      byId(
        run({ logs: [mkLog({ type: 'top', plantId: 'p1', timestamp: NOW - 5 * DAY_MS })] }),
        'top-p1',
      ),
    ).toBeUndefined();
  });

  it('toppun skráð á alla ræktunina (ekkert plantId) gildir líka', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'top', timestamp: NOW - 5 * DAY_MS })] }), 'top-p1'),
    ).toBeUndefined();
  });

  it('of ung (20 daga) eða of gömul (80 daga) → engin áminning', () => {
    expect(
      byId(run({ plants: [mkPlant({ createdAt: NOW - 20 * DAY_MS })] }), 'top-p1'),
    ).toBeUndefined();
    expect(
      byId(run({ plants: [mkPlant({ createdAt: NOW - 80 * DAY_MS })] }), 'top-p1'),
    ).toBeUndefined();
  });

  it('tómatur er ekki toppaður', () => {
    expect(
      byId(run({ plants: [mkPlant({ category: 'tomato', variety: 'Próftómatur' })] }), 'top-p1'),
    ).toBeUndefined();
  });
});

describe('jarðarber: deblossom vs frjóvgun', () => {
  const strawberry = (age: number, over: Partial<Plant> = {}) =>
    mkPlant({
      category: 'strawberry',
      variety: 'Prófber',
      currentPhase: 'flowering',
      createdAt: NOW - age * DAY_MS,
      ...over,
    });

  it('ung planta (< 35 daga) í blómgun → fjarlægja blóm, ekki frjóvga', () => {
    const insights = run({ plants: [strawberry(20)] });
    expect(byId(insights, 'deblossom-p1')?.severity).toBe('soon');
    expect(byId(insights, 'pollinate-p1')).toBeUndefined();
  });

  it('eldri planta (≥ 35 daga) innandyra → pensilfrjóvgun due', () => {
    const insights = run({ plants: [strawberry(60)] });
    expect(byId(insights, 'deblossom-p1')).toBeUndefined();
    expect(byId(insights, 'pollinate-p1')?.severity).toBe('due');
  });

  it('nýfrjóvguð (í gær, tíðni 2) → info', () => {
    const insights = run({
      plants: [strawberry(60)],
      logs: [mkLog({ type: 'pollinate', plantId: 'p1', timestamp: NOW - 1 * DAY_MS })],
    });
    expect(byId(insights, 'pollinate-p1')?.severity).toBe('info');
  });

  it('útiræktun: blómgun fær hvorki pensil-áminningu né deblossom eftir 35 daga', () => {
    const insights = run({
      grow: { locationKey: 'garden' },
      plants: [strawberry(60)],
    });
    expect(byId(insights, 'pollinate-p1')).toBeUndefined();
  });
});

describe('útiræktun sleppir innidyra-ráðum', () => {
  const outdoorRun = () =>
    run({
      grow: { locationKey: 'garden', category: 'potato' },
      plants: [mkPlant({ category: 'potato', variety: 'Prófkartafla' })],
    });

  it('engin vökvunar-, áburðar-, ljós- eða umhverfis-ráð', () => {
    const insights = outdoorRun();
    expect(byId(insights, 'water-g1')).toBeUndefined();
    expect(byId(insights, 'feed-g1')).toBeUndefined();
    expect(byId(insights, 'light-g1')).toBeUndefined();
    expect(byId(insights, 'env-g1')).toBeUndefined();
  });

  it('fær í staðinn árstíðaráð og hreykingu', () => {
    const insights = outdoorRun();
    expect(byId(insights, 'season-g1')?.severity).toBe('info');
    expect(byId(insights, 'hill-p1')?.severity).toBe('soon');
  });

  it('júní er frostlaus → engin frost-áminning; september → frost soon', () => {
    expect(byId(outdoorRun(), 'frost-g1')).toBeUndefined();
    const september = run({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', variety: 'Prófkartafla' })],
      month: 9,
    });
    expect(byId(september, 'frost-g1')?.severity).toBe('soon');
  });

  it('útiræktun í skipulagsfasa fær samt sáningarráð (maí–júní: setja niður)', () => {
    const insights = run({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', variety: 'Prófkartafla', currentPhase: 'planning' })],
    });
    expect(byId(insights, 'plant-g1')?.severity).toBe('soon');
    expect(byId(insights, 'season-g1')).toBeDefined();
  });
});

describe('kartöflur teljast útiræktun (sameinað growIsOutdoor, 4.3)', () => {
  // 4.3: vélin notar nú growIsOutdoor úr season.ts — ein útgáfa með valkvæðum
  // plöntulista. Án plöntulista (UI-tilvikið) gildir aðeins environment/garden.
  const grow = mkGrow({ locationKey: 'window' }); // EKKI garður, ekkert environment
  const potato = mkPlant({ category: 'potato', variety: 'Prófkartafla' });

  it('vélin: kartöfluræktun í glugga fær útiráð, engin vökvunarráð', () => {
    const insights = run({ grow: { locationKey: 'window' }, plants: [potato] });
    expect(byId(insights, 'water-g1')).toBeUndefined();
    expect(byId(insights, 'season-g1')).toBeDefined();
  });

  it('sameinaða fallið: plöntulisti gerir kartöfluræktun útiræktun, annars ekki', () => {
    expect(seasonGrowIsOutdoor(grow)).toBe(false); // grow-eingöngu (UI án plantna)
    expect(seasonGrowIsOutdoor(grow, [potato])).toBe(true); // plöntu-meðvitað (vélin)
    expect(seasonGrowIsOutdoor(grow, [{ ...potato, archived: true }])).toBe(false);
  });

  it('environment "indoor" yfirskrifar kartöflureglu vélarinnar', () => {
    const insights = run({
      grow: { locationKey: 'window', environment: 'indoor' },
      plants: [potato],
    });
    expect(byId(insights, 'water-g1')).toBeDefined();
    expect(byId(insights, 'season-g1')).toBeUndefined();
  });
});

describe('gróðurljós', () => {
  it('desember → LED-ráð (soon); júní → náttúrubirta (info)', () => {
    expect(byId(run({ month: 12 }), 'light-g1')?.severity).toBe('soon');
    expect(byId(run({ month: 6 }), 'light-g1')?.severity).toBe('info');
  });
});

describe('Véritable SMART', () => {
  const herb = (over: Partial<Plant> = {}) =>
    mkPlant({ category: 'herb', variety: 'Prófbasilíka', ...over });

  const veritableRun = (over: { plants?: Plant[]; logs?: LogEntry[] } = {}) =>
    run({
      grow: { locationKey: 'veritable', startDate: NOW - 20 * DAY_MS },
      plants: over.plants ?? [herb()],
      logs: over.logs,
    });

  it('sleppir mold-ráðum: engin vökvun, mold-áburður eða auka-LED', () => {
    const insights = veritableRun();
    expect(byId(insights, 'water-g1')).toBeUndefined();
    expect(byId(insights, 'feed-g1')).toBeUndefined();
    expect(byId(insights, 'light-g1')).toBeUndefined();
  });

  it('tank-settið: vatnsskoðun due, áfylling due, hreinsun soon; dúkar ekki enn', () => {
    // 20 dagar frá upphafi, engar skráningar: skoðun (3d) og áfylling (14d herb)
    // eru fallnar á tíma, hreinsun (14d) líka; dúkaskoðun (30d) ekki enn.
    const insights = veritableRun();
    expect(byId(insights, 'veritable-watercheck-g1')?.severity).toBe('due');
    expect(byId(insights, 'veritable-refill-g1')?.severity).toBe('due');
    expect(byId(insights, 'veritable-clean-g1')?.severity).toBe('soon');
    expect(byId(insights, 'veritable-wick-g1')).toBeUndefined();
  });

  it('water-skráning núllstillir skoðun og áfyllingu', () => {
    const insights = veritableRun({
      logs: [mkLog({ type: 'water', timestamp: NOW - 1 * DAY_MS })],
    });
    expect(byId(insights, 'veritable-watercheck-g1')).toBeUndefined();
    expect(byId(insights, 'veritable-refill-g1')).toBeUndefined();
  });

  it('clean_tank viðhaldsskráning núllstillir hreinsun', () => {
    const insights = veritableRun({
      logs: [
        mkLog({
          type: 'maintenance',
          timestamp: NOW - 2 * DAY_MS,
          data: { task: 'clean_tank' },
        }),
      ],
    });
    expect(byId(insights, 'veritable-clean-g1')).toBeUndefined();
  });

  it('aldinplanta styttir áfyllingarbil í 7 daga', () => {
    // Tómatur 10 daga frá upphafi: herb-bil (14d) væri ekki fallið, aldin-bil (7d) er það.
    const insights = run({
      grow: { locationKey: 'veritable', startDate: NOW - 10 * DAY_MS },
      plants: [mkPlant({ category: 'tomato', variety: 'Próftómatur', createdAt: NOW - 10 * DAY_MS })],
    });
    expect(byId(insights, 'veritable-refill-g1')?.severity).toBe('due');
  });

  it('grisjun: ungplanta á degi 10 → soon; eftir thin_seedlings → engin', () => {
    const seedling = herb({ currentPhase: 'seedling', createdAt: NOW - 10 * DAY_MS });
    expect(
      byId(veritableRun({ plants: [seedling] }), 'veritable-thin-p1')?.severity,
    ).toBe('soon');
    expect(
      byId(
        veritableRun({
          plants: [seedling],
          logs: [
            mkLog({
              type: 'maintenance',
              plantId: 'p1',
              timestamp: NOW - 1 * DAY_MS,
              data: { task: 'thin_seedlings' },
            }),
          ],
        }),
        'veritable-thin-p1',
      ),
    ).toBeUndefined();
  });

  it('Lingot-líftími: aldinplanta á degi 110 (líftími ~120) → info', () => {
    const old = mkPlant({
      category: 'tomato',
      variety: 'Próftómatur',
      createdAt: NOW - 110 * DAY_MS,
    });
    const insights = run({
      grow: { locationKey: 'veritable', startDate: NOW - 110 * DAY_MS },
      plants: [old],
    });
    const lingot = byId(insights, 'veritable-lingot-p1');
    expect(lingot?.severity).toBe('info');
    expect(lingot?.dueInDays).toBe(10);
  });

  it('viðbótarnæring: aldinplanta ≥ 8 vikna án áburðar → soon', () => {
    const mature = mkPlant({
      category: 'tomato',
      variety: 'Próftómatur',
      createdAt: NOW - 60 * DAY_MS,
    });
    const insights = run({
      grow: { locationKey: 'veritable', startDate: NOW - 60 * DAY_MS },
      plants: [mature],
    });
    expect(byId(insights, 'veritable-nutrient-g1')?.severity).toBe('soon');
  });
});

describe('umhverfis-bönd (3.4)', () => {
  const envLog = (over: Partial<LogEntry> = {}) =>
    mkLog({ type: 'environment', timestamp: NOW - 12 * 3600 * 1000, ...over });

  it('hiti yfir marki á blómgun (18–24) með nýlegum lestri → envBand soon', () => {
    const insights = run({
      plants: [mkPlant({ currentPhase: 'flowering' })],
      logs: [envLog({ data: { tempC: 30, humidityPct: 55 } })],
    });
    expect(byId(insights, 'envband-temp-g1')?.severity).toBe('soon');
    // raki 55% er innan blómgunar-bands (50–65) → ekkert raka-hnipp.
    expect(byId(insights, 'envband-hum-g1')).toBeUndefined();
  });

  it('raki undir marki → envBand soon', () => {
    const insights = run({
      plants: [mkPlant({ currentPhase: 'vegetative' })],
      logs: [envLog({ data: { tempC: 23, humidityPct: 30 } })],
    });
    expect(byId(insights, 'envband-hum-g1')?.severity).toBe('soon');
  });

  it('gildi innan marka → engin envBand-hnippur', () => {
    const insights = run({
      plants: [mkPlant({ currentPhase: 'vegetative' })],
      logs: [envLog({ data: { tempC: 23, humidityPct: 60 } })],
    });
    expect(byId(insights, 'envband-temp-g1')).toBeUndefined();
    expect(byId(insights, 'envband-hum-g1')).toBeUndefined();
  });

  it('gamall lestur (> 48 klst) telur ekki', () => {
    const insights = run({
      plants: [mkPlant({ currentPhase: 'flowering' })],
      logs: [mkLog({ type: 'environment', timestamp: NOW - 3 * DAY_MS, data: { tempC: 30 } })],
    });
    expect(byId(insights, 'envband-temp-g1')).toBeUndefined();
  });

  it('útiræktun fær engin envBand-hnipp', () => {
    const insights = run({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', variety: 'Prófkartafla', currentPhase: 'flowering' })],
      logs: [envLog({ data: { tempC: 30 } })],
    });
    expect(byId(insights, 'envband-temp-g1')).toBeUndefined();
  });
});

describe('pH utan bils (3.4)', () => {
  it('pH 5.0 í síðustu vökvun → ph info', () => {
    const insights = run({
      logs: [mkLog({ type: 'water', timestamp: NOW - 1 * DAY_MS, data: { ph: 5.0 } })],
    });
    expect(byId(insights, 'ph-g1')?.severity).toBe('info');
  });

  it('pH 7.5 → ph info; pH 6.2 (innan 5.5–6.8) → ekkert', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'feed', data: { ph: 7.5 } })] }), 'ph-g1')?.severity,
    ).toBe('info');
    expect(
      byId(run({ logs: [mkLog({ type: 'water', data: { ph: 6.2 } })] }), 'ph-g1'),
    ).toBeUndefined();
  });
});

describe('spunamaur með raunraka (3.4)', () => {
  it('mjög þurrt loft (< 45%) í júní → soon óháð mánuði', () => {
    const insights = run({
      logs: [
        mkLog({ type: 'environment', timestamp: NOW - 6 * 3600 * 1000, data: { humidityPct: 35 } }),
      ],
    });
    expect(byId(insights, 'pest-g1')?.severity).toBe('soon');
  });

  it('rakt loft í júní → engin spunamaur-vakt (júní er ekki vetur)', () => {
    const insights = run({
      logs: [
        mkLog({ type: 'environment', timestamp: NOW - 6 * 3600 * 1000, data: { humidityPct: 60 } }),
      ],
    });
    expect(byId(insights, 'pest-g1')).toBeUndefined();
  });

  it('vetur (desember) án lesturs → info árstíðavakt', () => {
    expect(byId(run({ month: 12 }), 'pest-g1')?.severity).toBe('info');
  });
});

describe('röðun og samhengi', () => {
  it('due raðast á undan soon, soon á undan info', () => {
    const insights = run(); // óvökvuð veg-paprika: due (vökvun/áburður), soon (toppun), info (ljós …)
    const ranks = insights.map((i) => (i.severity === 'due' ? 0 : i.severity === 'soon' ? 1 : 2));
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(insights[0].severity).toBe('due');
  });

  it('geymd ræktun: vökvunar-áminning hverfur en áburðar-blokkin gáttar EKKI á growActive (núverandi hegðun)', () => {
    // Einkennispróf fyrir 4.3/4.4: feed/topping-blokkirnar athuga ekki grow.archived.
    const insights = run({ grow: { archived: true } });
    expect(byId(insights, 'water-g1')).toBeUndefined();
    expect(byId(insights, 'feed-g1')?.severity).toBe('due');
  });

  it('buildContextDigest skilar íslenskum texta með ræktunarheiti og plöntum', () => {
    const digest = buildContextDigest({
      grow: mkGrow(),
      plants: [mkPlant()],
      logs: [mkLog({ type: 'water', timestamp: NOW - 1 * DAY_MS })],
      harvests: [],
      now: NOW,
      month: JUNE,
    });
    expect(digest).toContain('Ræktun: Prófræktun');
    expect(digest).toContain('Prófpipar');
    expect(digest).toContain('Síðasta vökvun: fyrir 1 dag.');
    expect(digest).toContain('Virk ráð frá Rós:');
  });

  it('Véritable-digest lýsir vatnsrækt, ekki moldarrækt', () => {
    const digest = buildContextDigest({
      grow: mkGrow({ locationKey: 'veritable' }),
      plants: [mkPlant({ category: 'herb', variety: 'Prófbasilíka' })],
      logs: [],
      harvests: [],
      now: NOW,
      month: JUNE,
    });
    expect(digest).toContain('Véritable SMART');
    expect(digest).toContain('EKKI moldarækt');
  });
});
