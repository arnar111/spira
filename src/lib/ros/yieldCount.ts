/**
 * Rós — myndtalning aldina/blóma/klasa.
 *
 * Hreinar hjálparfallgerðir: smíða leiðbeiningar (prompt) handa Rós til að TELJA
 * sýnilegar einingar á mynd og lesa fjöldann úr svari hennar. Engin klukka,
 * slembni né IO — deterministískt og prófanlegt (sama mynstur og assessment.ts).
 * Talningin verður að `manualCount` í uppskerumati (`ros/yield.ts`).
 */
import type { Plant } from '@/lib/db';
import { plantLabel } from './engine';

/** Hvað á að telja á myndinni. */
export type CountKind = 'aldin' | 'blóm' | 'klasar';

/** Íslensk lýsing á talningareiningu fyrir prompt-textann. */
const KIND_PHRASE: Record<CountKind, string> = {
  aldin: 'sýnileg aldin (ber/pods/tómata)',
  blóm: 'opin blóm',
  klasar: 'blóm-/aldinklasa (trusses)',
};

/**
 * Leiðbeiningar til Rósar fyrir talningu á EINNI plöntu út frá meðfylgjandi mynd.
 * Krefst fasts sniðs (fyrsta lína `FJÖLDI: <n>`) svo við getum lesið töluna.
 */
export function buildCountPrompt(plant: Plant, kind: CountKind): string {
  const label = plantLabel(plant);
  return [
    `Teldu ${KIND_PHRASE[kind]} á plöntunni „${label}" (${plant.variety}) út frá meðfylgjandi mynd.`,
    '',
    'Svaraðu á íslensku og notaðu NÁKVÆMLEGA þetta snið:',
    '- Fyrsta línan: **FJÖLDI: <n>** (n er heiltala — fjöldi sem þú telur á myndinni).',
    '- Síðan EIN stutt setning um hvað þú sást (t.d. hvort eitthvað var hulið eða óskýrt).',
    '',
    'Teldu EINGÖNGU það sem sést greinilega á myndinni. Sé myndin óskýr eða sýni ekki plöntuna skaltu setja FJÖLDI: 0 og segja það hreinskilnislega. Ekki giska á einingar sem eru utan ramma.',
  ].join('\n');
}

/**
 * Les fjölda (heiltölu ≥ 0) úr svari Rósar — tekur fyrstu töluna á eftir „FJÖLDI"
 * (sniðið setur hana fremst), annars fyrstu heiltölu sem finnst. Skilar null ef
 * engin nothæf tala finnst.
 */
export function parseCount(text: string): number | null {
  const labeled = text.match(/FJÖLDI\s*:?\s*(\d+)/i);
  const match = labeled ?? text.match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}
