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
  varietyById,
  varietyByName,
} from '@/lib/varieties';

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

  it('paprikur hafa (enn) enga skipulagða umhirðu — 3.4 bætir tier-leiðsögn', () => {
    for (const v of BUILT_IN_VARIETIES) {
      if (isPepper(v)) expect(hasCare(v), v.id).toBe(false);
    }
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
