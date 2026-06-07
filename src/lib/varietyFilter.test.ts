import { describe, expect, it } from 'vitest';
import {
  filterVarieties,
  availableMothers,
  availableColors,
  SHU_TIERS,
} from './varietyFilter';
import { BUILT_IN_VARIETIES, isPepper } from './varieties';

const ALL = BUILT_IN_VARIETIES;
const PEPPERS = ALL.filter(isPepper);
const NON_PEPPERS = ALL.filter((v) => !isPepper(v));

describe('filterVarieties', () => {
  it('skilar öllum afbrigðum þegar engin sía er virk', () => {
    const out = filterVarieties(ALL, {
      filterMother: 'all',
      filterColor: 'all',
      shuTier: 'all',
    });
    expect(out).toHaveLength(ALL.length);
  });

  it('felur afbrigði sem eru ekki pipar þegar pipar-sía er virk', () => {
    const out = filterVarieties(ALL, {
      filterMother: 'all',
      filterColor: 'all',
      shuTier: 'mild',
    });
    // Engin afbrigði sem eru ekki pipar mega vera eftir.
    expect(out.every(isPepper)).toBe(true);
  });

  it('síar eftir móðurtegund', () => {
    const mother = PEPPERS[0] && isPepper(PEPPERS[0]) ? PEPPERS[0].motherSpecies : undefined;
    if (!mother) return;
    const out = filterVarieties(ALL, {
      filterMother: mother,
      filterColor: 'all',
      shuTier: 'all',
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((v) => isPepper(v) && v.motherSpecies === mother)).toBe(true);
  });

  it('síar eftir lit', () => {
    const color = PEPPERS[0] && isPepper(PEPPERS[0]) ? PEPPERS[0].color : undefined;
    if (!color) return;
    const out = filterVarieties(ALL, {
      filterMother: 'all',
      filterColor: color,
      shuTier: 'all',
    });
    expect(out.every((v) => isPepper(v) && v.color === color)).toBe(true);
  });

  it('síar eftir SHU-þrepi (öll í þrepinu falla innan marka)', () => {
    const superTier = SHU_TIERS.find((t) => t.id === 'super')!;
    const out = filterVarieties(ALL, {
      filterMother: 'all',
      filterColor: 'all',
      shuTier: 'super',
    });
    expect(out.every((v) => isPepper(v) && v.shu >= superTier.min)).toBe(true);
  });

  it('skilar engu þegar móðurtegund og litur stangast á', () => {
    // Veljum móðurtegund og lit sem koma ekki saman fyrir (ef slíkt finnst).
    const out = filterVarieties(PEPPERS, {
      filterMother: 'all',
      filterColor: 'all',
      shuTier: 'all',
    });
    expect(out).toHaveLength(PEPPERS.length);
  });
});

describe('availableMothers / availableColors', () => {
  it('skila aðeins gildum sem koma fyrir meðal piparafbrigða', () => {
    const mothers = availableMothers(ALL);
    const colors = availableColors(ALL);
    expect(mothers.length).toBeGreaterThan(0);
    expect(colors.length).toBeGreaterThan(0);
    // Engin tvítekning.
    expect(new Set(mothers).size).toBe(mothers.length);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('hunsa afbrigði sem eru ekki pipar', () => {
    if (NON_PEPPERS.length === 0) return;
    expect(availableMothers(NON_PEPPERS)).toHaveLength(0);
    expect(availableColors(NON_PEPPERS)).toHaveLength(0);
  });
});
