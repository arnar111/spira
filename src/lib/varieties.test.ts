import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_VARIETIES,
  hasCare,
  isHerb,
  isLeafy,
  isPepper,
  isPotato,
  isStrawberry,
  isTomato,
  pepperCareTier,
  resolveCare,
  varietyById,
  varietyByName,
} from '@/lib/varieties';
import { LOCATIONS } from '@/lib/locations';

describe('vörulistinn (gagnaheilindi)', () => {
  it('er ekki tómur og öll id eru einkvæm', () => {
    expect(BUILT_IN_VARIETIES.length).toBeGreaterThan(0);
    const ids = BUILT_IN_VARIETIES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('hvert afbrigði hefur spírunar- og uppskerubil (lágmark ≤ hámark)', () => {
    for (const v of BUILT_IN_VARIETIES) {
      expect(v.daysToGerminate, `${v.id} vantar daysToGerminate`).toBeDefined();
      expect(v.daysToHarvest, `${v.id} vantar daysToHarvest`).toBeDefined();
      const [gMin, gMax] = v.daysToGerminate;
      const [hMin, hMax] = v.daysToHarvest;
      expect(gMin, `${v.id} spírun`).toBeLessThanOrEqual(gMax);
      expect(hMin, `${v.id} uppskera`).toBeLessThanOrEqual(hMax);
      expect(gMin).toBeGreaterThanOrEqual(0);
      expect(hMin).toBeGreaterThan(0);
    }
  });

  it('hvert afbrigði er innbyggt með nafni, bragði og staðsetningum', () => {
    for (const v of BUILT_IN_VARIETIES) {
      expect(v.isBuiltIn, v.id).toBe(true);
      expect(v.commonName.length, v.id).toBeGreaterThan(0);
      expect(v.flavor.length, v.id).toBeGreaterThan(0);
      expect(v.suitableLocations.length, v.id).toBeGreaterThan(0);
      expect(v.matureHeightCm, v.id).toBeGreaterThan(0);
    }
  });

  it('allar staðsetningar vísa á gilda staðsetningarlykla', () => {
    const valid = new Set(LOCATIONS.map((l) => l.key));
    for (const v of BUILT_IN_VARIETIES) {
      for (const loc of v.suitableLocations) {
        expect(valid.has(loc), `${v.id} → ${loc}`).toBe(true);
      }
    }
  });
});

describe('kryddjurtir og lauf', () => {
  const NEW_HERB_IDS = [
    'herb-thai-basil',
    'herb-purple-basil',
    'herb-oregano',
    'herb-thyme',
    'herb-dill',
    'herb-sage',
    'herb-lemon-balm',
    'herb-rosemary',
  ];
  const NEW_LEAFY_IDS = [
    'leafy-baby-spinach',
    'leafy-butterhead',
    'leafy-mizuna',
    'leafy-baby-chard',
  ];

  it('nýju afbrigðin eru til með réttum flokki', () => {
    for (const id of NEW_HERB_IDS) {
      expect(isHerb(varietyById(id)), id).toBe(true);
    }
    for (const id of NEW_LEAFY_IDS) {
      expect(isLeafy(varietyById(id)), id).toBe(true);
    }
  });

  it('hver kryddjurt/lauf ber líftíma og uppskerutíðni', () => {
    for (const v of BUILT_IN_VARIETIES) {
      if (!isHerb(v) && !isLeafy(v)) continue;
      expect(v.lifespanDays, v.id).toBeGreaterThan(0);
      expect(v.harvestFrequency, v.id).toMatch(/^Á \d+ daga fresti$/);
    }
  });

  it('vinsælustu kryddjurtirnar og salatblöðin bera fullt umhirðukort', () => {
    const withCare = [
      // gluggapotta-kortið (windowHerbCare)
      'herb-thai-basil',
      'herb-oregano',
      'herb-thyme',
      'herb-dill',
      'herb-sage',
      'herb-rosemary',
      'herb-mint',
      'herb-parsley',
      'herb-cilantro',
      'herb-chives',
      // vatnsræktunar-kortið (lingotCare)
      'herb-basil',
      'leafy-arugula',
      'leafy-baby-spinach',
      'leafy-butterhead',
    ];
    for (const id of withCare) {
      const v = varietyById(id);
      expect(hasCare(v), id).toBe(true);
      const care = resolveCare(v)!;
      expect(care.summary.length, id).toBeGreaterThan(0);
      expect(care.targets.length, id).toBeGreaterThan(0);
      expect(care.watering.length, id).toBeGreaterThan(0);
      expect(care.fertilizer.length, id).toBeGreaterThan(0);
      expect(care.troubleshooting.length, id).toBeGreaterThan(0);
      expect(care.normal.length, id).toBeGreaterThan(0);
      expect(care.concern.length, id).toBeGreaterThan(0);
    }
  });

  it('gluggapotta-kortin bera sérráð umfram sameiginlega grunninn', () => {
    // Grunnurinn er 5 markmiðsraðir — sérsniðin kort bæta a.m.k. einni við.
    for (const id of ['herb-thai-basil', 'herb-oregano', 'herb-thyme', 'herb-dill', 'herb-sage', 'herb-rosemary']) {
      const care = resolveCare(varietyById(id))!;
      expect(care.targets.length, id).toBeGreaterThan(5);
    }
  });

  it('viðarkenndar Miðjarðarhafsjurtir mælast ekki með Véritable', () => {
    for (const id of ['herb-rosemary', 'herb-thyme', 'herb-sage']) {
      const v = varietyById(id)!;
      expect(v.suitableLocations, id).not.toContain('veritable');
      expect(v.suitableLocations, id).toContain('window');
    }
  });
});

describe('flokkaverðir (type guards)', () => {
  it('hver vörður svarar nákvæmlega sínum flokki', () => {
    for (const v of BUILT_IN_VARIETIES) {
      expect(isPepper(v)).toBe(v.category === 'pepper');
      expect(isTomato(v)).toBe(v.category === 'tomato');
      expect(isStrawberry(v)).toBe(v.category === 'strawberry');
      expect(isPotato(v)).toBe(v.category === 'potato');
      expect(isHerb(v)).toBe(v.category === 'herb');
      expect(isLeafy(v)).toBe(v.category === 'leafy');
    }
  });

  it('undefined fellur alls staðar', () => {
    expect(isPepper(undefined)).toBe(false);
    expect(isTomato(undefined)).toBe(false);
    expect(isStrawberry(undefined)).toBe(false);
    expect(isPotato(undefined)).toBe(false);
    expect(hasCare(undefined)).toBe(false);
  });
});

describe('hasCare', () => {
  it('tómatar, jarðarber og kartöflur hafa alltaf umhirðuleiðbeiningar', () => {
    for (const v of BUILT_IN_VARIETIES) {
      if (isTomato(v) || isStrawberry(v) || isPotato(v)) {
        expect(hasCare(v), v.id).toBe(true);
        expect(v.care.summary.length, v.id).toBeGreaterThan(0);
        expect(v.care.targets.length, v.id).toBeGreaterThan(0);
        expect(v.care.watering.length, v.id).toBeGreaterThan(0);
      }
    }
  });

  it('kryddjurtir/lauf hafa care aðeins á viðmiðunartegundum', () => {
    for (const v of BUILT_IN_VARIETIES) {
      if (isHerb(v) || isLeafy(v)) {
        expect(hasCare(v), v.id).toBe(v.care !== undefined);
      }
    }
  });

  // 3.4: paprika ber ekki innbyggt `care` (hasCare helst false fyrir hana), EN
  // resolveCare leysir hana upp í móðurtegunda-þrep (PEPPER_CARE). Viljandi
  // breyting frá fyrri hegðun — hasCare-vörðurinn á áfram aðeins við innbyggt
  // `care`, en umhirða paprikunnar fæst nú gegnum resolveCare.
  it('paprikur: hasCare false en resolveCare gefur þeim þrep-leiðsögn', () => {
    for (const v of BUILT_IN_VARIETIES) {
      if (!isPepper(v)) continue;
      expect(hasCare(v), v.id).toBe(false);
      const care = resolveCare(v);
      expect(care, v.id).toBeDefined();
      expect(care?.summary.length ?? 0, v.id).toBeGreaterThan(0);
      expect(care?.targets.length ?? 0, v.id).toBeGreaterThan(0);
      expect(care?.watering.length ?? 0, v.id).toBeGreaterThan(0);
    }
  });

  it('paprikuþrep ræðst af tegund og styrk', () => {
    for (const v of BUILT_IN_VARIETIES) {
      if (!isPepper(v)) continue;
      const tier = pepperCareTier(v);
      if (v.scientificName === 'Capsicum baccatum') expect(tier, v.id).toBe('baccatum');
      else if (v.scientificName === 'Capsicum chinense') expect(tier, v.id).toBe('chinense');
      else expect(tier, v.id).toBe(v.shu > 0 ? 'annuum-hot' : 'annuum-mild');
    }
  });

  it('resolveCare skilar undefined fyrir undefined', () => {
    expect(resolveCare(undefined)).toBeUndefined();
  });

  it('kartöflu-care notar seasonal-gátlista og sleppir frjóvgun', () => {
    for (const v of BUILT_IN_VARIETIES) {
      if (isPotato(v)) {
        expect(v.care.seasonal?.length ?? 0, v.id).toBeGreaterThan(0);
        expect(v.care.pollination, v.id).toBeUndefined();
      }
    }
  });
});

describe('uppflettingar', () => {
  it('varietyById finnur þekkt id og skilar undefined annars', () => {
    const first = BUILT_IN_VARIETIES[0];
    expect(varietyById(first.id)?.id).toBe(first.id);
    expect(varietyById('finnst-ekki')).toBeUndefined();
    expect(varietyById(undefined)).toBeUndefined();
  });

  it('varietyByName flettir upp eftir commonName', () => {
    const steinunn = varietyById('tomato-steinunn');
    expect(steinunn).toBeDefined();
    expect(varietyByName(steinunn!.commonName)?.id).toBe('tomato-steinunn');
    expect(varietyByName('Ekki til')).toBeUndefined();
    expect(varietyByName(undefined)).toBeUndefined();
  });
});
