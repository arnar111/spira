import { describe, expect, it } from 'vitest';
import type { PhotoBlob } from '@/lib/db';
import {
  flattenGroups,
  formatMb,
  groupPhotosByMonth,
  monthKey,
  monthLabel,
} from '@/lib/photoGallery';

function photo(id: string, takenAt: number): PhotoBlob {
  return { id, growId: 'g1', blob: new Blob(), takenAt };
}

const MAY = Date.UTC(2026, 4, 10, 12);
const JUN_EARLY = Date.UTC(2026, 5, 2, 12);
const JUN_LATE = Date.UTC(2026, 5, 20, 12);

describe('monthLabel / monthKey', () => {
  it('íslenskt mánaðarheiti með ári', () => {
    expect(monthLabel(JUN_LATE)).toBe('júní 2026');
    expect(monthLabel(MAY)).toBe('maí 2026');
  });

  it('monthKey aðgreinir mánuði en sameinar sama mánuð', () => {
    expect(monthKey(JUN_EARLY)).toBe(monthKey(JUN_LATE));
    expect(monthKey(MAY)).not.toBe(monthKey(JUN_EARLY));
    expect(monthKey(JUN_LATE) - monthKey(MAY)).toBe(1);
  });
});

describe('groupPhotosByMonth', () => {
  it('hópar eftir mánuði: nýjustu mánuðir fyrst, nýjustu myndir efst', () => {
    const groups = groupPhotosByMonth([
      photo('may', MAY),
      photo('jun-early', JUN_EARLY),
      photo('jun-late', JUN_LATE),
    ]);
    expect(groups.map((g) => g.label)).toEqual(['júní 2026', 'maí 2026']);
    expect(groups[0].photos.map((p) => p.id)).toEqual(['jun-late', 'jun-early']);
    expect(groups[1].photos.map((p) => p.id)).toEqual(['may']);
  });

  it('flattenGroups gefur flata röð nýjast-fyrst', () => {
    const groups = groupPhotosByMonth([
      photo('may', MAY),
      photo('jun-late', JUN_LATE),
      photo('jun-early', JUN_EARLY),
    ]);
    expect(flattenGroups(groups).map((p) => p.id)).toEqual([
      'jun-late',
      'jun-early',
      'may',
    ]);
  });

  it('tómt inntak → tómt', () => {
    expect(groupPhotosByMonth([])).toEqual([]);
  });
});

describe('formatMb', () => {
  it('bætir → MB með einum aukastaf', () => {
    expect(formatMb(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatMb(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});
