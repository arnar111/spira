import { describe, it, expect } from 'vitest';
import { withinRange, type RangeDays } from './range';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function sample(daysAgo: number) {
  return { timestamp: NOW - daysAgo * DAY, value: daysAgo };
}

describe('withinRange', () => {
  const items = [sample(0), sample(5), sample(10), sample(20), sample(40)];

  it('null skilar öllu', () => {
    expect(withinRange(items, null, NOW)).toHaveLength(5);
  });

  it('7 daga gluggi heldur aðeins nýlegum', () => {
    const out = withinRange(items, 7, NOW);
    expect(out.map((i) => i.value)).toEqual([0, 5]);
  });

  it('14 daga gluggi', () => {
    expect(withinRange(items, 14, NOW).map((i) => i.value)).toEqual([0, 5, 10]);
  });

  it('30 daga gluggi', () => {
    expect(withinRange(items, 30, NOW).map((i) => i.value)).toEqual([0, 5, 10, 20]);
  });

  it('mörkin eru meðtalin (>=)', () => {
    const exactly7 = [{ timestamp: NOW - 7 * DAY, value: 7 }];
    expect(withinRange(exactly7, 7 as RangeDays, NOW)).toHaveLength(1);
  });

  it('tómur listi skilar tómu', () => {
    expect(withinRange([], 7, NOW)).toEqual([]);
  });
});
