/**
 * Greining — leiðsögn Rósar við að bera kennsl á meindýr og sjúkdóma.
 *
 * Hreinar hjálparfallgerðir fyrir „Greiningar"-flipann: listi yfir algeng einkenni,
 * ágiskun um hvort skrá eigi meindýr eða sjúkdóm, og smíði leiðbeininga (prompt)
 * handa Rós ásamt lestri á titli greiningar úr svari hennar. Engin klukka, slembni
 * né IO — allt deterministískt og prófanlegt. Samhengi ræktunarinnar
 * (buildContextDigest) berst sér í `context` til /api/ros; hér einbeitum við okkur
 * að einkennunum sem notandinn valdi.
 */
import type { Plant } from '@/lib/db';
import { plantLabel, phaseLabel } from './engine';

/** Eitt einkenni sem notandinn getur valið. pest=true => bendir frekar á meindýr en sjúkdóm. */
export interface Symptom {
  id: string;
  label: string;
  pest: boolean;
}

/** Algeng einkenni á blöðum, blómum og aldinum — íslensk, hnitmiðuð. */
export const SYMPTOMS: Symptom[] = [
  { id: 'gul-blod', label: 'Gul blöð', pest: false },
  { id: 'brunir-blettir', label: 'Brúnir blettir á blöðum', pest: false },
  { id: 'hangandi', label: 'Hangandi/slöpp blöð', pest: false },
  { id: 'krullud', label: 'Krulluð eða vansköpuð blöð', pest: true },
  { id: 'gotott', label: 'Göt á blöðum', pest: true },
  { id: 'hvit-skan', label: 'Hvít skán eða mygla', pest: false },
  { id: 'lus', label: 'Litlar pöddur eða klístur', pest: true },
  { id: 'vefur', label: 'Fínn vefur á blöðum', pest: true },
  { id: 'blomfall', label: 'Blóm detta af', pest: false },
  { id: 'daudir-endar', label: 'Dauðir blettir eða endar', pest: false },
];

/**
 * Ágiskun um hvaða log-tegund eigi best við valið einkennasafn: 'pest' ef
 * STRANGUR meirihluti valinna einkenna bendir á meindýr (pest=true), annars
 * 'disease'. Óþekkt id (eða tómt val) telja ekki með meindýrum og falla því á
 * 'disease' sem öruggara sjálfgefið.
 */
export function suggestLogType(symptomIds: string[]): 'pest' | 'disease' {
  const byId = new Map(SYMPTOMS.map((s) => [s.id, s] as const));
  let pestCount = 0;
  let total = 0;
  for (const id of symptomIds) {
    const sym = byId.get(id);
    if (!sym) continue;
    total += 1;
    if (sym.pest) pestCount += 1;
  }
  return pestCount * 2 > total ? 'pest' : 'disease';
}

/**
 * Leiðbeiningar til Rósar fyrir greiningu á meindýri/sjúkdómi út frá völdum
 * einkennum (og valfrjálsri mynd). Krefst fasts sniðs svo UI geti lesið titil
 * greiningarinnar og birt hana snyrtilega.
 */
export function buildDiagnosisPrompt(
  plant: Plant | undefined,
  symptoms: Symptom[],
  extraNote: string,
  hasPhoto: boolean,
): string {
  const subject = plant
    ? `plöntuna „${plantLabel(plant)}" (${plant.variety}, fasi: ${phaseLabel(plant.currentPhase)})`
    : 'plöntu í ræktuninni';

  const lines: string[] = [
    `Hjálpaðu mér að greina hvað amar að ${subject}.`,
  ];

  if (symptoms.length > 0) {
    lines.push('', 'Einkenni sem ég hef tekið eftir:');
    for (const s of symptoms) lines.push(`- ${s.label}`);
  }

  const note = extraNote.trim();
  if (note) {
    lines.push('', `Annað sem ég hef tekið eftir: ${note}`);
  }

  if (hasPhoto) {
    lines.push('', 'Notaðu meðfylgjandi mynd til að styðja greininguna.');
  }

  lines.push(
    '',
    'Svaraðu á íslensku og notaðu NÁKVÆMLEGA þetta snið:',
    '- Fyrsta línan: **Greining: <stutt heiti á líklegustu greiningu>**',
    '- **Líkleg orsök** — 1–2 setningar um líklegustu orsökina.',
    '- **Aðrar mögulegar orsakir** — punktalisti með öðru sem gæti átt við.',
    '- **Meðferð — skref fyrir skref** — númeraður listi með áþreifanlegum skrefum.',
    '- **Forvarnir** — punktalisti um hvernig megi koma í veg fyrir þetta næst.',
    '',
    'Byggðu greininguna á einkennunum, samhenginu að ofan og myndinni sé hún til staðar. Sértu óviss skaltu segja það hreinskilnislega og nefna hvaða viðbótarupplýsingar (eða skýrari mynd) myndu hjálpa. Vertu hlý en hnitmiðuð.',
  );

  return lines.join('\n');
}

/**
 * Les titil greiningar úr svari Rósar — fyrstu línuna á sniðinu
 * „**Greining: …**". Skilar hreinsuðum titli (án merkja) eða null finnist hann ekki.
 */
export function parseDiagnosisTitle(text: string): string | null {
  const match = text.match(/\*\*\s*Greining:\s*(.+?)\s*\*\*/);
  if (!match) return null;
  const title = match[1].trim();
  return title.length > 0 ? title : null;
}
