// Fyrsta prófið — staðfestir að Vitest virkar og að `@`-aliasinn leysist í
// prófum. Prófasamþykkt verkefnisins: *.test.ts við hlið skránna (sjá
// juneimpro.md 4.2). Alvöru próf fyrir hreinu kjarnaeiningarnar koma í 4.2.
import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/cn';

describe('cn', () => {
  it('sameinar klasa', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('sleppir falsy gildum', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('lætur seinni Tailwind-klasann vinna (twMerge)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
