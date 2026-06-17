/**
 * eval/ai-ab/dataset.ts — Grow-context prompt dataset for the A/B harness.
 *
 * Each entry is a realistic Spíra grow situation expressed as the same
 * buildContextDigest output the Netlify /api/ros function receives, plus
 * a user question the grower would ask Rós.  We use a fixed Icelandic string
 * rather than calling buildContextDigest at run-time so the dataset is stable
 * across code changes.
 */

export interface PromptCase {
  id: string;
  /** Short English description (for the judge rubric output). */
  description: string;
  /** The context string (simulating buildContextDigest output). */
  context: string;
  /** The user question in Icelandic. */
  question: string;
  /**
   * Rubric: what a GOOD answer should contain (keywords / concepts).
   * The LLM judge checks these.
   */
  rubricMustContain: string[];
  /** Things a good answer should NOT say (hallucinations, wrong advice). */
  rubricMustNotContain?: string[];
}

export const DATASET: PromptCase[] = [
  {
    id: 'pepper-veg-watering',
    description: 'Indoor pepper in vegetative phase — watering cadence question',
    context: [
      'Ræktun: Jalapeño A (dagur 38)',
      'Staðsetning: Tjald',
      'Birta (Júní): ~21 klst — náttúrubirta nægir.',
      'Plöntur:',
      '- Jalapeño Rojo (Jalapeño) — vegfasi',
      'Síðasta vökvun: fyrir 3 daga.',
      'Síðasti áburður: enginn skráður.',
      'Virk ráð frá Rós:',
      '- [due] Tími til að vökva: Síðast vökvað fyrir 3 daga. Mælt er með vökvun á ~3 daga fresti hér. Fingurpróf áður en þú vökvar.',
      '- [due] Tími til að gefa áburð: Enginn áburður skráður á vaxtarfasa. Gefðu vægan áburð (lágt N, hátt P-K á blóma/aldinfasa).',
      '- [soon] Íhugaðu að toppa Jalapeño Rojo: Toppun á papriku í vegfasa (við ~15 cm hæð) gefur þéttari, greinóttari plöntu og meiri uppskeru.',
    ].join('\n'),
    question: 'Hve oft á ég að vökva papriku í tjaldi á sumrin?',
    rubricMustContain: ['fingur', 'þurr', 'daga'],
    rubricMustNotContain: ['daglega', 'every day'],
  },
  {
    id: 'tomato-pollination',
    description: 'Indoor tomato in flower — hand pollination guidance',
    context: [
      'Ræktun: Steinunn gluggi (dagur 62)',
      'Staðsetning: NV-gluggi',
      'Birta (Júní): ~21 klst — náttúrubirta nægir.',
      'Plöntur:',
      '- Steinunn (Steinunn) — blómgun',
      'Síðasta vökvun: fyrir 2 daga.',
      'Síðasti áburður: fyrir 5 daga.',
      'Virk ráð frá Rós:',
      '- [due] Frjóvgaðu Steinunn: Steinunn í blómgun: frjóvga með rafmagnstannbursta á 2–3 daga fresti (snertu blaðstöngul/bakhlið blóms í 2–3 sek). Annars detta blómin án aldins.',
      '- [info] Náttúrubirta nægir: Júní: ~21 klst dagsbirta í Reykjavík — náttúrubirtan dugar þennan mánuð.',
    ].join('\n'),
    question: 'Hvernig frjóvga ég Steinunn-tómatinn minn best?',
    rubricMustContain: ['tannbursti', 'blóm', 'daga'],
    rubricMustNotContain: ['bý', 'skordýr'],
  },
  {
    id: 'strawberry-deblossom',
    description: 'Young indoor strawberry — deblossom advice',
    context: [
      'Ræktun: Albion innandyra (dagur 18)',
      'Staðsetning: LED-tjald',
      'Birta (Febrúar): ~8 klst — gróðurljós mælt með.',
      'Plöntur:',
      '- Albion (Albion) — blómgun',
      'Síðasta vökvun: fyrir 1 dag.',
      'Síðasti áburður: enginn skráður.',
      'Virk ráð frá Rós:',
      '- [soon] Fjarlægðu fyrstu blóm af Albion: Ung jarðarberjaplanta (dagur 18): klíptu af blómum fyrstu ~5 vikurnar þar til plantan hefur 6–8 þroskuð blöð.',
    ].join('\n'),
    question: 'Af hverju á ég að fjarlægja blómin af ungri jarðarberjaplöntu?',
    rubricMustContain: ['rótar', 'krónu', 'blöð'],
    rubricMustNotContain: ['frjóvg'],
  },
  {
    id: 'potato-outdoor-june',
    description: 'Outdoor potato in June — hilling and care question',
    context: [
      'Ræktun: Gullauga garður (dagur 20)',
      'Útiræktun — Júní (frost: none): Hreykja þegar grös eru 15–20 cm; reyttu arfa og vökvaðu.',
      'Plöntur:',
      '- Gullauga (Gullauga) — vegfasi',
      'Síðasta vökvun: engin skráð.',
      'Síðasti áburður: enginn skráður.',
      'Virk ráð frá Rós:',
      '- [soon] Hreyktu að Gullauga: Mokaðu mold að stönglunum þegar grös eru 15–20 cm, og aftur við 30–40 cm.',
      '- [info] Júní: útiræktun: Hreykja þegar grös eru 15–20 cm; reyttu arfa og vökvaðu.',
    ].join('\n'),
    question: 'Hvenær og hvernig á ég að hreyfa kartöflurnar mínar?',
    rubricMustContain: ['15', 'mold', 'hnýð'],
    rubricMustNotContain: ['innandyra', 'gróðurljós'],
  },
  {
    id: 'env-band-temp-high',
    description: 'Indoor pepper with temperature above flowering band',
    context: [
      'Ræktun: Cayenne tjald (dagur 75)',
      'Staðsetning: Tjald',
      'Birta (Júlí): ~20 klst — náttúrubirta nægir.',
      'Plöntur:',
      '- Cayenne (Cayenne) — blómgun',
      'Síðasta vökvun: fyrir 2 daga.',
      'Síðasti áburður: fyrir 4 daga.',
      'Virk ráð frá Rós:',
      '- [soon] Hiti yfir marki: Mældur hiti 30°C er yfir ráðlögðu bili (18–24°C) á þessum fasa. Svalara á blómgun heldur í blómin; of hár raki/hiti fellir þau.',
      '- [info] Áburður í lagi: Síðast gefið fyrir 4 daga. Næsta gjöf líklega á morgun.',
    ].join('\n'),
    question: 'Hvað get ég gert til að lækka hitann í tjaldbúðinni minni?',
    rubricMustContain: ['loftræsting', 'blóm'],
    rubricMustNotContain: ['vatnsrækt'],
  },
];
