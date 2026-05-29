/**
 * Reykjavík daylight calendar — the heart of the "Iceland Summer Edition"
 * advantage from the Steinunn guide. Indoor tomatoes need roughly 6–8 hours of
 * usable light; below ~10 hours a supplemental LED is needed to keep growing.
 */

export const TOMATO_MIN_LIGHT_HOURS = 8;
/** Below this much natural daylight, a supplemental grow light is recommended. */
const GROW_LIGHT_THRESHOLD_HOURS = 10;

export interface DaylightMonth {
  /** 1–12 */
  month: number;
  name: string;
  /** Approximate daylight hours in Reykjavík. */
  hours: number;
  /** What a NW-facing window receives that month. */
  windowNote: string;
  /** Recommended action for a Steinunn grower. */
  action: string;
}

export const REYKJAVIK_DAYLIGHT: DaylightMonth[] = [
  { month: 1, name: 'Janúar', hours: 5, windowNote: 'Mjög lítil birta, sól lágt á lofti', action: 'LED nauðsynlegt ef plantan lifir' },
  { month: 2, name: 'Febrúar', hours: 8, windowNote: 'Birtan eykst hratt en enn lítil', action: 'LED þörf — eða sá nýjum fræjum undir ljósi' },
  { month: 3, name: 'Mars', hours: 11.5, windowNote: 'Dagsbirta nálgast jafnvægi', action: 'Góður tími til að sá að nýju' },
  { month: 4, name: 'Apríl', hours: 15, windowNote: 'Bjartar, langar dagsstundir', action: 'Náttúrubirta dugar fyrir ungplöntur' },
  { month: 5, name: 'Maí', hours: 18.5, windowNote: 'Góð kvöldsól í NV-glugga', action: 'Umpotta núna — náttúrubirtan nægir' },
  { month: 6, name: 'Júní', hours: 21, windowNote: 'Frábær bein kvöldsól', action: 'Ekkert — birtan er fullkomin' },
  { month: 7, name: 'Júlí', hours: 20, windowNote: 'Frábær bein kvöldsól', action: 'Ekkert — birtan er fullkomin' },
  { month: 8, name: 'Ágúst', hours: 16, windowNote: 'Góð kvöldsól, smám saman minni', action: 'Ekkert — enn næg birta' },
  { month: 9, name: 'September', hours: 12.5, windowNote: 'Minnkandi kvöldbirta', action: 'Uppskeru ætti að vera lokið' },
  { month: 10, name: 'Október', hours: 9.5, windowNote: 'Takmörkuð nýtanleg birta', action: 'Líftíma plöntu lýkur — eða LED' },
  { month: 11, name: 'Nóvember', hours: 6.5, windowNote: 'Lágmark, sól of lágt', action: 'LED ef plöntu er haldið' },
  { month: 12, name: 'Desember', hours: 4.5, windowNote: 'Nánast engin bein birta', action: 'LED nauðsynlegt' },
];

export function daylightForMonth(month: number): DaylightMonth {
  const m = ((month - 1) % 12 + 12) % 12;
  return REYKJAVIK_DAYLIGHT[m];
}

/** Month-by-month grow plan for Iceland (guide Table 18). */
export interface MonthPlan {
  /** What to do this month. */
  activities: string;
  /** Suggested varieties to start this month ('' if none). */
  startVarieties: string;
}

const MONTH_PLANS: Record<number, MonthPlan> = {
  1: { activities: 'Sáðu ofur-sterkum fræjum (C. chinense); haltu yfirvetruðum plöntum.', startVarieties: 'Carolina Reaper, Bhut Jolokia, 7 Pot' },
  2: { activities: 'Sáðu C. baccatum og C. pubescens; byrjaðu að vekja yfirvetraðar plöntur.', startVarieties: 'Aji Amarillo, Lemon Drop, Rocoto' },
  3: { activities: 'Sáðu aðaluppskeru (C. annuum); auktu vökvun yfirvetraðra plantna.', startVarieties: 'Jalapeño, Cayenne, Serrano, Thai' },
  4: { activities: 'Sáðu hraðvaxandi yrkjum; toppaðu ungar plöntur; byrjaðu áburðargjöf.', startVarieties: 'Shishito, Padrón, Jalapeño' },
  5: { activities: 'Allar plöntur í vexti; haltu áfram að toppa og þjálfa; auktu næringu.', startVarieties: 'Það sem eftir er' },
  6: { activities: 'Skiptu í blómaáburð; fyrstu blóm á snemmyrkjum; handfrjóvgaðu.', startVarieties: 'Lokasáning' },
  7: { activities: 'Hámarks blómgun; haltu frjóvgun gangandi; fyrsta uppskera snemmyrkja.', startVarieties: '' },
  8: { activities: 'Hámarks uppskera flestra yrkja; tíndu samfellt; þurrkaðu umfram.', startVarieties: '' },
  9: { activities: 'Haltu uppskeru áfram; veldu plöntur til yfirvetrunar; safnaðu fræjum.', startVarieties: '' },
  10: { activities: 'Lokauppskera; klipptu fyrir yfirvetrun; minnkaðu vökvun og áburð.', startVarieties: '' },
  11: { activities: 'Plöntur í dvala; lágmarks umhirða; skipuleggðu næsta ár.', startVarieties: '' },
  12: { activities: 'Haltu dvala plöntum; pantaðu fræ; undirbúðu búnað fyrir vorið.', startVarieties: '' },
};

export function monthPlan(month: number): MonthPlan {
  const m = ((month - 1) % 12 + 12) % 12;
  return MONTH_PLANS[m + 1];
}

export function currentDaylight(date: Date = new Date()): DaylightMonth {
  return daylightForMonth(date.getMonth() + 1);
}

/** True when natural daylight alone is too low — a grow light is recommended. */
export function needsGrowLight(month: number): boolean {
  return daylightForMonth(month).hours < GROW_LIGHT_THRESHOLD_HOURS;
}

/** Short, friendly status for the current month. */
export function daylightStatus(month: number): {
  tone: 'good' | 'ok' | 'low';
  label: string;
} {
  const { hours } = daylightForMonth(month);
  if (hours >= 16) return { tone: 'good', label: 'Náttúrubirta í toppstandi' };
  if (hours >= GROW_LIGHT_THRESHOLD_HOURS) return { tone: 'ok', label: 'Náttúrubirta nægir' };
  return { tone: 'low', label: 'Þörf á gróðurljósi' };
}
