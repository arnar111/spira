/**
 * locations.ts — getLocation fallback + catalogue integrity.
 */
import { describe, expect, it } from 'vitest';
import { LOCATIONS, getLocation, type LocationKey } from '@/lib/locations';

describe('getLocation', () => {
  it('skilar réttu staðsetningu fyrir hvern gyldan lykil', () => {
    const keys: LocationKey[] = ['window', 'tent', 'shower', 'diy', 'garden', 'veritable'];
    for (const key of keys) {
      const loc = getLocation(key);
      expect(loc.key).toBe(key);
    }
  });

  it('varagildi (shower) þegar lykill er óþekktur', () => {
    // TypeScript leyfir ekki beint cast á ógild gildi án as unknown, en forritið
    // ætti að meðhöndla gögn sem geta verið úr gömlu geymslusniði.
    const loc = getLocation('óþekktur' as LocationKey);
    expect(loc.key).toBe('shower'); // LOCATIONS[2] = shower
  });

  it('hvort environment er rétt á hverjum stað', () => {
    expect(getLocation('garden').environment).toBe('outdoor');
    expect(getLocation('window').environment).toBe('indoor');
    expect(getLocation('tent').environment).toBe('indoor');
    expect(getLocation('veritable').environment).toBe('indoor');
  });
});

describe('LOCATIONS catalogue', () => {
  it('allir staðir hafa einkvæmar lyklar', () => {
    const keys = LOCATIONS.map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('öll nauðsynleg svið eru til staðar á hverjum stað', () => {
    for (const loc of LOCATIONS) {
      expect(loc.label.length).toBeGreaterThan(0);
      expect(loc.short.length).toBeGreaterThan(0);
      expect(loc.description.length).toBeGreaterThan(0);
      expect(loc.maxHeightCm).toBeGreaterThan(0);
      expect(loc.lightScore).toBeGreaterThanOrEqual(0);
      expect(loc.lightScore).toBeLessThanOrEqual(1);
      expect(loc.defaults.growName.length).toBeGreaterThan(0);
      expect(loc.defaults.spaceWidthCm).toBeGreaterThan(0);
      expect(loc.defaults.targetTempC).toBeGreaterThan(0);
    }
  });

  it('garden er eina outdoor-staðurinn', () => {
    const outdoors = LOCATIONS.filter((l) => l.environment === 'outdoor');
    expect(outdoors).toHaveLength(1);
    expect(outdoors[0].key).toBe('garden');
  });

  it('veritable er lægsta maxHeightCm (vasalegt)', () => {
    const veritable = getLocation('veritable');
    const others = LOCATIONS.filter((l) => l.key !== 'veritable');
    for (const other of others) {
      expect(veritable.maxHeightCm).toBeLessThanOrEqual(other.maxHeightCm);
    }
  });

  it('tent hefur hæsta lightScore (1.0) og humidityControl', () => {
    const tent = getLocation('tent');
    expect(tent.lightScore).toBe(1);
    expect(tent.humidityControl).toBe(true);
  });
});
