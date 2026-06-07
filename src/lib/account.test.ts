import { describe, expect, it } from 'vitest';
import { CODE_LENGTH, CODE_PATTERN, isValidCode, normalizeCode } from '@/lib/account';

describe('normalizeCode', () => {
  it('hástafar', () => {
    expect(normalizeCode('abc')).toBe('ABC');
    expect(normalizeCode('aB1')).toBe('AB1');
  });

  it('fjarlægir önnur tákn en A–Z/0–9', () => {
    expect(normalizeCode('a-b c')).toBe('ABC');
    expect(normalizeCode('  1!2@3#  ')).toBe('123');
  });

  it('klippir EKKI — röng lengd fellur á isValidCode (samræmt við serverinn í 5.1)', () => {
    expect(normalizeCode('abcdef')).toBe('ABCDEF');
    expect(normalizeCode('a-b-c-d')).toBe('ABCD');
    expect(isValidCode(normalizeCode('abcdef'))).toBe(false);
  });

  it('íslenskir stafir (Þ/Ð/Æ/Ö) eru fjarlægðir, ekki varpaðir', () => {
    expect(normalizeCode('þór')).toBe('R');
    expect(normalizeCode('ÐÆÖ')).toBe('');
  });

  it('tómt og táknlaust inntak gefur tóman streng', () => {
    expect(normalizeCode('')).toBe('');
    expect(normalizeCode('!!!')).toBe('');
  });
});

describe('isValidCode', () => {
  it('samþykkir nákvæmlega 3 hástafi/tölustafi', () => {
    expect(isValidCode('ABC')).toBe(true);
    expect(isValidCode('A1B')).toBe(true);
    expect(isValidCode('123')).toBe(true);
  });

  it('hafnar lágstöfum (verður að normalisera fyrst)', () => {
    expect(isValidCode('abc')).toBe(false);
  });

  it('hafnar rangri lengd', () => {
    expect(isValidCode('AB')).toBe(false);
    expect(isValidCode('ABCD')).toBe(false);
    expect(isValidCode('')).toBe(false);
  });

  it('hafnar íslenskum stöfum og táknum', () => {
    expect(isValidCode('ÞAB')).toBe(false);
    expect(isValidCode('AÐB')).toBe(false);
    expect(isValidCode('A-B')).toBe(false);
    expect(isValidCode('A B')).toBe(false);
  });

  it('normalizeCode → isValidCode er heild fyrir gilt hráefni', () => {
    expect(isValidCode(normalizeCode('abc'))).toBe(true);
    expect(isValidCode(normalizeCode(' a-b 1 '))).toBe(true); // strippað í AB1
    expect(isValidCode(normalizeCode('a b c d'))).toBe(false); // 4 stafir = ógilt
    expect(isValidCode(normalizeCode('þð'))).toBe(false); // ekkert eftir
  });
});

describe('fastar', () => {
  it('CODE_LENGTH og CODE_PATTERN eru samkvæm', () => {
    expect(CODE_LENGTH).toBe(3);
    expect(CODE_PATTERN.source).toBe('^[A-Z0-9]{3}$');
  });
});
