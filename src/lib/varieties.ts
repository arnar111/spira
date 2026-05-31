import type { ChiliVariety } from '@/components/Chili';
import type { TomatoGlyph } from '@/components/Tomato';
import type { StrawberryGlyph } from '@/components/Strawberry';
import type { PotatoGlyph } from '@/components/Potato';
import type { VarietyPreset } from './db';
import type { LocationKey } from './locations';

export type PepperColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'chocolate'
  | 'peach'
  | 'white'
  | 'purple'
  | 'green'
  | 'mustard';

export const COLOR_HEX: Record<PepperColor, string> = {
  red: '#d23320',
  orange: '#ef7a2c',
  yellow: '#e8b32a',
  chocolate: '#5e3a26',
  peach: '#f4ad8b',
  white: '#f4ecd1',
  purple: '#5a3a6a',
  green: '#5a8c2f',
  mustard: '#c89938',
};

export const COLOR_LABEL: Record<PepperColor, string> = {
  red: 'Rauður',
  orange: 'Appelsínugulur',
  yellow: 'Gulur',
  chocolate: 'Súkkulaði',
  peach: 'Ferskja',
  white: 'Hvítur',
  purple: 'Fjólublár',
  green: 'Grænn',
  mustard: 'Sinnep',
};

/**
 * "Móðurtegund" — common-name parent variety (not Latin).
 * Used to group all colour-variants of e.g. Habanero or Bhut Jolokia together.
 */
export const MOTHER_SPECIES = [
  'Bell',
  'Jalapeño',
  'Serrano',
  'Cayenne',
  'Poblano',
  'Padrón',
  'Shishito',
  'Thai',
  'Scotch Bonnet',
  'Habanero',
  'Bhut Jolokia',
  '7 Pot',
  'Carolina Reaper',
  'Trinidad Scorpion',
  'Ají',
] as const;
export type MotherSpecies = (typeof MOTHER_SPECIES)[number];

/** Shared fields across every plant the variety library knows about. */
interface VarietyCommon extends VarietyPreset {
  flavor: string;
  origin: string;
  daysToGerminate: [number, number];
  daysToHarvest: [number, number];
  notes: string;
  /** Locations the app recommends this variety for */
  suitableLocations: LocationKey[];
  /** Mature plant height in cm — used to filter by location ceiling */
  matureHeightCm: number;
}

export interface PepperVariety extends VarietyCommon {
  category: 'pepper';
  chili: ChiliVariety;
  motherSpecies: MotherSpecies;
  color: PepperColor;
  shu: number;
}

/** A stage in the feeding schedule (low-N / high-PK for fruiting tomatoes). */
export interface FertStage {
  stage: string;
  npk: string;
  freq: string;
  note: string;
}

/** A single troubleshooting entry: symptom → likely cause → fix. */
export interface TroubleItem {
  problem: string;
  cause: string;
  fix: string;
}

/** Care target row (light / heat / humidity / pH / pot / water / feed). */
export interface CareTarget {
  label: string;
  value: string;
  hint?: string;
}

/**
 * Structured grow guide distilled from a variety's care sheet. Crop-agnostic —
 * tomatoes, strawberries and (later) other fruiting crops all share this shape.
 */
export interface CropCare {
  summary: string;
  targets: CareTarget[];
  watering: string[];
  /** Hand-pollination guidance — omitted for crops that don't need it (potato). */
  pollination?: string[];
  /** Optional season-long checklist (chitting, hilling, frost) for outdoor crops. */
  seasonal?: string[];
  fertilizer: FertStage[];
  troubleshooting: TroubleItem[];
  normal: string[];
  concern: string[];
}

/** Back-compat alias — the care guide was tomato-only before strawberries. */
export type TomatoCare = CropCare;

export interface TomatoVariety extends VarietyCommon {
  category: 'tomato';
  glyph: TomatoGlyph;
  /** Reuses the shared colour palette for the swatch dot. */
  fruitColor: PepperColor;
  growthHabit: 'determinate' | 'indeterminate';
  fruitWeightG: number;
  fruitShape: string;
  care: CropCare;
}

/** Flowering/fruiting rhythm — drives pollination + de-blossom advice. */
export type StrawberryType = 'day-neutral' | 'everbearing' | 'june-bearing' | 'alpine';

export interface StrawberryVariety extends VarietyCommon {
  category: 'strawberry';
  glyph: StrawberryGlyph;
  /** Reuses the shared colour palette for the swatch dot. */
  fruitColor: PepperColor;
  berryType: StrawberryType;
  /** Approx. ripe berry weight in grams (alpine berries are tiny). */
  fruitWeightG: number;
  care: CropCare;
}

/** Maturity class — drives the harvest-window estimate. */
export type PotatoMaturity = 'early' | 'maincrop' | 'late';

export interface PotatoVariety extends VarietyCommon {
  category: 'potato';
  glyph: PotatoGlyph;
  /** Reuses the shared colour palette for the skin swatch. */
  skinColor: PepperColor;
  maturity: PotatoMaturity;
  /** Culinary use, e.g. "bökun", "salat", "almenn". */
  use: string;
  care: CropCare;
}

export type Variety =
  | PepperVariety
  | TomatoVariety
  | StrawberryVariety
  | PotatoVariety;

/** Back-compat alias — most of the app was written before tomatoes existed. */
export type VarietyWithChili = PepperVariety;

export function isPepper(v?: Variety): v is PepperVariety {
  return v?.category === 'pepper';
}

export function isTomato(v?: Variety): v is TomatoVariety {
  return v?.category === 'tomato';
}

export function isStrawberry(v?: Variety): v is StrawberryVariety {
  return v?.category === 'strawberry';
}

export function isPotato(v?: Variety): v is PotatoVariety {
  return v?.category === 'potato';
}

/** Any variety that carries a structured care guide. */
export type CaredVariety = TomatoVariety | StrawberryVariety | PotatoVariety;

export function hasCare(v?: Variety): v is CaredVariety {
  return isTomato(v) || isStrawberry(v) || isPotato(v);
}

interface VInput {
  id: string;
  commonName: string;
  chili: ChiliVariety;
  motherSpecies: MotherSpecies;
  color: PepperColor;
  shu: number;
  flavor: string;
  origin: string;
  daysToGerminate: [number, number];
  daysToHarvest: [number, number];
  notes: string;
  matureHeightCm: number;
  suitableLocations: LocationKey[];
  scientificName?: string;
}

function v(input: VInput): PepperVariety {
  return {
    id: input.id,
    commonName: input.commonName,
    scientificName: input.scientificName ?? 'Capsicum chinense',
    category: 'pepper',
    chili: input.chili,
    motherSpecies: input.motherSpecies,
    color: input.color,
    shu: input.shu,
    flavor: input.flavor,
    origin: input.origin,
    daysToGerminate: input.daysToGerminate,
    daysToHarvest: input.daysToHarvest,
    notes: input.notes,
    isBuiltIn: true,
    matureHeightCm: input.matureHeightCm,
    suitableLocations: input.suitableLocations,
  };
}

const PEPPERS: PepperVariety[] = [
  v({
    id: 'pepper-bell-red',
    commonName: 'Bell Red',
    scientificName: 'Capsicum annuum',
    chili: 'bell_red',
    motherSpecies: 'Bell',
    color: 'red',
    shu: 0,
    flavor: 'Sætt, milt, ávaxtaríkt',
    origin: 'Mexíkó — víða ræktað',
    daysToGerminate: [7, 14],
    daysToHarvest: [70, 90],
    notes: 'Mild byrjenda-papríka — þroskast úr grænni í rauða.',
    matureHeightCm: 60,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-bell-yellow',
    commonName: 'Bell Yellow',
    scientificName: 'Capsicum annuum',
    chili: 'bell_yellow',
    motherSpecies: 'Bell',
    color: 'yellow',
    shu: 0,
    flavor: 'Sætt, mildur sítrustónn',
    origin: 'Holland — gróðurhúsa-afbrigði',
    daysToGerminate: [7, 14],
    daysToHarvest: [75, 95],
    notes: 'Sólríkt sæti, þolir lægri hita en superhots.',
    matureHeightCm: 60,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-bell-orange',
    commonName: 'Bell Orange',
    scientificName: 'Capsicum annuum',
    chili: 'bell_orange',
    motherSpecies: 'Bell',
    color: 'orange',
    shu: 0,
    flavor: 'Sætt, gulrótar-tónn',
    origin: 'Holland',
    daysToGerminate: [7, 14],
    daysToHarvest: [75, 95],
    notes: 'Sætasta papríkulíkan — fullorðnast lengur en rauð.',
    matureHeightCm: 60,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-bell-purple',
    commonName: 'Purple Beauty',
    scientificName: 'Capsicum annuum',
    chili: 'bell_purple',
    motherSpecies: 'Bell',
    color: 'purple',
    shu: 0,
    flavor: 'Mild, grösugt og ferskt',
    origin: 'USA — heirloom',
    daysToGerminate: [10, 16],
    daysToHarvest: [70, 85],
    notes: 'Fjólublá á meðan græn, verður rauð við fullan þroska.',
    matureHeightCm: 60,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-bell-chocolate',
    commonName: 'Chocolate Beauty',
    scientificName: 'Capsicum annuum',
    chili: 'bell_chocolate',
    motherSpecies: 'Bell',
    color: 'chocolate',
    shu: 0,
    flavor: 'Sætt, karamellutónn',
    origin: 'USA — heirloom',
    daysToGerminate: [10, 16],
    daysToHarvest: [85, 100],
    notes: 'Dökkbrún yfirborð, rautt kjöt — sjónrænt áhugavert.',
    matureHeightCm: 65,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),

  v({
    id: 'pepper-jalapeno',
    commonName: 'Jalapeño',
    scientificName: 'Capsicum annuum',
    chili: 'jalapeno',
    motherSpecies: 'Jalapeño',
    color: 'green',
    shu: 5000,
    flavor: 'Klassískur jalapeño-grösugur',
    origin: 'Jalapa, Veracruz, Mexíkó',
    daysToGerminate: [7, 14],
    daysToHarvest: [70, 90],
    notes: 'Tínd græn er klassísk — fær rauð við fullan þroska.',
    matureHeightCm: 70,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-jalapeno-red',
    commonName: 'Jalapeño Red',
    scientificName: 'Capsicum annuum',
    chili: 'jalapeno_red',
    motherSpecies: 'Jalapeño',
    color: 'red',
    shu: 8000,
    flavor: 'Sætari, dýpri þegar rauð',
    origin: 'Mexíkó',
    daysToGerminate: [7, 14],
    daysToHarvest: [85, 105],
    notes: 'Beðið eftir fullum þroska — verður sætari og pikant.',
    matureHeightCm: 70,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-jalapeno-purple',
    commonName: 'Purple Jalapeño',
    scientificName: 'Capsicum annuum',
    chili: 'jalapeno_purple',
    motherSpecies: 'Jalapeño',
    color: 'purple',
    shu: 4500,
    flavor: 'Mild, klassískt jalapeño',
    origin: 'Cross-breed',
    daysToGerminate: [7, 14],
    daysToHarvest: [75, 95],
    notes: 'Fjólubláir ungir, verða rauðir.',
    matureHeightCm: 70,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),

  v({
    id: 'pepper-serrano',
    commonName: 'Serrano',
    scientificName: 'Capsicum annuum',
    chili: 'serrano',
    motherSpecies: 'Serrano',
    color: 'green',
    shu: 23000,
    flavor: 'Hreint, beit, sítrustónn',
    origin: 'Hidalgo, Puebla, Mexíkó',
    daysToGerminate: [7, 14],
    daysToHarvest: [75, 90],
    notes: 'Afkastamikil plantan — algjör vinnuhestur.',
    matureHeightCm: 90,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-cayenne',
    commonName: 'Cayenne',
    scientificName: 'Capsicum annuum',
    chili: 'cayenne',
    motherSpecies: 'Cayenne',
    color: 'red',
    shu: 45000,
    flavor: 'Skarpt, þurrt, klassískt',
    origin: 'Fr. Guiana',
    daysToGerminate: [10, 18],
    daysToHarvest: [80, 100],
    notes: 'Þurrkun og duft — algeng í blöndum.',
    matureHeightCm: 90,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-cayenne-golden',
    commonName: 'Golden Cayenne',
    scientificName: 'Capsicum annuum',
    chili: 'cayenne_golden',
    motherSpecies: 'Cayenne',
    color: 'yellow',
    shu: 30000,
    flavor: 'Sætari en rauður, sítrónutónn',
    origin: 'USA — heirloom',
    daysToGerminate: [10, 18],
    daysToHarvest: [85, 105],
    notes: 'Falleg afbrigði í blöndum og sósum.',
    matureHeightCm: 90,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),

  v({
    id: 'pepper-poblano',
    commonName: 'Poblano',
    scientificName: 'Capsicum annuum',
    chili: 'poblano',
    motherSpecies: 'Poblano',
    color: 'green',
    shu: 2000,
    flavor: 'Jarðbundinn, ríkur þegar þurrkaður (ancho)',
    origin: 'Puebla, Mexíkó',
    daysToGerminate: [10, 21],
    daysToHarvest: [80, 100],
    notes: 'Klassík í chiles rellenos. Stór ávextir.',
    matureHeightCm: 90,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-shishito',
    commonName: 'Shishito',
    scientificName: 'Capsicum annuum',
    chili: 'shishito',
    motherSpecies: 'Shishito',
    color: 'green',
    shu: 200,
    flavor: 'Mildur, smjörlíkur — frábær blistraður',
    origin: 'Japan',
    daysToGerminate: [7, 14],
    daysToHarvest: [60, 80],
    notes: '1 af 10 er sterkur — leikur við gesti!',
    matureHeightCm: 60,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-padron',
    commonName: 'Padrón',
    scientificName: 'Capsicum annuum',
    chili: 'padron',
    motherSpecies: 'Padrón',
    color: 'green',
    shu: 1500,
    flavor: 'Sætur og grösugur — tapas klassík',
    origin: 'Galisía, Spánn',
    daysToGerminate: [7, 14],
    daysToHarvest: [60, 80],
    notes: 'Tínið smáa — fáir verða sterkir, restin er mild.',
    matureHeightCm: 60,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),

  v({
    id: 'pepper-thai',
    commonName: 'Thai Bird',
    scientificName: 'Capsicum annuum',
    chili: 'thai',
    motherSpecies: 'Thai',
    color: 'red',
    shu: 100000,
    flavor: 'Hreint, beit hita',
    origin: 'Suðaustur-Asía',
    daysToGerminate: [7, 14],
    daysToHarvest: [85, 100],
    notes: 'Ótrúlega afkastamikil — hundruð pods á plöntu.',
    matureHeightCm: 50,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-thai-yellow',
    commonName: 'Thai Yellow',
    scientificName: 'Capsicum annuum',
    chili: 'thai_yellow',
    motherSpecies: 'Thai',
    color: 'yellow',
    shu: 80000,
    flavor: 'Mildari en rauð, sítrustónn',
    origin: 'Taíland',
    daysToGerminate: [7, 14],
    daysToHarvest: [85, 100],
    notes: 'Falleg afbrigði — mjög afkastamikil.',
    matureHeightCm: 50,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),

  v({
    id: 'pepper-scotch-bonnet',
    commonName: 'Scotch Bonnet',
    chili: 'scotch_bonnet',
    motherSpecies: 'Scotch Bonnet',
    color: 'orange',
    shu: 200000,
    flavor: 'Ávaxtaríkt, kirsuber, sítrus',
    origin: 'Karíbahaf — Jamaíka',
    daysToGerminate: [14, 28],
    daysToHarvest: [100, 120],
    notes: 'Hjarta jerk-marineringa. Þarfnast hlýju.',
    matureHeightCm: 110,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-scotch-bonnet-red',
    commonName: 'Scotch Bonnet Red',
    chili: 'scotch_bonnet_red',
    motherSpecies: 'Scotch Bonnet',
    color: 'red',
    shu: 250000,
    flavor: 'Dýpri, smá rúsínu-tónn',
    origin: 'Trínidad',
    daysToGerminate: [14, 28],
    daysToHarvest: [100, 120],
    notes: 'Aðeins skarpari en gulur Scotch Bonnet.',
    matureHeightCm: 110,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-scotch-bonnet-chocolate',
    commonName: 'Chocolate Scotch Bonnet',
    chili: 'scotch_bonnet_chocolate',
    motherSpecies: 'Scotch Bonnet',
    color: 'chocolate',
    shu: 300000,
    flavor: 'Súkkulaði, hnetukennt, ríkulegt',
    origin: 'Jamaíka',
    daysToGerminate: [14, 28],
    daysToHarvest: [110, 130],
    notes: 'Klassísk fyrir BBQ sósur.',
    matureHeightCm: 110,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),

  v({
    id: 'pepper-habanero-helios',
    commonName: 'Habanero Helios',
    chili: 'habanero_helios',
    motherSpecies: 'Habanero',
    color: 'orange',
    shu: 200000,
    flavor: 'Ávaxtaríkt, sítrus, klassísk habanero',
    origin: 'Norðlægt hybrid — fyrir kaldari loftslag',
    daysToGerminate: [10, 21],
    daysToHarvest: [90, 110],
    notes:
      'Snemmari og afkastameiri en venjuleg Habanero. Tilvalin í 19°C umhverfi með LED — sérstaklega ræktuð fyrir Norður-Evrópu.',
    matureHeightCm: 100,
    suitableLocations: ['tent', 'shower', 'diy', 'window'],
  }),
  v({
    id: 'pepper-habanero-orange',
    commonName: 'Habanero Orange',
    chili: 'habanero_orange',
    motherSpecies: 'Habanero',
    color: 'orange',
    shu: 200000,
    flavor: 'Klassík, ávaxtaríkt, sítrus',
    origin: 'Yucatán — víða ræktuð',
    daysToGerminate: [10, 21],
    daysToHarvest: [90, 110],
    notes: 'Áreiðanleg uppskera, gott baseline afbrigði.',
    matureHeightCm: 110,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-habanero-red',
    commonName: 'Habanero Red Savina',
    chili: 'habanero_red',
    motherSpecies: 'Habanero',
    color: 'red',
    shu: 500000,
    flavor: 'Dýpri, smoky, ávaxtaríkt',
    origin: 'Walberg, Kalifornía',
    daysToGerminate: [14, 28],
    daysToHarvest: [100, 120],
    notes: 'Var heimsmethafi 1994–2006. Áreiðanleg framleiðsla.',
    matureHeightCm: 110,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-habanero-chocolate',
    commonName: 'Habanero Chocolate',
    chili: 'habanero_chocolate',
    motherSpecies: 'Habanero',
    color: 'chocolate',
    shu: 425000,
    flavor: 'Moldarkenndur, sætur, jarðbundinn',
    origin: 'Jamaíka',
    daysToGerminate: [14, 28],
    daysToHarvest: [110, 130],
    notes: 'Frábær í muscovado/molasses sósur.',
    matureHeightCm: 110,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-habanero-mustard',
    commonName: 'Mustard Habanero',
    chili: 'habanero_mustard',
    motherSpecies: 'Habanero',
    color: 'mustard',
    shu: 200000,
    flavor: 'Sinneps-blær, citrus',
    origin: 'Yucatán heirloom',
    daysToGerminate: [10, 21],
    daysToHarvest: [95, 115],
    notes: 'Sjaldgæfari litur, glæsileg planta.',
    matureHeightCm: 100,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-habanero-peach',
    commonName: 'Peach Habanero',
    chili: 'habanero_peach',
    motherSpecies: 'Habanero',
    color: 'peach',
    shu: 200000,
    flavor: 'Sætur, ferskja, blómaríkt',
    origin: 'USA',
    daysToGerminate: [10, 21],
    daysToHarvest: [95, 115],
    notes: 'Sætasta habanero-afbrigðið.',
    matureHeightCm: 100,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-habanero-white',
    commonName: 'White Habanero',
    chili: 'habanero_white',
    motherSpecies: 'Habanero',
    color: 'white',
    shu: 150000,
    flavor: 'Mildur, blómaríkt — sjaldgæft',
    origin: 'Perú',
    daysToGerminate: [21, 35],
    daysToHarvest: [120, 140],
    notes: 'Hægvaxin og krefjandi. Falleg sjaldgæf planta.',
    matureHeightCm: 80,
    suitableLocations: ['tent', 'shower'],
  }),

  v({
    id: 'pepper-bhut-red',
    commonName: 'Bhut Jolokia Red',
    chili: 'ghost',
    motherSpecies: 'Bhut Jolokia',
    color: 'red',
    shu: 1041427,
    flavor: 'Ávaxtaríkt, smoky — klassískt ghost',
    origin: 'Norðaustur-Indland (Assam, Nagaland)',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes: 'Sterkasta pipra heims 2007. Þarfnast tjalds eða svipaðs umhverfis.',
    matureHeightCm: 130,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-bhut-jolokia-chocolate',
    commonName: 'Bhut Jolokia Chocolate',
    chili: 'ghost_chocolate',
    motherSpecies: 'Bhut Jolokia',
    color: 'chocolate',
    shu: 900000,
    flavor: 'Súkkulaði, rúsínu, dökk sæta',
    origin: 'Norðaustur-Indland',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes:
      'Aðeins mildari en rauð Bhut. Passar einstaklega vel í sósur með muscovado eða molasses tónum.',
    matureHeightCm: 130,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-bhut-peach',
    commonName: 'Bhut Jolokia Peach',
    chili: 'ghost_peach',
    motherSpecies: 'Bhut Jolokia',
    color: 'peach',
    shu: 800000,
    flavor: 'Sætur, blómaríkt',
    origin: 'Indland / USA stable',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes: 'Sætasta Bhut afbrigðið.',
    matureHeightCm: 120,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-bhut-yellow',
    commonName: 'Bhut Jolokia Yellow',
    chili: 'ghost_yellow',
    motherSpecies: 'Bhut Jolokia',
    color: 'yellow',
    shu: 900000,
    flavor: 'Citrus, mango',
    origin: 'Indland',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes: 'Skemmtileg sjónræn andstæða við rauðan Bhut.',
    matureHeightCm: 120,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-bhut-white',
    commonName: 'White Bhut Jolokia',
    chili: 'ghost_white',
    motherSpecies: 'Bhut Jolokia',
    color: 'white',
    shu: 700000,
    flavor: 'Léttur — mildari en aðrir Bhut',
    origin: 'Indland',
    daysToGerminate: [21, 35],
    daysToHarvest: [130, 160],
    notes: 'Hægvaxin, sjaldgæft. Þolir verra en aðrir Bhut.',
    matureHeightCm: 100,
    suitableLocations: ['tent', 'shower'],
  }),

  v({
    id: 'pepper-7-pot-primo',
    commonName: '7 Pot Primo',
    chili: 'primo',
    motherSpecies: '7 Pot',
    color: 'red',
    shu: 1470000,
    flavor: 'Sætt, blómaríkt, sítrus undirtónn',
    origin: 'Troy Primeaux, Louisiana — kross 7 Pot × Naga Morich',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes:
      'Þekkt fyrir „scorpion tail" — mjög falleg planta og ávextir. Sætasta 7 Pot afbrigðið.',
    matureHeightCm: 140,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-7-pot-primo-yellow',
    commonName: '7 Pot Primo Yellow',
    chili: 'primo_yellow',
    motherSpecies: '7 Pot',
    color: 'yellow',
    shu: 1200000,
    flavor: 'Skarpt, sítrus, ananas',
    origin: 'Troy Primeaux selection',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes: 'Sjaldgæfari litur, samt mjög sterk.',
    matureHeightCm: 130,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-7-pot-douglah',
    commonName: '7 Pot Douglah',
    chili: 'douglah',
    motherSpecies: '7 Pot',
    color: 'chocolate',
    shu: 1853936,
    flavor: 'Hnetukennt, kaffi, jarðbundið',
    origin: 'Trínidad',
    daysToGerminate: [14, 28],
    daysToHarvest: [130, 160],
    notes: 'Eitt allra sterkasta — chocolate undirtegund.',
    matureHeightCm: 130,
    suitableLocations: ['tent', 'shower'],
  }),

  v({
    id: 'pepper-scorpion-moruga',
    commonName: 'Trinidad Moruga Scorpion',
    chili: 'scorpion',
    motherSpecies: 'Trinidad Scorpion',
    color: 'red',
    shu: 2009231,
    flavor: 'Sætt, ávaxtaríkt — fljót brennsla',
    origin: 'Moruga, Trínidad',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes: 'Var sterkasta pipra heims 2012.',
    matureHeightCm: 140,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-scorpion-butch-t',
    commonName: 'Trinidad Butch T Scorpion',
    chili: 'scorpion',
    motherSpecies: 'Trinidad Scorpion',
    color: 'red',
    shu: 1463700,
    flavor: 'Skarpt, ávaxtaríkt, slow burn',
    origin: 'Butch Taylor, Mississippi',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes: 'Var sterkasta 2011. Falleg „scorpion tail".',
    matureHeightCm: 130,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-scorpion-yellow',
    commonName: 'Yellow Moruga Scorpion',
    chili: 'scorpion_yellow',
    motherSpecies: 'Trinidad Scorpion',
    color: 'yellow',
    shu: 1200000,
    flavor: 'Sítrus, mango',
    origin: 'Trínidad',
    daysToGerminate: [14, 28],
    daysToHarvest: [125, 150],
    notes: 'Sætari en rauð Moruga.',
    matureHeightCm: 130,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-scorpion-chocolate',
    commonName: 'Chocolate Scorpion',
    chili: 'scorpion_chocolate',
    motherSpecies: 'Trinidad Scorpion',
    color: 'chocolate',
    shu: 1500000,
    flavor: 'Hnetukennt, dökkt karamel',
    origin: 'Trínidad',
    daysToGerminate: [14, 28],
    daysToHarvest: [125, 155],
    notes: 'Sjaldgæft, mjög sterkt.',
    matureHeightCm: 130,
    suitableLocations: ['tent', 'shower'],
  }),

  v({
    id: 'pepper-carolina-reaper',
    commonName: 'Carolina Reaper',
    chili: 'reaper',
    motherSpecies: 'Carolina Reaper',
    color: 'red',
    shu: 1640000,
    flavor: 'Ávaxtaríkt, kirsuber, mikill hiti',
    origin: 'Ed Currie, PuckerButt Pepper Co., S-Karólína',
    daysToGerminate: [14, 28],
    daysToHarvest: [120, 150],
    notes:
      'Þarfnast 27–32°C jarðvegshita við spírun. Frjóvga með hendi innandyra. Toppa við 15 cm hæð fyrir meiri uppskeru.',
    matureHeightCm: 130,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-reaper-yellow',
    commonName: 'Yellow Carolina Reaper',
    chili: 'reaper_yellow',
    motherSpecies: 'Carolina Reaper',
    color: 'yellow',
    shu: 1500000,
    flavor: 'Sítrónu og ávaxtaríkt',
    origin: 'PuckerButt — sérvalin',
    daysToGerminate: [14, 28],
    daysToHarvest: [125, 155],
    notes: 'Sjaldgæft yellow afbrigði.',
    matureHeightCm: 130,
    suitableLocations: ['tent', 'shower'],
  }),
  v({
    id: 'pepper-reaper-chocolate',
    commonName: 'Chocolate Carolina Reaper',
    chili: 'reaper_chocolate',
    motherSpecies: 'Carolina Reaper',
    color: 'chocolate',
    shu: 1700000,
    flavor: 'Dökkt, súkkulaði, smoky',
    origin: 'PuckerButt selection',
    daysToGerminate: [14, 28],
    daysToHarvest: [130, 160],
    notes: 'Eitt sterkasta súkkulaði-afbrigðið.',
    matureHeightCm: 130,
    suitableLocations: ['tent', 'shower'],
  }),

  v({
    id: 'pepper-aji-amarillo',
    commonName: 'Ají Amarillo',
    scientificName: 'Capsicum baccatum',
    chili: 'aji_amarillo',
    motherSpecies: 'Ají',
    color: 'orange',
    shu: 50000,
    flavor: 'Sætur, ávaxtaríkt — perúskt eldhús',
    origin: 'Perú',
    daysToGerminate: [10, 21],
    daysToHarvest: [100, 130],
    notes: 'Klassík í perúskri matargerð.',
    matureHeightCm: 120,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-aji-limon',
    commonName: 'Ají Limón',
    scientificName: 'Capsicum baccatum',
    chili: 'aji_limon',
    motherSpecies: 'Ají',
    color: 'yellow',
    shu: 30000,
    flavor: 'Sítrónulykt og bragð',
    origin: 'Perú',
    daysToGerminate: [10, 21],
    daysToHarvest: [95, 120],
    notes: 'Skemmtilegur sítrónu-snerting í sósum.',
    matureHeightCm: 100,
    suitableLocations: ['tent', 'shower', 'diy'],
  }),
  v({
    id: 'pepper-aji-charapita',
    commonName: 'Ají Charapita',
    scientificName: 'Capsicum chinense',
    chili: 'aji_charapita',
    motherSpecies: 'Ají',
    color: 'yellow',
    shu: 80000,
    flavor: 'Mjög ávaxtarík, blómaríkt',
    origin: 'Perúska Amazon',
    daysToGerminate: [14, 28],
    daysToHarvest: [110, 140],
    notes:
      'Smáir ávextir — gríðarleg framleiðsla. „Móðir allra pipra" í Perú.',
    matureHeightCm: 90,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
  }),
];

/**
 * Steinunn — Icelandic heritage dwarf tomato. The whole care guide below is
 * distilled from "Growing Steinunn — Iceland Summer Edition".
 */
const STEINUNN: TomatoVariety = {
  id: 'tomato-steinunn',
  commonName: 'Steinunn',
  scientificName: 'Solanum lycopersicum',
  category: 'tomato',
  isBuiltIn: true,
  glyph: 'steinunn',
  fruitColor: 'red',
  growthHabit: 'determinate',
  fruitWeightG: 50,
  fruitShape: 'Hjartalaga',
  flavor: 'Sæt, hjartalaga aldin — frábær í salöt',
  origin: 'Íslenskt erfðayrki (heritage)',
  daysToGerminate: [6, 12],
  daysToHarvest: [60, 85],
  matureHeightCm: 45,
  suitableLocations: ['window', 'tent', 'diy'],
  notes:
    'Íslenskt dvergyrki með hjartalaga aldin og hrukkótt (rugose) blöð. Kuldaþolið og þrífst í NV-glugga undir íslenskri sumarbirtu — engin gróðurljós þörf maí–ágúst.',
  care: {
    summary:
      'Ákveðinn (determinate) dvergvöxtur, 30–60 cm. Hjartalaga 50 g aldin, hrukkótt blöð og kuldaþol. Hannað fyrir NV-glugga í íslensku sumri.',
    targets: [
      { label: 'Ljós (sumar)', value: 'Dagsbirta 16–21 klst', hint: 'NV-gluggi fær kvöldsól jún–ágú' },
      { label: 'Ljós (vetur)', value: 'LED 14–16 klst', hint: 'Nóv/des: aðeins 4–6 klst dagsbirta' },
      { label: 'Hiti', value: 'Dagur 18–24°C · Nótt 15–21°C', hint: 'Íslensk gen þola kaldar nætur' },
      { label: 'Lágmarkshiti', value: '10°C', hint: 'Þolir betur en flestir tómatar' },
      { label: 'Raki', value: '40–70%', hint: 'Kemur í veg fyrir að blóm detti' },
      { label: 'Pottur', value: '5–7 L', hint: 'Núverandi pottur dugar í bili' },
      { label: 'Sýrustig (pH)', value: '6,2–6,8', hint: 'Létt súrt — betri næringarupptaka' },
      { label: 'Áburður', value: 'Lágt N, hátt P-K', hint: 'NPK ~5-10-10 á blóma/aldinfasa' },
    ],
    watering: [
      'Fingurpróf á hverjum morgni: stingdu fingri 2–3 cm í moldina. Sé hún þurr, vökvaðu þar til rennur úr botni.',
      'Vökvaðu að morgni svo blöðin þorni yfir daginn.',
      'Vatn beint á moldina — forðastu að bleyta blöðin.',
      'Jöfn vökvun er lykilatriði — óregla veldur kálbotnsfúa (blossom end rot) og sprungum.',
      '5–7 L pottur: vökva á 2–3 daga fresti. Lítill uppeldispottur: daglega (stundum tvisvar í hita).',
    ],
    pollination: [
      'Engar býflugur innandyra — þú ert frjóvgarinn. Sleppir þú þessu detta blómin án þess að mynda aldin.',
      'Rafmagnstannbursti: snertu blaðstöngul eða bakhlið blóms í 2–3 sek. Hermir eftir suði býflugu (buzz pollination).',
      'Frjóvgaðu kl. 10–16 þegar blómin eru opin, á 2–3 daga fresti.',
      'Opnaðu botngluggann í 10–15 mín á lygnum, hlýjum dögum (12°C+) — gusturinn hristir frjókorn líkt og hunangsfluga.',
      'Merki um árangur: blómið visnar og lítil græn kúla (aldinvísir) myndast við blómbotninn.',
    ],
    fertilizer: [
      { stage: 'Blómgun (núna)', npk: '5-10-10 eða 4-6-8', freq: 'Á 10–14 daga fresti', note: 'Lágt köfnunarefni, hátt fosfór og kalí' },
      { stage: 'Aldinþroski', npk: '5-10-10 / tómata-áburður', freq: 'Á 10–14 daga fresti', note: 'Haltu áfram þar til fyrstu aldin þroskast' },
      { stage: 'Fullþroski', npk: '3-6-9 eða þangþykkni', freq: 'Á 14 daga fresti', note: 'Minnka — plantan einbeitir sér að þroska' },
    ],
    troubleshooting: [
      { problem: 'Gulnandi neðri blöð', cause: 'Ofvökvun eða næringarskortur', fix: 'Athugaðu frárennsli, minnka vökvun, gefa áburð' },
      { problem: 'Blóm detta án aldins', cause: 'Léleg frjóvgun', fix: 'Frjóvgaðu daglega með rafmagnstannbursta' },
      { problem: 'Svört dæld á botni aldins', cause: 'Kálbotnsfúi (óregluleg vökvun)', fix: 'Vökvaðu jafnt — haltu stöðugum raka' },
      { problem: 'Blöð krullast upp', cause: 'Hitastreita eða undirvökvun', fix: 'Athugaðu hita, auktu vökvun' },
      { problem: 'Aldin springa', cause: 'Skyndileg vatnsupptaka', fix: 'Vökvaðu jafnt, tíndu örlítið fyrr' },
      { problem: 'Litlar svartar flugur í mold', cause: 'Sveppamý (ofvökvun)', fix: 'Láttu moldina þorna milli vökvana' },
    ],
    normal: [
      'Hrukkótt (rugose) blöð — eðlileg áferð yrkisins, ekki sjúkdómur.',
      'Létt slapp síðdegis sem jafnar sig um kvöld — hitasvörun.',
      'Neðstu blöð gulna með aldri — fjarlægðu þau einfaldlega.',
    ],
    concern: [
      'Öll blöð gulna samtímis — líklega ofvökvun eða næringarskortur.',
      'Blóm detta án aldins — frjóvgunarvandi, bregðast þarf hratt við.',
      'Brúnir eða svartir blettir á blöðum — mögulegur sveppasjúkdómur.',
    ],
  },
};

/**
 * Day-neutral strawberry care — distilled from the Icelandic indoor-strawberry
 * guide. Day-neutrals flower on a temperature cue (not photoperiod), so they
 * fruit year-round indoors under LED, which is why they're the recommended type
 * for Iceland. The summary is variety-specific; everything else is shared.
 */
function dayNeutralCare(summary: string): CropCare {
  return {
    summary,
    targets: [
      { label: 'Ljós (vöxtur)', value: 'LED 16–18 klst', hint: 'Dagshlutlaust yrki — ljóslota stýrir vexti, ekki blómgun' },
      { label: 'Ljós (aldin)', value: 'LED 12–14 klst · PPFD 250–400', hint: 'Of mikið ljós (>500 PPFD) brennir blöðin' },
      { label: 'Hiti', value: 'Dagur 18–24°C · Nótt 12–18°C', hint: 'Yfir 27°C fella blómin frjókorn' },
      { label: 'Raki', value: '60–70% á aldinfasa', hint: 'Yfir 70% → grámygla (botrytis)' },
      { label: 'Sýrustig (pH)', value: '5,8–6,2', hint: 'Næringarlæsing utan 5,5–6,5' },
      { label: 'Leiðni (EC)', value: '1,4–2,0 mS/cm', hint: 'Veg 1,2–1,5 · aldin 1,5–2,0' },
      { label: 'Áburður', value: 'Lágt N, hátt K', hint: 'NPK-hlutfall ~1-0,5-2 á aldinfasa' },
      { label: 'Króna', value: 'Í yfirborði moldar', hint: 'Of djúpt → krónufúi; of grunnt → rætur þorna' },
    ],
    watering: [
      'Vökvaðu þegar efsti 1 cm moldar er þurr — jarðarber þola hvorki þurrk né vatnselg.',
      'Haltu jöfnum raka á aldinfasa; sveiflur gefa lítil, bragðdauf ber.',
      'Vökvaðu beint á moldina, ekki á blöð eða ber — bleyta á aldinum kallar á grámyglu.',
      'Í vatnsrækt: skiptu um næringarlausn á 1–2 vikna fresti og fylltu á daglega (~20–30% upptaka).',
    ],
    pollination: [
      'Hvert blóm hefur 200–400 frævur — allar þurfa frjókorn, annars verður berið skakkt eða „kattarandlit".',
      'Strjúktu blómhjartað mjúklega með pensli eða bómullarpinna á 1–2 daga fresti meðan blómin standa.',
      'Láttu litla viftu blása yfir plönturnar á ljóstíma — stöðug hreyfing dreifir frjókornum.',
      'Frjóvgaðu um miðjan dag þegar blómin eru full opin; best við 18–24°C og 60–70% raka.',
    ],
    fertilizer: [
      { stage: 'Vöxtur (veg)', npk: '1-0,5-1,5 (t.d. 8-4-12)', freq: 'Á 1–2 vikna fresti', note: 'Hóflegt N meðan blöð byggjast upp' },
      { stage: 'Blómgun', npk: '1-0,5-2', freq: 'Á 1–2 vikna fresti', note: 'Auka kalí (K) fyrir blóm og aldin' },
      { stage: 'Aldinþroski', npk: 'Hátt K (~250–300 ppm K)', freq: 'Vikulega, þynnt', note: 'Kalí gefur sætari, þéttari ber' },
    ],
    troubleshooting: [
      { problem: 'Lítil, skökk ber', cause: 'Ófullnægjandi frjóvgun', fix: 'Strjúktu blómin daglega með pensli og bættu loftflæði' },
      { problem: 'Grá mygla á blómum eða berjum', cause: 'Raki yfir 70% og kyrrt loft', fix: 'Lækkaðu raka undir 70%, auktu loftflæði, fjarlægðu sýkt ber' },
      { problem: 'Engin blóm', cause: 'Of mikið köfnunarefni eða of lítil birta', fix: 'Minnka N, auka ljós (PPFD 250+)' },
      { problem: 'Bragðdauf eða súr ber', cause: 'Of lítil birta eða ofvökvun', fix: 'Haltu PPFD ≥250 á aldinfasa, leyfðu moldinni að þorna örlítið' },
      { problem: 'Brúnir blaðjaðrar', cause: 'Lágur raki eða of há leiðni (EC)', fix: 'Auka raka, athuga EC' },
      { problem: 'Köngulóarmítlar (fínn vefur undir blöðum)', cause: 'Hlýtt og þurrt (<60% raki)', fix: 'Haltu raka yfir 60%, úðaðu með neem' },
    ],
    normal: [
      'Plantan rekur út renglur (rennur) — eðlilegt; klíptu þær af til að beina orku í ber.',
      'Elstu blöðin gulna og deyja smám saman — fjarlægðu þau.',
      'Fyrstu berin geta verið smá; uppskeran stækkar þegar plantan styrkist.',
    ],
    concern: [
      'Króna verður mjúk og brún — krónufúi af ofvökvun eða lélegu frárennsli.',
      'Blóm visna og detta í hita — yfir 27°C fellir frjókorn.',
      'Hvít, duftkennd áfelling á blöðum — mjöldögg; bættu loftflæði.',
    ],
  };
}

/** Alpine (Fragaria vesca) care — tolerates lower light, makes no runners. */
const ALPINE_CARE: CropCare = {
  ...dayNeutralCare(
    'Villt skógarjarðarber (Fragaria vesca). Smá, ákaflega bragðmikil ber í sífellu. Þolir minni birtu en stóru yrkin og myndar engar renglur — tilvalið á gluggakistu.',
  ),
  targets: [
    { label: 'Ljós', value: 'LED 12–16 klst', hint: 'Þolir minni birtu en stór yrki — hentar gluggakistu' },
    { label: 'Hiti', value: 'Dagur 18–24°C · Nótt 12–18°C', hint: 'Harðgert — þolir kaldari nætur' },
    { label: 'Raki', value: '60–70%', hint: 'Yfir 70% → grámygla' },
    { label: 'Sýrustig (pH)', value: '5,8–6,2', hint: 'Létt súrt' },
    { label: 'Áburður', value: 'Vægt, hátt K', hint: 'Þarf minna en stóru yrkin' },
    { label: 'Króna', value: 'Í yfirborði moldar', hint: 'Fjölgað með skiptingu krónu, ekki renglum' },
  ],
  normal: [
    'Myndar engar renglur — fjölgað með því að skipta krónunni.',
    'Berin eru smá (1–2 g) en sætari og ilmmeiri en stór yrki.',
    'Elstu blöðin gulna með aldri — fjarlægðu þau.',
  ],
};

interface SInput {
  id: string;
  commonName: string;
  glyph: StrawberryGlyph;
  berryType: StrawberryType;
  fruitColor: PepperColor;
  fruitWeightG: number;
  flavor: string;
  origin: string;
  daysToGerminate: [number, number];
  daysToHarvest: [number, number];
  notes: string;
  matureHeightCm: number;
  suitableLocations: LocationKey[];
  care: CropCare;
  scientificName?: string;
}

function s(input: SInput): StrawberryVariety {
  return {
    id: input.id,
    commonName: input.commonName,
    scientificName: input.scientificName ?? 'Fragaria × ananassa',
    category: 'strawberry',
    glyph: input.glyph,
    berryType: input.berryType,
    fruitColor: input.fruitColor,
    fruitWeightG: input.fruitWeightG,
    flavor: input.flavor,
    origin: input.origin,
    daysToGerminate: input.daysToGerminate,
    daysToHarvest: input.daysToHarvest,
    notes: input.notes,
    isBuiltIn: true,
    matureHeightCm: input.matureHeightCm,
    suitableLocations: input.suitableLocations,
    care: input.care,
  };
}

const STRAWBERRIES: StrawberryVariety[] = [
  s({
    id: 'strawberry-albion',
    commonName: 'Albion',
    glyph: 'classic',
    berryType: 'day-neutral',
    fruitColor: 'red',
    fruitWeightG: 25,
    flavor: 'Sætt, ríkt — viðmiðunaryrki í gróðurhúsum',
    origin: 'Kalifornía (UC Davis)',
    daysToGerminate: [14, 28],
    daysToHarvest: [56, 84],
    notes:
      'Dagshlutlaust stóryrki sem ber stór, þétt ber nánast allt árið undir LED. Sjúkdómsþolið og afkastamikið — besta byrjunaryrkið innandyra.',
    matureHeightCm: 30,
    suitableLocations: ['window', 'tent', 'diy'],
    care: dayNeutralCare(
      'Dagshlutlaust (day-neutral) stóryrki. Stór, þétt og sæt ber í sífellu undir LED. Sjúkdómsþolið og áreiðanlegt — viðmiðunaryrki fyrir inniræktun á Íslandi.',
    ),
  }),
  s({
    id: 'strawberry-seascape',
    commonName: 'Seascape',
    glyph: 'classic',
    berryType: 'day-neutral',
    fruitColor: 'red',
    fruitWeightG: 22,
    flavor: 'Sætt og ilmandi',
    origin: 'Kalifornía',
    daysToGerminate: [14, 28],
    daysToHarvest: [56, 84],
    notes:
      'Dagshlutlaust yrki, snemmbært og gjöfult. Myndar góðar renglur og hentar vel í vatnsrækt.',
    matureHeightCm: 28,
    suitableLocations: ['window', 'tent', 'diy'],
    care: dayNeutralCare(
      'Dagshlutlaust yrki — snemmbært, ilmandi og gjöfult. Gefur góðar renglur og þrífst vel í vatnsrækt jafnt sem mold.',
    ),
  }),
  s({
    id: 'strawberry-san-andreas',
    commonName: 'San Andreas',
    glyph: 'classic',
    berryType: 'day-neutral',
    fruitColor: 'red',
    fruitWeightG: 28,
    flavor: 'Frábært bragð, stór ber',
    origin: 'Kalifornía',
    daysToGerminate: [14, 28],
    daysToHarvest: [56, 84],
    notes:
      'Arftaki Albion — stærri og enn þéttari ber. Mjög sjúkdómsþolið og gjöfult dagshlutlaust yrki.',
    matureHeightCm: 30,
    suitableLocations: ['window', 'tent', 'diy'],
    care: dayNeutralCare(
      'Dagshlutlaust yrki — arftaki Albion með stærri, mjög þétt ber og frábært bragð. Sjúkdómsþolið og afkastamikið.',
    ),
  }),
  s({
    id: 'strawberry-monterey',
    commonName: 'Monterey',
    glyph: 'classic',
    berryType: 'day-neutral',
    fruitColor: 'red',
    fruitWeightG: 26,
    flavor: 'Sætt með mildri sýru',
    origin: 'Kalifornía',
    daysToGerminate: [14, 28],
    daysToHarvest: [56, 84],
    notes:
      'Dagshlutlaust yrki með langt geymsluþol og mikla uppskeru. Vinsælt í atvinnuræktun.',
    matureHeightCm: 30,
    suitableLocations: ['window', 'tent', 'diy'],
    care: dayNeutralCare(
      'Dagshlutlaust yrki — sætt með mildri sýru, langt geymsluþol og mikil uppskera. Vinsælt í atvinnuræktun.',
    ),
  }),
  s({
    id: 'strawberry-alexandria',
    commonName: 'Alexandria',
    scientificName: 'Fragaria vesca',
    glyph: 'alpine',
    berryType: 'alpine',
    fruitColor: 'red',
    fruitWeightG: 2,
    flavor: 'Ákaflega ilmandi, sæt smá ber',
    origin: 'Evrópa — alpa-/skógarjarðarber',
    daysToGerminate: [14, 28],
    daysToHarvest: [84, 120],
    notes:
      'Villt skógarjarðarber — smá en ákaflega bragðmikil ber í sífellu. Myndar engar renglur, þolir minni birtu og hentar fullkomlega á gluggakistu.',
    matureHeightCm: 20,
    suitableLocations: ['window', 'tent', 'diy'],
    care: ALPINE_CARE,
  }),
];

/**
 * Generic indoor-tomato care — distilled from the Icelandic indoor-tomato guide.
 * Shared by the international catalog below; Steinunn keeps its own bespoke sheet
 * (cold-hardy, no-LED-in-summer) because its whole point is the Iceland edge.
 */
function indoorTomatoCare(summary: string): CropCare {
  return {
    summary,
    targets: [
      { label: 'Ljós (vöxtur)', value: 'LED 16–18 klst', hint: 'PPFD 400–600 á vegfasa' },
      { label: 'Ljós (aldin)', value: 'LED 12–14 klst', hint: 'Meiri styrkur á aldinfasa (PPFD 600+)' },
      { label: 'Hiti', value: 'Dagur 21–27°C · Nótt 15–18°C', hint: 'Blómgun stöðvast undir 13°C' },
      { label: 'Lágmarkshiti', value: '10°C', hint: 'Kuldaskemmd neðar' },
      { label: 'Raki', value: '50–60% á aldinfasa', hint: 'Hærra á ungplöntu (60–70%)' },
      { label: 'Sýrustig (pH)', value: '6,0–6,8', hint: 'Létt súrt — betri næringarupptaka' },
      { label: 'Leiðni (EC)', value: '1,8–3,0 mS/cm', hint: 'Veg 1,8–2,4 · aldin 2,0–3,0' },
      { label: 'Áburður', value: 'Lágt N, hátt P-K á aldinfasa', hint: 'NPK ~10-10-20' },
      { label: 'Pottur', value: '10–30 L', hint: 'Dvergyrki 10–15 L · há yrki 20–30 L' },
    ],
    watering: [
      'Leyfðu efstu 2–3 cm moldar að þorna; fingurpróf í 3–5 cm dýpt áður en þú vökvar.',
      'Vökvaðu þar til rennur úr botni og hentu afrennsli — ekki láta pottinn standa í vatni.',
      'Jöfn vökvun er lykill — sveiflur valda kálbotnsfúa (BER) og sprungum í aldinum.',
      'Vökvaðu að morgni beint á moldina, ekki á blöðin.',
    ],
    pollination: [
      'Engar býflugur innandyra — tómatablóm þurfa hjálp við aldinsetningu.',
      'Hristu blómklasann eða snertu hann með rafmagnstannbursta í 1–2 sek um miðjan morgun.',
      'Frjóvgaðu daglega meðan blómin standa; best við 21–27°C og 40–80% raka.',
      'Vifta sem blæs vægt yfir plönturnar hjálpar einnig til við frjóvgun.',
    ],
    fertilizer: [
      { stage: 'Ungplanta', npk: '10-10-10 (½ styrkur)', freq: 'Á 2 vikna fresti', note: 'Vægt meðan rætur byggjast upp' },
      { stage: 'Vöxtur (veg)', npk: '20-10-10', freq: 'Á 2 vikna fresti', note: 'Meira köfnunarefni fyrir blaðvöxt' },
      { stage: 'Blómgun', npk: '5-10-10', freq: 'Á 2 vikna fresti', note: 'Minnka N, auka fosfór og kalí' },
      { stage: 'Aldinþroski', npk: '10-10-20 / tómata-áburður', freq: 'Á 1–2 vikna fresti', note: 'Hátt kalí fyrir aldin' },
    ],
    troubleshooting: [
      { problem: 'Blóm detta án aldins', cause: 'Hiti yfir 32°C eða undir 13°C, eða léleg frjóvgun', fix: 'Haltu 15–27°C og frjóvgaðu daglega' },
      { problem: 'Svört dæld á botni aldins', cause: 'Kálbotnsfúi — kalkflutningur við óreglulega vökvun', fix: 'Vökvaðu jafnt og athugaðu pH' },
      { problem: 'Aldin springa', cause: 'Skyndileg vatnsupptaka eftir þurrk', fix: 'Vökvaðu jafnt, tíndu örlítið fyrr' },
      { problem: 'Renglulegar ungplöntur', cause: 'Of lítil birta', fix: 'Lækkaðu ljósið í 15–20 cm og auktu styrk' },
      { problem: 'Gulnandi neðri blöð', cause: 'Köfnunarefnisskortur eða ofvökvun', fix: 'Athugaðu raka, gefðu áburð' },
      { problem: 'Hvít, duftkennd áfelling', cause: 'Mjöldögg — hár raki og lélegt loftflæði', fix: 'Bættu loftflæði, lækkaðu raka' },
    ],
    normal: [
      'Neðstu blöð gulna með aldri — fjarlægðu þau.',
      'Hliðargreinar (suckers) vaxa í blaðöxlum — klíptu þær af óákveðnum yrkjum.',
      'Létt slapp í hita um miðjan dag sem jafnar sig á kvöldin.',
    ],
    concern: [
      'Öll blöð gulna samtímis — ofvökvun eða næringarskortur.',
      'Blóm detta í röðum — hita- eða frjóvgunarvandi.',
      'Brúnir eða svartir blettir með gulum jaðri á blöðum — mögulegur sveppasjúkdómur.',
    ],
  };
}

interface TInput {
  id: string;
  commonName: string;
  glyph: TomatoGlyph;
  fruitColor: PepperColor;
  growthHabit: 'determinate' | 'indeterminate';
  fruitWeightG: number;
  fruitShape: string;
  flavor: string;
  origin: string;
  daysToGerminate: [number, number];
  daysToHarvest: [number, number];
  notes: string;
  matureHeightCm: number;
  suitableLocations: LocationKey[];
  care: CropCare;
}

function t(input: TInput): TomatoVariety {
  return {
    id: input.id,
    commonName: input.commonName,
    scientificName: 'Solanum lycopersicum',
    category: 'tomato',
    glyph: input.glyph,
    fruitColor: input.fruitColor,
    growthHabit: input.growthHabit,
    fruitWeightG: input.fruitWeightG,
    fruitShape: input.fruitShape,
    flavor: input.flavor,
    origin: input.origin,
    daysToGerminate: input.daysToGerminate,
    daysToHarvest: input.daysToHarvest,
    notes: input.notes,
    isBuiltIn: true,
    matureHeightCm: input.matureHeightCm,
    suitableLocations: input.suitableLocations,
    care: input.care,
  };
}

/**
 * International indoor-tomato catalog, distilled from the Iceland indoor-tomato
 * guide. Emphasis on compact/dwarf and cherry types that suit a windowsill or a
 * small tent under LED. Steinunn remains the Icelandic heritage option.
 */
const TOMATOES: TomatoVariety[] = [
  t({
    id: 'tomato-sungold',
    commonName: 'Sungold',
    glyph: 'cherry_gold',
    fruitColor: 'orange',
    growthHabit: 'indeterminate',
    fruitWeightG: 15,
    fruitShape: 'Kirsuber',
    flavor: 'Mjög sætt, ávaxtaríkt — gyllt',
    origin: 'Japan (F1 blendingur)',
    daysToGerminate: [6, 12],
    daysToHarvest: [57, 65],
    notes:
      'Sætasta kirsuberjayrkið — gullin-appelsínugul ber í löngum klösum. Óákveðið og hávaxið; þarf stuðning. Þunn húð springur ef vökvun er óregluleg.',
    matureHeightCm: 90,
    suitableLocations: ['window', 'tent', 'shower', 'diy'],
    care: indoorTomatoCare(
      'Óákveðið (indeterminate) kirsuberjayrki — ákaflega sæt, gyllt ber í sífellu. Hávaxið, þarf uppbindingu og jafna vökvun (annars springa berin).',
    ),
  }),
  t({
    id: 'tomato-sweet-million',
    commonName: 'Sweet Million',
    glyph: 'cherry_red',
    fruitColor: 'red',
    growthHabit: 'indeterminate',
    fruitWeightG: 12,
    fruitShape: 'Kirsuber',
    flavor: 'Sætt, klassískt kirsuber',
    origin: 'Bætt útgáfa af Sweet 100',
    daysToGerminate: [6, 12],
    daysToHarvest: [60, 70],
    notes:
      'Gríðarlega afkastamikið — hundruð smárra rauðra berja í stórum klösum. Sjúkdómsþolið og sprunguþolnara en mörg kirsuberjayrki.',
    matureHeightCm: 160,
    suitableLocations: ['tent', 'shower', 'diy'],
    care: indoorTomatoCare(
      'Óákveðið kirsuberjayrki — afar gjöfult, sprunguþolið og sjúkdómsþolið. Hávaxið; gefðu því hátt uppbindingarkerfi.',
    ),
  }),
  t({
    id: 'tomato-black-cherry',
    commonName: 'Black Cherry',
    glyph: 'cherry_black',
    fruitColor: 'purple',
    growthHabit: 'indeterminate',
    fruitWeightG: 18,
    fruitShape: 'Kirsuber',
    flavor: 'Djúpt, ríkt, „smoky" sæta',
    origin: 'Heirloom (USA)',
    daysToGerminate: [6, 14],
    daysToHarvest: [64, 75],
    notes:
      'Dökkfjólublá/brún kirsuber með djúpu, flóknu bragði. Hávaxið heirloom-yrki sem þarf gott pláss og stuðning.',
    matureHeightCm: 180,
    suitableLocations: ['tent', 'shower', 'diy'],
    care: indoorTomatoCare(
      'Óákveðið heirloom-kirsuber — dökk, bragðmikil ber. Kröftugur vöxtur sem þarf rúmt pláss og trausta uppbindingu.',
    ),
  }),
  t({
    id: 'tomato-tiny-tim',
    commonName: 'Tiny Tim',
    glyph: 'round_red',
    fruitColor: 'red',
    growthHabit: 'determinate',
    fruitWeightG: 10,
    fruitShape: 'Kúlulaga',
    flavor: 'Milt, ferskt kirsuber',
    origin: 'USA — dvergyrki',
    daysToGerminate: [6, 12],
    daysToHarvest: [45, 55],
    notes:
      'Sígilt gluggakistu-dvergyrki, aðeins 30–45 cm. Mjög snemmbært og þarf lítið pláss — fullkomið fyrir litla LED-uppsetningu.',
    matureHeightCm: 38,
    suitableLocations: ['window', 'tent', 'diy'],
    care: indoorTomatoCare(
      'Ákveðið (determinate) dvergyrki, 30–45 cm — snemmbært og plásslítið. Tilvalið á gluggakistu eða í lítilli tjald-uppsetningu.',
    ),
  }),
  t({
    id: 'tomato-red-robin',
    commonName: 'Red Robin',
    glyph: 'round_red',
    fruitColor: 'red',
    growthHabit: 'determinate',
    fruitWeightG: 12,
    fruitShape: 'Kúlulaga',
    flavor: 'Milt, sætt',
    origin: 'USA — dvergyrki',
    daysToGerminate: [6, 12],
    daysToHarvest: [55, 60],
    notes:
      'Þéttvaxið dvergyrki, 25–30 cm — enn minna en Tiny Tim. Hentar í litla potta og þéttar gluggakistur.',
    matureHeightCm: 28,
    suitableLocations: ['window', 'tent', 'diy'],
    care: indoorTomatoCare(
      'Ákveðið dvergyrki, aðeins 25–30 cm — plásssparandi og snemmbært. Frábært í lítinn pott á gluggakistu.',
    ),
  }),
  t({
    id: 'tomato-roma',
    commonName: 'Roma',
    glyph: 'plum_red',
    fruitColor: 'red',
    growthHabit: 'determinate',
    fruitWeightG: 60,
    fruitShape: 'Plómulaga',
    flavor: 'Þétt hold, lítið vatn — klassísk sósutómatur',
    origin: 'Ítalía',
    daysToGerminate: [6, 12],
    daysToHarvest: [70, 80],
    notes:
      'Klassísk plómu-/sósutómatur með þéttu holdi og fáum fræjum. Ákveðið yrki sem ber stóran hluta uppskeru á svipuðum tíma — gott í sósur og þurrkun.',
    matureHeightCm: 105,
    suitableLocations: ['tent', 'shower', 'diy'],
    care: indoorTomatoCare(
      'Ákveðið plómu-/sósuyrki — þétt hold, fá fræ. Uppskeran kemur þétt saman; tilvalið í sósur og niðursuðu.',
    ),
  }),
  t({
    id: 'tomato-san-marzano',
    commonName: 'San Marzano',
    glyph: 'plum_red',
    fruitColor: 'red',
    growthHabit: 'indeterminate',
    fruitWeightG: 90,
    fruitShape: 'Plómulaga',
    flavor: 'Sætt, lágt sýrustig — gæðasósutómatur',
    origin: 'Ítalía (Napólí-svæðið)',
    daysToGerminate: [6, 12],
    daysToHarvest: [75, 90],
    notes:
      'Eftirsóttasta sósutómaturinn — löng, mjó plómuber með sætu, þéttu holdi. Óákveðið og hávaxið; þarf uppbindingu og langan vaxtartíma.',
    matureHeightCm: 135,
    suitableLocations: ['tent', 'shower', 'diy'],
    care: indoorTomatoCare(
      'Óákveðið ítalskt sósuyrki — löng, sæt plómuber. Hávaxið og seinþroska; gefðu því trausta uppbindingu og nægan tíma.',
    ),
  }),
  t({
    id: 'tomato-brandywine',
    commonName: 'Brandywine',
    glyph: 'beefsteak_pink',
    fruitColor: 'peach',
    growthHabit: 'indeterminate',
    fruitWeightG: 400,
    fruitShape: 'Beefsteak',
    flavor: 'Ríkt, fyllt — sígilt heirloom-bragð',
    origin: 'USA — heirloom (1885)',
    daysToGerminate: [7, 14],
    daysToHarvest: [80, 90],
    notes:
      'Bleikrautt beefsteak-heirloom með stór (400–700 g) aldin og rómað bragð. Krefst mestrar birtu og lengsts vaxtartíma — best í tjaldi með öflugu LED.',
    matureHeightCm: 150,
    suitableLocations: ['tent', 'shower', 'diy'],
    care: indoorTomatoCare(
      'Óákveðið beefsteak-heirloom — stór, bragðmikil aldin. Þarf mesta birtu, lengstan tíma og kröftuga uppbindingu af öllum yrkjunum hér.',
    ),
  }),
  t({
    id: 'tomato-patio-princess',
    commonName: 'Patio Princess',
    glyph: 'round_red',
    fruitColor: 'red',
    growthHabit: 'determinate',
    fruitWeightG: 70,
    fruitShape: 'Kúlulaga',
    flavor: 'Sætt, safaríkt — millistór sneiðtómatur',
    origin: 'USA — dvergyrki',
    daysToGerminate: [6, 12],
    daysToHarvest: [60, 70],
    notes:
      'Þétt dvergyrki (45–60 cm) sem ber óvænt stór, 7–10 cm sneiðtómata. Afkastamikið í potti — gott jafnvægi stærðar og uppskeru innandyra.',
    matureHeightCm: 55,
    suitableLocations: ['window', 'tent', 'diy'],
    care: indoorTomatoCare(
      'Ákveðið dvergyrki, 45–60 cm — ber millistóra sneiðtómata þrátt fyrir smæð. Afkastamikið og plássvænt í potti.',
    ),
  }),
];

/**
 * Outdoor potato care — distilled from the Icelandic outdoor-potato guide.
 * No pollination section (potatoes are grown from seed tubers); instead a
 * season-long checklist of chitting → planting → hilling → harvest.
 */
function potatoCare(summary: string): CropCare {
  return {
    summary,
    targets: [
      { label: 'Jarðvegshiti (niðursetning)', value: '7–10°C', hint: 'Settu niður seint í maí, eftir frost' },
      { label: 'Sýrustig (pH)', value: '5,0–6,0', hint: 'Lágt pH dregur úr kláðasvepp' },
      { label: 'Bil', value: '30 cm í röð · 60–75 cm milli raða', hint: 'Snemmyrki þéttar, aðalyrki gisnar' },
      { label: 'Dýpt', value: '10–15 cm', hint: 'Of grunnt → grænar kartöflur' },
      { label: 'Hreyking', value: '2× (við 15–20 og 30–40 cm)', hint: 'Mokaðu mold að stönglum' },
      { label: 'Vökvun', value: '25–35 mm/viku', hint: 'Mest á hnýðismyndun (vikur 6–10)' },
      { label: 'Áburður', value: '5-10-10 (hóflegt N)', hint: 'Of mikið N → grös, fá hnýði' },
      { label: 'Uppskera', value: 'Aðalyrki 90–120 dagar', hint: 'Eftir að grös sölna; fyrir frost' },
    ],
    watering: [
      'Jafn raki er lykilatriði — sérstaklega frá blómgun (hnýðismyndun): 30–35 mm á viku.',
      'Forðastu sveiflur þurrkur→bleyta; þær valda holum hnýðum og sprungum.',
      'Vökvaðu við rótina, ekki yfir grösin — dregur úr myglu.',
      'Dragðu úr vökvun þegar grös fara að sölna svo hýðið harðni fyrir geymslu.',
    ],
    seasonal: [
      'Mars: forspíraðu útsæði inni (ljóst, 10–15°C) þar til spírur eru 1–2 cm.',
      'Seint í maí: settu niður þegar jarðvegur er 7–10°C og frosthætta liðin.',
      'Júní: fyrsta hreyking þegar grös eru 15–20 cm.',
      'Júlí: önnur hreyking (grös 30–40 cm); nýjar kartöflur má taka eftir blómgun.',
      'Ágúst: fylgstu með kartöflumyglu í röku veðri; fjarlægðu sýkt grös.',
      'September: taktu upp aðaluppskeru fyrir fyrsta frost; láttu grös sölna fyrst.',
      'Eftir upptöku: þurrkaðu (cure) við 12–16°C í 10–14 daga fyrir geymslu.',
    ],
    fertilizer: [
      { stage: 'Niðursetning', npk: '5-10-10', freq: 'Við niðursetningu', note: 'Hóflegt N, hátt P-K' },
      { stage: 'Hreyking / blómgun', npk: 'Hliðargjöf af kalí (K)', freq: 'Við aðra hreykingu', note: 'Viðaraska eða greensand fyrir kalí' },
    ],
    troubleshooting: [
      { problem: 'Kartöflumygla (brúnir blettir, hröð sölnun)', cause: 'Svalt og rakt veður í ágúst', fix: 'Loftrými milli plantna, engin yfirvökvun, fjarlægðu sýkt grös' },
      { problem: 'Kláðasveppur (hrjúfir blettir á hýði)', cause: 'Hátt pH og þurr jörð við hnýðismyndun', fix: 'Haltu pH 5,0–5,5, jöfnum raka, veldu þolin yrki' },
      { problem: 'Grænar kartöflur', cause: 'Hnýði komast í dagsljós', fix: 'Hreyktu vel og settu niður 10–15 cm djúpt' },
      { problem: 'Frostskemmd', cause: 'Frost á grös eða hnýði (undir −2°C)', fix: 'Taktu upp fyrir hart frost; þektu með reyfi' },
      { problem: 'Hol hnýði', cause: 'Óregluleg vökvun, of hraður vöxtur', fix: 'Haltu jöfnum raka' },
    ],
    normal: [
      'Grös sölna neðan frá þegar líður á — eðlilegt þroskamerki.',
      'Blómgun gefur til kynna að hnýði séu að myndast.',
      'Lítil græn ber geta myndast eftir blóm — þau eru eitruð, ekki borða.',
    ],
    concern: [
      'Brúnir, votir blettir á grösum og hröð sölnun í ágúst — mögulega mygla.',
      'Hýði grænkar — hnýði fá of mikið ljós; hreyktu betur.',
      'Frost í kortunum — taktu upp strax.',
    ],
  };
}

interface PInput {
  id: string;
  commonName: string;
  glyph: PotatoGlyph;
  skinColor: PepperColor;
  maturity: PotatoMaturity;
  use: string;
  flavor: string;
  origin: string;
  daysToGerminate: [number, number];
  daysToHarvest: [number, number];
  notes: string;
  matureHeightCm: number;
  care: CropCare;
}

function po(input: PInput): PotatoVariety {
  return {
    id: input.id,
    commonName: input.commonName,
    scientificName: 'Solanum tuberosum',
    category: 'potato',
    glyph: input.glyph,
    skinColor: input.skinColor,
    maturity: input.maturity,
    use: input.use,
    flavor: input.flavor,
    origin: input.origin,
    daysToGerminate: input.daysToGerminate,
    daysToHarvest: input.daysToHarvest,
    notes: input.notes,
    isBuiltIn: true,
    matureHeightCm: input.matureHeightCm,
    suitableLocations: ['garden'],
    care: input.care,
  };
}

/**
 * Outdoor potato catalog. Premiere and a few international cultivars come from
 * the outdoor-potato guide; Gullauga and Rauðar íslenskar are added from common
 * Icelandic horticulture (the guide names international cultivars only).
 */
const POTATOES: PotatoVariety[] = [
  po({
    id: 'potato-premiere',
    commonName: 'Premiere',
    glyph: 'yellow',
    skinColor: 'yellow',
    maturity: 'early',
    use: 'Almenn',
    flavor: 'Mild, gulleit — fjölnota',
    origin: 'Holland — ræktuð víða á Íslandi',
    daysToGerminate: [14, 21],
    daysToHarvest: [60, 65],
    notes:
      'Snemmyrki með ljósgult hýði og gott kláðaþol. Áreiðanleg og fljót — gott byrjunaryrki fyrir íslenskan garð.',
    matureHeightCm: 55,
    care: potatoCare(
      'Snemmyrki (60–65 dagar) með gott kláðaþol. Áreiðanleg, fjölnota kartafla — kjörin fyrsta uppskera í íslenskum garði.',
    ),
  }),
  po({
    id: 'potato-gullauga',
    commonName: 'Gullauga',
    glyph: 'yellow',
    skinColor: 'yellow',
    maturity: 'maincrop',
    use: 'Soðning',
    flavor: 'Sætt, mjölkennd — sígilt íslenskt bragð',
    origin: 'Íslenskt sígilt yrki (norrænn uppruni)',
    daysToGerminate: [18, 28],
    daysToHarvest: [90, 110],
    notes:
      'Ástsælasta íslenska matarkartaflan — gult hýði með „gullauga" og mjölkennt, sætt hold. Aðeins seinni til; frábær soðin.',
    matureHeightCm: 60,
    care: potatoCare(
      'Sígilt íslenskt aðalyrki — gult hýði, mjölkennt og sætt hold. Aðeins seinþroska (90–110 dagar) en rómuð soðin.',
    ),
  }),
  po({
    id: 'potato-raudar-islenskar',
    commonName: 'Rauðar íslenskar',
    glyph: 'red',
    skinColor: 'red',
    maturity: 'early',
    use: 'Soðning',
    flavor: 'Mild, fínkornótt',
    origin: 'Íslenskt sígilt yrki',
    daysToGerminate: [16, 24],
    daysToHarvest: [70, 85],
    notes:
      'Gamalgróið íslenskt yrki með rauðu hýði og ljósu holdi. Harðgert og áreiðanlegt í svölu loftslagi.',
    matureHeightCm: 55,
    care: potatoCare(
      'Sígilt íslenskt yrki með rauðu hýði — harðgert og áreiðanlegt í svölu loftslagi. Milt, fínkornótt hold.',
    ),
  }),
  po({
    id: 'potato-rocket',
    commonName: 'Rocket',
    glyph: 'white',
    skinColor: 'white',
    maturity: 'early',
    use: 'Almenn',
    flavor: 'Milt — mjög snemmt',
    origin: 'Bretland',
    daysToGerminate: [14, 21],
    daysToHarvest: [55, 60],
    notes:
      'Eitt allra snemmþroskaðasta yrkið með hvítu hýði og mikilli uppskeru. Bregst vel við forspírun.',
    matureHeightCm: 50,
    care: potatoCare(
      'Mjög snemmyrki (55–60 dagar) með hvítu hýði og mikla uppskeru. Bregst sérlega vel við forspírun.',
    ),
  }),
  po({
    id: 'potato-nicola',
    commonName: 'Nicola',
    glyph: 'yellow',
    skinColor: 'yellow',
    maturity: 'maincrop',
    use: 'Salat',
    flavor: 'Vaxkennd, sæt — heldur lögun',
    origin: 'Þýskaland',
    daysToGerminate: [16, 24],
    daysToHarvest: [70, 80],
    notes:
      'Vinsælt vaxkennt salatyrki sem heldur lögun við suðu. Gult hýði og hold, langt geymsluþol.',
    matureHeightCm: 55,
    care: potatoCare(
      'Vaxkennt salatyrki (70–80 dagar) sem heldur lögun við suðu. Gult hold, langt geymsluþol.',
    ),
  }),
  po({
    id: 'potato-king-edward',
    commonName: 'King Edward',
    glyph: 'white',
    skinColor: 'white',
    maturity: 'late',
    use: 'Bökun / stappa',
    flavor: 'Mjölkennd — klassísk bökunarkartafla',
    origin: 'Bretland (1902)',
    daysToGerminate: [18, 28],
    daysToHarvest: [100, 110],
    notes:
      'Sígilt aðal-/síðyrki með mjölkenndu holdi — frábært í bökun og stöppu. Þarf langan vaxtartíma; áhætta í köldu hausti.',
    matureHeightCm: 65,
    care: potatoCare(
      'Síðyrki (100–110 dagar) með mjölkenndu holdi — klassísk bökunar- og stöppukartafla. Þarf langan, hlýjan vaxtartíma.',
    ),
  }),
  po({
    id: 'potato-desiree',
    commonName: 'Desiree',
    glyph: 'red',
    skinColor: 'red',
    maturity: 'maincrop',
    use: 'Almenn',
    flavor: 'Rjómakennd — fjölnota',
    origin: 'Holland',
    daysToGerminate: [16, 26],
    daysToHarvest: [80, 90],
    notes:
      'Vinsælt aðalyrki með rauðu hýði og ljósgulu, rjómakenndu holdi. Þurrkþolið og fjölnota í eldhúsi.',
    matureHeightCm: 60,
    care: potatoCare(
      'Aðalyrki (80–90 dagar) með rauðu hýði og rjómakenndu holdi. Þurrkþolið og fjölnota — gott í flest.',
    ),
  }),
];

export const BUILT_IN_VARIETIES: Variety[] = [
  ...PEPPERS,
  STEINUNN,
  ...TOMATOES,
  ...STRAWBERRIES,
  ...POTATOES,
];

export function chiliForVarietyId(id?: string): ChiliVariety {
  if (!id) return 'jalapeno';
  const found = BUILT_IN_VARIETIES.find((x) => x.id === id);
  return isPepper(found) ? found.chili : 'jalapeno';
}

export function chiliForVarietyName(name?: string): ChiliVariety {
  if (!name) return 'jalapeno';
  const found = BUILT_IN_VARIETIES.find((x) => x.commonName === name);
  return isPepper(found) ? found.chili : 'jalapeno';
}

export function varietyById(id?: string): Variety | undefined {
  if (!id) return undefined;
  return BUILT_IN_VARIETIES.find((x) => x.id === id);
}

export function varietyByName(name?: string): Variety | undefined {
  if (!name) return undefined;
  return BUILT_IN_VARIETIES.find((x) => x.commonName === name);
}

export function formatShu(n: number): string {
  if (n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return `${n}`;
}

/** Suggest varieties for a location, sorted by ascending height. */
export function suggestForLocation(
  loc: LocationKey,
  maxHeightCm?: number,
): Variety[] {
  const list = BUILT_IN_VARIETIES.filter((v) => v.suitableLocations.includes(loc));
  const filtered =
    maxHeightCm != null
      ? list.filter((v) => v.matureHeightCm <= maxHeightCm + 30)
      : list;
  return filtered.sort((a, b) => a.matureHeightCm - b.matureHeightCm);
}
