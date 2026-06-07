/**
 * Rós — uppskeruviðmið (yield benchmarks).
 *
 * Rannsóknarstudd sjálfgildi fyrir uppskerumat þegar engin tínslusaga er til.
 * Allt er gefið sem BIL (lág–há), aldrei eitt gildi, og hallað NIÐUR á við fyrir
 * íslenskar inniræktunaraðstæður (styttri vaxtartími, minni birta, áhugamennska)
 * — frekar vanmeta en lofa of miklu.
 *
 * Sameiginlegt mynstur alls staðar:  fjöldi × eining­arþyngd × fasa-öryggi.
 *
 * Heimildir (sjá hverja vörutegund):
 *  - Tómatar: ishs.org/ishs-article/491_38, pmc.ncbi.nlm.nih.gov/articles/PMC7384071,
 *    plantersdigest.com/how-much-do-tomatoes-weigh
 *  - Paprika: pepperscale.com/how-many-peppers-per-plant
 *  - Jarðarber: wikifarmer.com (strawberry-yield), hortidaily.com/article/9509200
 *  - Kartöflur: greenupside.com (potato-yield), stonepostgardens.com
 *
 * Hreint gagnaskjal — engin klukka, IO né slembni. Allar tölur eru fastar.
 */

import type { PlantCategory } from '@/lib/db';

/** Lág–há bil (innifalið). Notað gegnumgangandi fyrir þyngd, fjölda o.s.frv. */
export type Range = readonly [low: number, high: number];

// ————————————————————————————————————————————————————————————————
// Tómatar
// ————————————————————————————————————————————————————————————————

/** Stærðarflokkur tómats þegar afbrigði hefur ekki `fruitWeightG`. */
export type TomatoSizeClass = 'cherry' | 'medium' | 'beefsteak';

/**
 * Grömm á aldin eftir stærðarflokki (varaviðmið ef `fruitWeightG` vantar).
 * Heimild: plantersdigest.com/how-much-do-tomatoes-weigh.
 */
export const TOMATO_G_PER_FRUIT: Record<TomatoSizeClass, Range> = {
  cherry: [14, 30], // ~15 g dæmigert
  medium: [113, 226], // salat-/almennir tómatar
  beefsteak: [227, 680],
};

/** Aldin á klasa (truss) — dæmigert hjá áhugaræktun innandyra. */
export const TOMATO_FRUITS_PER_TRUSS: Range = [4, 6];

/**
 * Klasamyndun (truss/dag) við 20°C, til að áætla ómyndaða klasa. Eykst um
 * ~0,010 truss/dag á °C á bilinu 18–23°C. Heimild: ishs.org/ishs-article/491_38.
 */
export const TOMATO_TRUSS_PER_DAY_AT_20C = 0.146;
export const TOMATO_TRUSS_PER_DAY_PER_DEG = 0.01;
/** Hitabil þar sem línuleg leiðrétting á klasahraða á við. */
export const TOMATO_TRUSS_TEMP_BAND: Range = [18, 23];

/** Tími frá blómi að þroskuðu aldini (vikur) — fyrir fasamat. */
export const TOMATO_FLOWER_TO_RIPE_WEEKS: Range = [6, 8];

// ————————————————————————————————————————————————————————————————
// Paprika / chili
// ————————————————————————————————————————————————————————————————

/**
 * Stærðar-/gerðarflokkur papriku. Leiddur af SHU, móðurtegund og lýsingu.
 * Hver flokkur ber áætlaðan fjölda pods á plöntu yfir leiktímabilið (lágt fyrir
 * innirækt) og grömm á pod. Heimild: pepperscale.com/how-many-peppers-per-plant.
 */
export type PepperSizeClass = 'bell' | 'jalapeno' | 'cayenne' | 'small-hot';

export interface PepperBenchmark {
  /** Pods á plöntu yfir tímabilið (hallað niður fyrir innirækt). */
  podsPerPlant: Range;
  /** Grömm á pod. */
  gPerPod: Range;
}

export const PEPPER_BENCHMARKS: Record<PepperSizeClass, PepperBenchmark> = {
  bell: { podsPerPlant: [5, 10], gPerPod: [150, 250] },
  jalapeno: { podsPerPlant: [35, 50], gPerPod: [25, 30] },
  cayenne: { podsPerPlant: [30, 80], gPerPod: [5, 8] },
  // Smáir thai/chili — gríðarmargir litlir pods.
  'small-hot': { podsPerPlant: [100, 150], gPerPod: [5, 15] },
};

/** Tími frá blómi að fullvaxinni paprika (dagar). */
export const PEPPER_FLOWER_TO_FULL_DAYS = 30;

// ————————————————————————————————————————————————————————————————
// Jarðarber
// ————————————————————————————————————————————————————————————————

/**
 * Heildaruppskera á plöntu á tímabili (g). Góðar áhugaaðstæður 400–800 g, ker-
 * tilraunir 520–667 g; raunsætt lágvarnargildi 40–70 g undir streitu. Við notum
 * vítt bil og þrengjum með raunverulegri tínslusögu þegar hún er til.
 * Heimildir: wikifarmer.com (strawberry-yield), hortidaily.com/article/9509200.
 */
export const STRAWBERRY_G_PER_PLANT_SEASON: Range = [70, 800];

/** Grömm á ber eftir gerð (alpa-ber eru pínulítil — nota helst `fruitWeightG`). */
export const STRAWBERRY_G_PER_BERRY: Range = [8, 25];
export const STRAWBERRY_ALPINE_G_PER_BERRY: Range = [1, 2];

/** Tími frá blómi að þroskuðu beri (dagar). */
export const STRAWBERRY_FLOWER_TO_RIPE_DAYS = 24;

/** Hlutfall blóma sem setja ber (fruit-set). */
export const STRAWBERRY_FRUIT_SET_RATE = 0.7;

// ————————————————————————————————————————————————————————————————
// Kartöflur
// ————————————————————————————————————————————————————————————————

/**
 * Kartöflur bera engin teljanleg aldin — matið er hrein fall af dögum í jörð ×
 * þroskaflokki. Skalað línulega að fullum DTM, þakað við þroska, hallað niður
 * fyrir stutt íslenskt sumar. Heimildir: greenupside.com, stonepostgardens.com.
 */
export type PotatoMaturityClass = 'early' | 'maincrop' | 'late';

export interface PotatoBenchmark {
  /** Grömm á plöntu við fullan þroska (góðar aðstæður). */
  gPerPlant: Range;
  /** Hnýði á plöntu — birt í `basis`, ekki notað í þyngdarreikning. */
  tubersPerPlant: Range;
}

export const POTATO_BENCHMARKS: Record<PotatoMaturityClass, PotatoBenchmark> = {
  // Snemmyrki/smáyrki gefa minna.
  early: { gPerPlant: [900, 1800], tubersPerPlant: [8, 12] },
  maincrop: { gPerPlant: [1400, 2700], tubersPerPlant: [8, 14] },
  late: { gPerPlant: [1400, 2700], tubersPerPlant: [8, 14] },
};

// ————————————————————————————————————————————————————————————————
// Flokkar sem ekki er hægt að meta
// ————————————————————————————————————————————————————————————————

/**
 * Flokkar sem uppskerumatið skilar `null` fyrir (engin teljanleg/þyngjanleg
 * eining sem viðmið ná yfir): kryddjurtir, lauf, ávextir, pottaplöntur, annað.
 */
export const NON_ESTIMABLE_CATEGORIES: ReadonlySet<PlantCategory> =
  new Set<PlantCategory>(['herb', 'leafy', 'fruit', 'houseplant', 'other']);
