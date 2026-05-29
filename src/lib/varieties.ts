import type { ChiliVariety } from '@/components/Chili';
import type { TomatoGlyph } from '@/components/Tomato';
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

/** Structured grow guide distilled from the variety's care sheet. */
export interface TomatoCare {
  summary: string;
  targets: CareTarget[];
  watering: string[];
  pollination: string[];
  fertilizer: FertStage[];
  troubleshooting: TroubleItem[];
  normal: string[];
  concern: string[];
}

export interface TomatoVariety extends VarietyCommon {
  category: 'tomato';
  glyph: TomatoGlyph;
  /** Reuses the shared colour palette for the swatch dot. */
  fruitColor: PepperColor;
  growthHabit: 'determinate' | 'indeterminate';
  fruitWeightG: number;
  fruitShape: string;
  care: TomatoCare;
}

export type Variety = PepperVariety | TomatoVariety;

/** Back-compat alias — most of the app was written before tomatoes existed. */
export type VarietyWithChili = PepperVariety;

export function isPepper(v?: Variety): v is PepperVariety {
  return v?.category === 'pepper';
}

export function isTomato(v?: Variety): v is TomatoVariety {
  return v?.category === 'tomato';
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

export const BUILT_IN_VARIETIES: Variety[] = [...PEPPERS, STEINUNN];

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
