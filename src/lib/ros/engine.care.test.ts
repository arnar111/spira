/**
 * Rós reglu-vél — próf fyrir nýju 5.5-reglurnar:
 *  - EC utan fasa-bands (indoorEnv.ecInsights)
 *  - meindýra-/sjúkdóms-eftirfylgni (care.pestFollowUpInsights)
 *  - fasa-hraði (care.paceInsights)
 *  - umpottunar-hnippur (care.transplantInsights)
 *  - vor-vakning jarðarberja (care.springWakeInsights)
 *  - frjóvgun á aldinfasa (indoor.pollinationInsights, viðbót)
 *  - digest-viðbætur (dagsetning, Umhverfi, umhirðukafli, meindýr, aldintalning)
 *
 * Sömu smíðaverksmiðjur og engine.test.ts. computeInsights/buildContextDigest
 * eru HREIN — now/month berast inn.
 */

import { describe, expect, it } from 'vitest';
import type { Grow, LogEntry, Plant } from '@/lib/db';
import { buildContextDigest, computeInsights } from '@/lib/ros/engine';
import type { RosInsight } from '@/lib/ros/types';

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 5, 13, 12); // 2026-06-13
const JUNE = 6;

function mkGrow(over: Partial<Grow> = {}): Grow {
  return {
    id: 'g1',
    name: 'Umhirðuræktun',
    category: 'pepper',
    location: 'Tjald',
    locationKey: 'tent',
    startDate: NOW - 45 * DAY_MS,
    archived: false,
    createdAt: NOW - 45 * DAY_MS,
    updatedAt: NOW - 45 * DAY_MS,
    ...over,
  };
}

function mkPlant(over: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    growId: 'g1',
    variety: 'Prófpipar', // utan vörulistans — afbrigðisreglur kvikna ekki óvart
    category: 'pepper',
    startedFrom: 'seed',
    currentPhase: 'vegetative',
    archived: false,
    createdAt: NOW - 45 * DAY_MS,
    updatedAt: NOW - 45 * DAY_MS,
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

interface RunOpts {
  grow?: Partial<Grow>;
  plants?: Plant[];
  logs?: LogEntry[];
  month?: number;
}

function run(opts: RunOpts = {}): RosInsight[] {
  return computeInsights({
    grow: mkGrow(opts.grow),
    plants: opts.plants ?? [mkPlant()],
    logs: opts.logs ?? [],
    harvests: [],
    now: NOW,
    month: opts.month ?? JUNE,
  });
}

function byId(insights: RosInsight[], id: string): RosInsight | undefined {
  return insights.find((i) => i.id === id);
}

// ─── EC utan fasa-bands ───────────────────────────────────────────────────────

describe('EC utan bands (5.5)', () => {
  it('EC 2.9 á vegfasa (band 1.2–2.0, frávik 0.9) → soon, titill "yfir"', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'feed', data: { ec: 2.9 } })] }),
      'ec-g1',
    );
    expect(ins?.severity).toBe('soon');
    expect(ins?.kind).toBe('ec');
    expect(ins?.title).toContain('yfir');
  });

  it('EC 2.2 á vegfasa (frávik 0.2) → info', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'water', data: { ec: 2.2 } })] }), 'ec-g1')?.severity,
    ).toBe('info');
  });

  it('EC 0.5 á vegfasa (frávik 0.7 undir) → soon, titill "undir"', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'water', data: { ec: 0.5 } })] }),
      'ec-g1',
    );
    expect(ins?.severity).toBe('soon');
    expect(ins?.title).toContain('undir');
  });

  it('EC 1.5 innan bands → engin innsýn', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'feed', data: { ec: 1.5 } })] }), 'ec-g1'),
    ).toBeUndefined();
  });

  it('gamall EC-lestur (8 daga) → engin innsýn (7 daga ferskleiki)', () => {
    expect(
      byId(
        run({ logs: [mkLog({ type: 'feed', timestamp: NOW - 8 * DAY_MS, data: { ec: 3.0 } })] }),
        'ec-g1',
      ),
    ).toBeUndefined();
  });

  it('detail nefnir aldur lesturs og bandið', () => {
    const ins = byId(
      run({ logs: [mkLog({ type: 'feed', timestamp: NOW - 2 * DAY_MS, data: { ec: 2.9 } })] }),
      'ec-g1',
    );
    expect(ins?.detail).toContain('fyrir 2 daga');
    expect(ins?.detail).toContain('1.2–2 mS/cm');
  });

  it('útiræktun → engin EC-innsýn', () => {
    expect(
      byId(
        run({
          grow: { locationKey: 'garden' },
          plants: [mkPlant({ category: 'potato', variety: 'Prófkartafla' })],
          logs: [mkLog({ type: 'feed', data: { ec: 3.0 } })],
        }),
        'ec-g1',
      ),
    ).toBeUndefined();
  });

  it('kryddjurt fær mildara band (1.0–1.6): EC 1.8 er yfir hjá herb en innan hjá papriku', () => {
    const herbRun = run({
      plants: [mkPlant({ category: 'herb', variety: 'Prófbasilíka' })],
      logs: [mkLog({ type: 'feed', data: { ec: 1.8 } })],
    });
    expect(byId(herbRun, 'ec-g1')?.severity).toBe('info');
    const pepperRun = run({ logs: [mkLog({ type: 'feed', data: { ec: 1.8 } })] });
    expect(byId(pepperRun, 'ec-g1')).toBeUndefined();
  });
});

// ─── Meindýra-/sjúkdóms-eftirfylgni ──────────────────────────────────────────

describe('meindýra-eftirfylgni (5.5)', () => {
  const pest = (daysAgo: number, severity: string, kind = 'spunamitill') =>
    mkLog({
      type: 'pest',
      timestamp: NOW - daysAgo * DAY_MS,
      data: { kind, severity },
    });

  it('mikil, 3 daga gömul → due; detail nefnir tegundina (Spunamítill)', () => {
    const ins = byId(run({ logs: [pest(3, 'mikil')] }), 'pestcheck-g1');
    expect(ins?.severity).toBe('due');
    expect(ins?.kind).toBe('pest');
    expect(ins?.detail).toContain('Spunamítill');
    expect(ins?.detail).toContain('mikið');
  });

  it('mikil, 1 dags gömul → engin (nýskráð, tíðni 2 dagar)', () => {
    expect(byId(run({ logs: [pest(1, 'mikil')] }), 'pestcheck-g1')).toBeUndefined();
  });

  it('midlungs, 5 daga → soon; 2 daga → engin', () => {
    expect(byId(run({ logs: [pest(5, 'midlungs')] }), 'pestcheck-g1')?.severity).toBe('soon');
    expect(byId(run({ logs: [pest(2, 'midlungs')] }), 'pestcheck-g1')).toBeUndefined();
  });

  it('litil, 8 daga → info; óskráð umfang hegðar sér eins og litil', () => {
    expect(byId(run({ logs: [pest(8, 'litil')] }), 'pestcheck-g1')?.severity).toBe('info');
    const noSev = mkLog({ type: 'pest', timestamp: NOW - 8 * DAY_MS, data: { kind: 'lus' } });
    expect(byId(run({ logs: [noSev] }), 'pestcheck-g1')?.severity).toBe('info');
  });

  it('eldri en 14 daga → engin eftirfylgni', () => {
    expect(byId(run({ logs: [pest(15, 'mikil')] }), 'pestcheck-g1')).toBeUndefined();
  });

  it('sjúkdómur (grámygla) fær eigin titil og íslenskt heiti', () => {
    const log = mkLog({
      type: 'disease',
      timestamp: NOW - 5 * DAY_MS,
      data: { kind: 'gramygla', severity: 'midlungs' },
    });
    const ins = byId(run({ logs: [log] }), 'pestcheck-g1');
    expect(ins?.severity).toBe('soon');
    expect(ins?.title).toContain('sjúkdóminn');
    expect(ins?.detail).toContain('Grámygla');
  });

  it('óvirk ræktun (allt í skipulagi) → engin eftirfylgni', () => {
    expect(
      byId(
        run({ plants: [mkPlant({ currentPhase: 'planning' })], logs: [pest(3, 'mikil')] }),
        'pestcheck-g1',
      ),
    ).toBeUndefined();
  });
});

// ─── Fasa-hraði (plantPace) ──────────────────────────────────────────────────

describe('fasa-hraði (5.5)', () => {
  // Steinunn: daysToHarvest [60, 85].
  const steinunn = (ageDays: number, phase: Plant['currentPhase']) =>
    mkPlant({
      category: 'tomato',
      variety: 'Steinunn',
      varietyId: 'tomato-steinunn',
      currentPhase: phase,
      createdAt: NOW - ageDays * DAY_MS,
    });

  it('vegfasi á degi 95 (10 dögum yfir hámarki) → soon með ljós/hita-ráði', () => {
    const ins = byId(run({ plants: [steinunn(95, 'vegetative')] }), 'pace-p1');
    expect(ins?.severity).toBe('soon');
    expect(ins?.detail).toMatch(/ljós/i);
  });

  it('vegfasi á degi 88 (aðeins 3 dögum yfir) → engin (7 daga vikmörk)', () => {
    expect(byId(run({ plants: [steinunn(88, 'vegetative')] }), 'pace-p1')).toBeUndefined();
  });

  it('aldinfasi á degi 95 → engin (plantan er að þroska aldin)', () => {
    expect(byId(run({ plants: [steinunn(95, 'fruiting')] }), 'pace-p1')).toBeUndefined();
  });

  it('þroski á degi 50 (fyrir lágmark) → info „á undan áætlun"', () => {
    const ins = byId(run({ plants: [steinunn(50, 'ripening')] }), 'pace-p1');
    expect(ins?.severity).toBe('info');
    expect(ins?.title).toContain('á undan');
  });

  it('útiræktun → engin hraða-innsýn', () => {
    expect(
      byId(
        run({
          grow: { locationKey: 'garden', environment: 'outdoor' },
          plants: [steinunn(95, 'vegetative')],
        }),
        'pace-p1',
      ),
    ).toBeUndefined();
  });

  it('afbrigði utan vörulistans → engin hraða-innsýn (enginn gluggi)', () => {
    expect(byId(run({ plants: [mkPlant({ createdAt: NOW - 200 * DAY_MS })] }), 'pace-p1')).toBeUndefined();
  });
});

// ─── Umpottunar-hnippur ──────────────────────────────────────────────────────

describe('umpottun (5.5)', () => {
  it('45 daga planta í vegfasa, engin umpottun → soon', () => {
    const ins = byId(run(), 'transplant-p1');
    expect(ins?.severity).toBe('soon');
    expect(ins?.kind).toBe('transplant');
  });

  it('transplantDate skráð → engin', () => {
    expect(
      byId(run({ plants: [mkPlant({ transplantDate: NOW - 10 * DAY_MS })] }), 'transplant-p1'),
    ).toBeUndefined();
  });

  it('transplant-skráning (á alla ræktunina) → engin', () => {
    expect(
      byId(run({ logs: [mkLog({ type: 'transplant', timestamp: NOW - 10 * DAY_MS })] }), 'transplant-p1'),
    ).toBeUndefined();
  });

  it('of ung (20 daga) eða of gömul (130 daga) → engin', () => {
    expect(
      byId(run({ plants: [mkPlant({ createdAt: NOW - 20 * DAY_MS })] }), 'transplant-p1'),
    ).toBeUndefined();
    expect(
      byId(run({ plants: [mkPlant({ createdAt: NOW - 130 * DAY_MS })] }), 'transplant-p1'),
    ).toBeUndefined();
  });

  it('aldinfasi → engin (aðeins plöntu-/vegfasi)', () => {
    expect(
      byId(run({ plants: [mkPlant({ currentPhase: 'fruiting' })] }), 'transplant-p1'),
    ).toBeUndefined();
  });

  it('Véritable og útiræktun → engin', () => {
    expect(
      byId(
        run({
          grow: { locationKey: 'veritable' },
          plants: [mkPlant({ category: 'herb', variety: 'Prófbasilíka' })],
        }),
        'transplant-p1',
      ),
    ).toBeUndefined();
    expect(
      byId(
        run({
          grow: { locationKey: 'garden' },
          plants: [mkPlant({ category: 'strawberry', variety: 'Prófber' })],
        }),
        'transplant-p1',
      ),
    ).toBeUndefined();
  });
});

// ─── Vor-vakning jarðarberja ─────────────────────────────────────────────────

describe('vor-vakning (5.5)', () => {
  const dormantBerry = (phase: Plant['currentPhase'] = 'dormant') =>
    mkPlant({ category: 'strawberry', variety: 'Prófber', currentPhase: phase });

  it('jarðarber í dvala í apríl → soon — þrátt fyrir að ræktunin teljist óvirk', () => {
    const ins = byId(run({ plants: [dormantBerry()], month: 4 }), 'wake-p1');
    expect(ins?.severity).toBe('soon');
    expect(ins?.title).toContain('dvala');
  });

  it('vetrardvali (overwintering) telur líka; mars og maí kvikna', () => {
    expect(byId(run({ plants: [dormantBerry('overwintering')], month: 3 }), 'wake-p1')).toBeDefined();
    expect(byId(run({ plants: [dormantBerry()], month: 5 }), 'wake-p1')).toBeDefined();
  });

  it('júní og febrúar → engin vakning', () => {
    expect(byId(run({ plants: [dormantBerry()], month: 6 }), 'wake-p1')).toBeUndefined();
    expect(byId(run({ plants: [dormantBerry()], month: 2 }), 'wake-p1')).toBeUndefined();
  });

  it('paprika í dvala → engin (aðeins jarðarber leggjast í dvala hér)', () => {
    expect(
      byId(run({ plants: [mkPlant({ currentPhase: 'dormant' })], month: 4 }), 'wake-p1'),
    ).toBeUndefined();
  });

  it('geymd ræktun → engin vakning', () => {
    expect(
      byId(run({ grow: { archived: true }, plants: [dormantBerry()], month: 4 }), 'wake-p1'),
    ).toBeUndefined();
  });
});

// ─── Frjóvgun á aldinfasa ────────────────────────────────────────────────────

describe('frjóvgun á aldinfasa (5.5)', () => {
  const fruiting = (category: 'tomato' | 'pepper' | 'strawberry' = 'tomato') =>
    mkPlant({
      category,
      variety: category === 'tomato' ? 'Próftómatur' : category === 'pepper' ? 'Prófpipar' : 'Prófber',
      currentPhase: 'fruiting',
      createdAt: NOW - 80 * DAY_MS,
    });

  it('tómatur á aldinfasa án frjóvgunar → soon (róleg 4 daga tíðni)', () => {
    const ins = byId(run({ plants: [fruiting()] }), 'pollinate-p1');
    expect(ins?.severity).toBe('soon');
    expect(ins?.kind).toBe('pollinate');
  });

  it('frjóvgað fyrir 2 dögum → engin; fyrir 4 dögum → soon aftur', () => {
    expect(
      byId(
        run({
          plants: [fruiting()],
          logs: [mkLog({ type: 'pollinate', plantId: 'p1', timestamp: NOW - 2 * DAY_MS })],
        }),
        'pollinate-p1',
      ),
    ).toBeUndefined();
    expect(
      byId(
        run({
          plants: [fruiting()],
          logs: [mkLog({ type: 'pollinate', plantId: 'p1', timestamp: NOW - 4 * DAY_MS })],
        }),
        'pollinate-p1',
      )?.severity,
    ).toBe('soon');
  });

  it('paprika á aldinfasa fær líka hnipp; jarðarber ekki', () => {
    expect(byId(run({ plants: [fruiting('pepper')] }), 'pollinate-p1')?.severity).toBe('soon');
    expect(byId(run({ plants: [fruiting('strawberry')] }), 'pollinate-p1')).toBeUndefined();
  });

  it('útiræktun á aldinfasa → engin (náttúruleg frjóvgun)', () => {
    expect(
      byId(
        run({ grow: { locationKey: 'garden', environment: 'outdoor' }, plants: [fruiting()] }),
        'pollinate-p1',
      ),
    ).toBeUndefined();
  });

  it('blómgunarfasi ÓBREYTTUR: tómatur í blómgun án frjóvgunar → due eins og áður', () => {
    const flowering = mkPlant({
      category: 'tomato',
      variety: 'Próftómatur',
      currentPhase: 'flowering',
      createdAt: NOW - 60 * DAY_MS,
    });
    expect(byId(run({ plants: [flowering] }), 'pollinate-p1')?.severity).toBe('due');
  });
});

// ─── Digest-viðbætur ─────────────────────────────────────────────────────────

describe('digest-viðbætur (5.5)', () => {
  function digest(opts: RunOpts & { focusPlant?: Plant } = {}): string {
    return buildContextDigest({
      grow: mkGrow(opts.grow),
      plants: opts.plants ?? [mkPlant()],
      logs: opts.logs ?? [],
      harvests: [],
      now: NOW,
      month: opts.month ?? JUNE,
      focusPlant: opts.focusPlant,
    });
  }

  it('dagsetningarlína dregin af now — og "Ræktun:" er áfram fyrsta línan', () => {
    const d = digest();
    expect(d).toContain('Dagsetning: 13. júní 2026.');
    expect(d.split('\n')[0]).toMatch(/^Ræktun:/);
  });

  it('Umhverfis-blokk: mæling, pH, EC með aldri og markgildi fasans', () => {
    const d = digest({
      logs: [
        mkLog({ type: 'environment', timestamp: NOW - 1 * DAY_MS, data: { tempC: 22, humidityPct: 55, lightHours: 16 } }),
        mkLog({ type: 'water', timestamp: NOW - 2 * DAY_MS, data: { ph: 6.2, ec: 1.6 } }),
      ],
    });
    expect(d).toContain('Umhverfi:');
    expect(d).toContain('- Mæling (fyrir 1 dag): hiti 22°C, raki 55%, ljós 16 klst');
    expect(d).toContain('- pH 6.2 (fyrir 2 daga)');
    expect(d).toContain('- EC 1.6 mS/cm (fyrir 2 daga)');
    expect(d).toContain('- Markgildi (vegfasi): hiti 20–26°C, raki 50–70%, EC 1.2–2 mS/cm');
  });

  it('aðeins línur fyrir gögn sem eru til; markgildi birtast samt innidyra', () => {
    const d = digest();
    expect(d).toContain('Umhverfi:');
    expect(d).not.toContain('- Mæling');
    expect(d).not.toContain('- pH');
    expect(d).toContain('- Markgildi (vegfasi)');
  });

  it('útiræktun: engin markgildislína (innibönd eiga ekki við úti)', () => {
    const d = digest({
      grow: { locationKey: 'garden' },
      plants: [mkPlant({ category: 'potato', variety: 'Prófkartafla' })],
    });
    expect(d).not.toContain('- Markgildi');
  });

  it('fókus-planta með þekkt afbrigði fær umhirðu-samantekt (resolveCare)', () => {
    const plant = mkPlant({
      category: 'tomato',
      variety: 'Steinunn',
      varietyId: 'tomato-steinunn',
    });
    const d = digest({ plants: [plant], focusPlant: plant });
    expect(d).toContain('Umhirða afbrigðis:');
    expect(d).toContain('- Vökvun:');
    expect(d).toContain('- Ljós:');
  });

  it('fókus-planta utan vörulistans fær enga umhirðu-samantekt', () => {
    const plant = mkPlant();
    expect(digest({ plants: [plant], focusPlant: plant })).not.toContain('Umhirða afbrigðis:');
  });

  it('nýleg meindýraskráning (≤ 21 dags) birtist með íslensku heiti', () => {
    const d = digest({
      logs: [
        mkLog({
          type: 'pest',
          timestamp: NOW - 5 * DAY_MS,
          data: { kind: 'lus', severity: 'litil', detail: 'á neðstu blöðum' },
        }),
      ],
    });
    expect(d).toContain('Meindýr (fyrir 5 daga): Lús, umfang lítið — á neðstu blöðum.');
  });

  it('gömul meindýraskráning (25 daga) sleppt', () => {
    const d = digest({
      logs: [mkLog({ type: 'pest', timestamp: NOW - 25 * DAY_MS, data: { kind: 'lus' } })],
    });
    expect(d).not.toContain('Meindýr (');
  });

  it('síðasta aldintalning úr frjóvgunarskráningu birtist', () => {
    const d = digest({
      logs: [
        mkLog({ type: 'pollinate', timestamp: NOW - 3 * DAY_MS, data: { fruitCount: 12 } }),
      ],
    });
    expect(d).toContain('Síðasta aldintalning: 12 aldin (fyrir 3 daga).');
  });
});
