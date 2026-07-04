import {
  Bug,
  CalendarDays,
  Container,
  Droplet,
  FlaskConical,
  Flower,
  Flower2,
  Leaf,
  Lightbulb,
  Mountain,
  Move,
  Package,
  Scissors,
  ShieldAlert,
  Snowflake,
  Sparkles,
  SprayCan,
  Sprout,
  Thermometer,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { LogType } from '@/lib/db';
import type { RosInsightKind, RosSeverity } from '@/lib/ros/types';

/**
 * Sameiginlegt ástand/hjálparföll RosWindow-flipanna (4.4 skipting). Þetta voru
 * áður efst í RosWindow.tsx; flutt hingað óbreytt svo allir flipar (Ráð, Heilsa,
 * Spjall) deili sömu táknum/litum/textum án tvíverknaðar.
 */

export const KIND_ICON: Record<RosInsightKind, LucideIcon> = {
  water: Droplet,
  feed: Leaf,
  prune: Scissors,
  top: Sparkles,
  pollinate: Flower,
  deblossom: Flower2,
  runner: Sprout,
  hill: Mountain,
  harvest: Leaf,
  light: Lightbulb,
  frost: Snowflake,
  season: CalendarDays,
  mulch: Leaf,
  env: Thermometer,
  envBand: Thermometer,
  ph: FlaskConical,
  ec: FlaskConical,
  transplant: Move,
  pest: Bug,
  disease: ShieldAlert,
  // — Véritable SMART (vatnsrækt) —
  tank: Container,
  clean: SprayCan,
  wick: Waves,
  thin: Scissors,
  lingot: Package,
  info: Sparkles,
};

/** Litaslá vinstri brúnar/táknu eftir forgangi. */
export const SEVERITY_STYLE: Record<
  RosSeverity,
  { edge: string; iconBg: string; iconColor: string }
> = {
  due: {
    edge: 'var(--cap-500)',
    iconBg: 'rgba(226,62,29,.16)',
    iconColor: 'var(--cap-400)',
  },
  soon: {
    edge: 'var(--cream-400)',
    iconBg: 'rgba(224,194,121,.16)',
    iconColor: 'var(--cream-300)',
  },
  info: {
    edge: 'var(--moss-400)',
    iconBg: 'rgba(115,159,115,.16)',
    iconColor: 'var(--moss-300)',
  },
};

/**
 * Vörpun ráða-gerðar í skráningartegund (5.x) — knýr „Skrá"-flýtihnappinn á
 * ráðum: eitt tapp opnar skráningargluggann forvalinn á réttri tegund í stað
 * þess að notandi rati sjálfur gegnum tegundavalið. Gerðir sem eiga sér ekki
 * augljósa skráningu (season, frost, light-upplýsingar …) eru viljandi ekki
 * með — þar er ekkert að „ljúka".
 */
export const KIND_TO_LOG: Partial<Record<RosInsightKind, LogType>> = {
  water: 'water',
  feed: 'feed',
  top: 'top',
  prune: 'prune',
  pollinate: 'pollinate',
  deblossom: 'prune',
  runner: 'prune',
  hill: 'prune',
  // ATH: 'harvest' er viljandi EKKI hér — uppskera býr í db.harvests (Uppskeru-
  // síðan og tölfræðin lesa hana þaðan), svo flýtiskráning í dagbókar-log myndi
  // hvorki uppfæra tölur né loka ráðinu. 'mulch' er líka sleppt: mánaðarbundið
  // úti-ráð sem engin skráning þaggar.
  env: 'environment',
  envBand: 'environment',
  ph: 'water',
  ec: 'water',
  transplant: 'transplant',
  pest: 'pest',
  disease: 'disease',
  tank: 'water',
  clean: 'maintenance',
  wick: 'maintenance',
  thin: 'maintenance',
  lingot: 'maintenance',
};

/**
 * Forútfyllt skipulögð gögn fyrir flýtiskráningu (5.x). Véritable-viðhaldsráðin
 * lokast aðeins þegar RÉTT verk er valið (vélin les data.task), svo flýtihnappurinn
 * forvelur verkið — annars varð til tómt viðhaldslog sem þaggaði aldrei ráðið.
 */
export const KIND_TO_LOG_DATA: Partial<Record<RosInsightKind, Record<string, string>>> = {
  clean: { task: 'clean_tank' },
  thin: { task: 'thin_seedlings' },
  wick: { task: 'inspect_wicks' },
  lingot: { task: 'replace_lingot' },
};

/** Íslensk fleirtölu-/eintölumeðferð fyrir „dag(a)". */
export function dayWord(n: number): string {
  return Math.abs(n) === 1 ? 'dag' : 'daga';
}

/** Texti fyrir dueInDays: „eftir N daga" / „núna" / „komið yfir tíma". */
export function dueLabel(dueInDays?: number | null): string | null {
  if (dueInDays === undefined || dueInDays === null) return null;
  if (dueInDays > 0) return `eftir ${dueInDays} ${dayWord(dueInDays)}`;
  if (dueInDays === 0) return 'núna';
  return 'komið yfir tíma';
}

/** Litur heilsueinkunnar: grænt (hraust) → gult → rautt (þarf aðstoð). */
export function scoreColor(score: number | null): string {
  if (score === null) return 'var(--moss-400)';
  if (score >= 8) return 'var(--moss-400)';
  if (score >= 5) return 'var(--cream-400)';
  return 'var(--cap-500)';
}

/**
 * Léttvæg lýsigögn nýjustu myndar plöntu — án blob (sparar minni; blobbinn er
 * sóttur sér þegar greint er eða thumbnail birt).
 */
export interface LatestPhoto {
  id: string;
  takenAt: number;
  /**
   * Hvaðan myndin kemur: `plant` = mynd merkt þessari plöntu, `grow` = mynd af
   * allri ræktuninni („Öll ræktunin" — t.d. ein mynd af Véritable-vélinni) sem
   * við notum sem varamynd fyrir plöntur sem eiga enga eigin mynd.
   */
  scope?: 'plant' | 'grow';
}

/** Íslenskar tillöguspurningar fyrir hverja innsýnar-gerð (efstu ráð → spjall). */
export const SUGGESTION_BY_KIND: Partial<Record<RosInsightKind, string>> = {
  water: 'Hvernig veit ég hvort ég eigi að vökva núna?',
  feed: 'Hvaða áburð ætti ég að nota núna?',
  pollinate: 'Hvernig frjóvga ég blómin rétt?',
  harvest: 'Hvenær verður uppskeran tilbúin?',
  light: 'Þarf ég gróðurljós þennan mánuð?',
  top: 'Hvernig toppa ég plöntuna rétt?',
  frost: 'Hvernig ver ég plönturnar gegn frosti?',
  hill: 'Hvernig hreyki ég rétt að kartöflunum?',
  tank: 'Hvenær á ég að fylla á Véritable-tankinn?',
  clean: 'Hvernig hreinsa ég Véritable-tankinn?',
  wick: 'Hvernig veit ég hvort skipta þurfi um hárpípu-dúkana?',
  thin: 'Hvernig grisja ég ungplönturnar í Lingot?',
  lingot: 'Hvenær á ég að skipta um Lingot?',
  ec: 'Hvað þýðir EC-gildið og hvernig stilli ég það?',
  transplant: 'Hvenær og hvernig umpotta ég rétt?',
};

/** Almenn vara-tillaga ef of fáar innsýnir gefa spurningu. */
export const FALLBACK_SUGGESTION = 'Hvað ætti ég að gera næst?';
