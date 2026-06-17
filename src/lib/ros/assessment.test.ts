/**
 * ros/assessment.ts — buildAssessmentPrompt and parseHealthScore.
 * Pure deterministic functions; no IO.
 */
import { describe, expect, it } from 'vitest';
import type { Plant } from '@/lib/db';
import { buildAssessmentPrompt, parseHealthScore, MAX_HEALTH_SCORE } from '@/lib/ros/assessment';

function mkPlant(over: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    growId: 'g1',
    variety: 'Prófpipar',
    nickname: undefined,
    category: 'pepper',
    startedFrom: 'seed',
    currentPhase: 'fruiting',
    archived: false,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

describe('MAX_HEALTH_SCORE', () => {
  it('er 10', () => {
    expect(MAX_HEALTH_SCORE).toBe(10);
  });
});

describe('buildAssessmentPrompt', () => {
  it('inniheldur heiti afbrigðis og íslenskt fasa-heiti', () => {
    const p = buildAssessmentPrompt(mkPlant());
    expect(p).toContain('Prófpipar');
    // phaseLabel('fruiting') → 'aldin' (íslenska þýðingin)
    expect(p).toContain('aldin');
  });

  it('inniheldur N/10 snið í leiðbeiningum', () => {
    const p = buildAssessmentPrompt(mkPlant());
    expect(p).toContain('/10');
    expect(p).toContain('íslensku');
  });

  it('inniheldur → táknið í "næsta skref" leiðbeining', () => {
    const p = buildAssessmentPrompt(mkPlant());
    expect(p).toContain('→ ');
  });

  it('wholeGrowPhoto-valkostur bætir við viðbótarleiðbeiningum', () => {
    const without = buildAssessmentPrompt(mkPlant());
    const withOpt = buildAssessmentPrompt(mkPlant(), { wholeGrowPhoto: true });
    expect(withOpt.length).toBeGreaterThan(without.length);
    expect(withOpt).toContain('ALLA ræktunina');
  });

  it('wholeGrowPhoto=false er jafngilt og valgilt default', () => {
    const def = buildAssessmentPrompt(mkPlant());
    const explicit = buildAssessmentPrompt(mkPlant(), { wholeGrowPhoto: false });
    expect(def).toBe(explicit);
  });

  it('planta með gælunafn (nickname) birtist í prompt', () => {
    const p = buildAssessmentPrompt(mkPlant({ nickname: 'Chico' }));
    expect(p).toContain('Chico');
  });
});

describe('parseHealthScore', () => {
  it('les einkunn úr N/10 sniði', () => {
    expect(parseHealthScore('**Heilsa: 7/10 — góð**')).toBe(7);
    expect(parseHealthScore('Heilsa: 10/10 — frábær')).toBe(10);
    expect(parseHealthScore('Heilsa: 0/10 — sjúk')).toBe(0);
  });

  it('skilar null ef ekkert N/10 finnst', () => {
    expect(parseHealthScore('')).toBeNull();
    expect(parseHealthScore('Engin einkunn hér')).toBeNull();
    expect(parseHealthScore('10 stigur')).toBeNull();
  });

  it('tekur fyrsta N/10 sem finnst (fleiri en eitt)', () => {
    // Prompt may echo "N/10" in instructions; first match wins.
    const result = parseHealthScore('8/10 gott. Síðar 3/10 slæmt.');
    expect(result).toBe(8);
  });

  it('skilar null þegar einkunn er utan [0, MAX_HEALTH_SCORE]', () => {
    // 11/10 er yfir hámarki
    expect(parseHealthScore('11/10 — of hátt')).toBeNull();
    // Negative would be "-1/10" — regex matches \\d{1,2} so no negative
  });

  it('leyfir bil milli tölu og skástrik', () => {
    expect(parseHealthScore('Heilsa: 6 / 10 — meðal')).toBe(6);
  });

  it('tvísingl stafa einkunn (t.d. 10)', () => {
    expect(parseHealthScore('10/10')).toBe(10);
  });

  it('núll er gilt heilsuskor', () => {
    expect(parseHealthScore('0/10')).toBe(0);
  });
});
