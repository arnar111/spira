/**
 * Heilsa — myndgreining Rósar á einstökum plöntum.
 *
 * Hreinar hjálparfallgerðir fyrir „Heilsu"-flipann: smíða leiðbeiningar (prompt)
 * handa Rós og lesa heilsueinkunn úr svari hennar. Engin klukka, slembni né IO —
 * allt deterministískt og prófanlegt. Samhengi ræktunarinnar (buildContextDigest)
 * berst sér í `context` til /api/ros; hér einbeitum við okkur að EINNI plöntu.
 */
import type { Plant } from '@/lib/db';
import { plantLabel, phaseLabel } from './engine';

/** Efra mark heilsueinkunnar. */
export const MAX_HEALTH_SCORE = 10;

/**
 * Leiðbeiningar til Rósar fyrir heilsumat á EINNI plöntu út frá meðfylgjandi mynd.
 * Krefst fasts sniðs svo við getum lesið einkunnina og birt hana snyrtilega.
 */
export function buildAssessmentPrompt(plant: Plant): string {
  const label = plantLabel(plant);
  return [
    `Greindu heilsu plöntunnar „${label}" (${plant.variety}, fasi: ${phaseLabel(plant.currentPhase)}) út frá meðfylgjandi mynd.`,
    '',
    'Svaraðu á íslensku og notaðu NÁKVÆMLEGA þetta snið:',
    `- Fyrsta línan: **Heilsa: N/10 — <stutt einkunnarorð>** (N er heiltala 0–${MAX_HEALTH_SCORE}).`,
    '- Síðan 2–4 stuttar setningar (eða punktar) um það sem þú SÉRÐ á myndinni: lit og þrótt blaða, vöxt, blóm/aldin, og hvort þú greinir meindýr, sjúkdóma eða næringarskort.',
    '- Endaðu á einni línu sem byrjar á „→ " með mikilvægasta næsta skrefi.',
    '',
    'Byggðu matið EINGÖNGU á því sem sést á myndinni og samhenginu að ofan. Sé myndin óskýr eða sýni ekki plöntuna skaltu segja það hreinskilnislega og gefa lægri einkunn. Vertu hlý en hnitmiðuð.',
  ].join('\n');
}

/**
 * Les heilsueinkunn (heiltala 0–MAX_HEALTH_SCORE) úr svari Rósar — tekur fyrsta
 * „N/10" sem finnst (sniðið setur hana fremst). Skilar null ef engin finnst eða
 * hún er utan marka; þá birtum við einfaldlega textann án einkunnar-merkis.
 */
export function parseHealthScore(text: string): number | null {
  const match = text.match(/(\d{1,2})\s*\/\s*10/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 0 || n > MAX_HEALTH_SCORE) return null;
  return n;
}
