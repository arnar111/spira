/**
 * Reykjavík outdoor season & frost calendar — the outdoor counterpart to
 * `daylight.ts`. Indoor growing is driven by LED/daylight; outdoor growing is
 * driven by the season: when the last spring frost passes, when to plant, and
 * when the first autumn frost forces a harvest.
 *
 * Figures distilled from the Icelandic outdoor grow guides (potato + outdoor
 * strawberry): last spring frost ~21–31 May, first autumn frost late September,
 * a ~90–110 day frost-free window in populated areas.
 *
 * Pure module — callers pass the month (1–12); no clock calls inside.
 */

export type FrostRisk = 'hard' | 'risk' | 'none';

export interface SeasonMonth {
  /** 1–12 */
  month: number;
  name: string;
  /** Frost outlook for outdoor beds in the Reykjavík area. */
  frost: FrostRisk;
  /** Short Icelandic action for an outdoor (esp. potato) grower. */
  outdoorNote: string;
}

/** Key potato calendar anchors (month numbers), from the outdoor potato guide. */
export const POTATO_CHIT_MONTH = 3; // Mars — byrja forspírun inni
export const POTATO_PLANT_MONTH = 5; // Maí (seint) — setja niður
export const POTATO_HARVEST_MONTH = 9; // September — aðaluppskera fyrir frost

export const REYKJAVIK_SEASON: SeasonMonth[] = [
  { month: 1, name: 'Janúar', frost: 'hard', outdoorNote: 'Frost og dvali — pantaðu útsæði og skipuleggðu sáðskipti.' },
  { month: 2, name: 'Febrúar', frost: 'hard', outdoorNote: 'Enn frost — undirbúðu fræ og útsæði.' },
  { month: 3, name: 'Mars', frost: 'hard', outdoorNote: 'Byrjaðu að forspíra kartöfluútsæði inni (ljóst, ~10–15°C).' },
  { month: 4, name: 'Apríl', frost: 'hard', outdoorNote: 'Haltu áfram forspírun; undirbúðu beð þegar jörð þiðnar.' },
  { month: 5, name: 'Maí', frost: 'risk', outdoorNote: 'Settu kartöflur niður seint í maí — jarðvegur 7–10°C og frosthætta að líða.' },
  { month: 6, name: 'Júní', frost: 'none', outdoorNote: 'Hreykja þegar grös eru 15–20 cm; reyttu arfa og vökvaðu.' },
  { month: 7, name: 'Júlí', frost: 'none', outdoorNote: 'Önnur hreyking; vökvaðu vel á hnýðismyndun; nýjar kartöflur eftir blómgun.' },
  { month: 8, name: 'Ágúst', frost: 'none', outdoorNote: 'Fylgstu með myglu í röku veðri; byrjaðu að taka upp snemmyrki.' },
  { month: 9, name: 'September', frost: 'risk', outdoorNote: 'Taktu upp aðaluppskeru fyrir frost; láttu grös sölna fyrst.' },
  { month: 10, name: 'Október', frost: 'hard', outdoorNote: 'Ljúktu upptöku og þurrkun (curing) fyrir geymslu; leggðu vetrarmold yfir fjölær beð.' },
  { month: 11, name: 'Nóvember', frost: 'hard', outdoorNote: 'Útiræktun í dvala — fylgstu með geymdum kartöflum.' },
  { month: 12, name: 'Desember', frost: 'hard', outdoorNote: 'Dvali — fylgstu með geymslu og skipuleggðu næsta ár.' },
];

export function seasonForMonth(month: number): SeasonMonth {
  const m = (((month - 1) % 12) + 12) % 12;
  return REYKJAVIK_SEASON[m];
}

export function frostRisk(month: number): FrostRisk {
  return seasonForMonth(month).frost;
}

/** True in the frost-free outdoor growing window (roughly June–September). */
export function isGrowingSeason(month: number): boolean {
  return seasonForMonth(month).frost !== 'hard';
}

/** Friendly status for the current month, mirroring daylightStatus(). */
export function seasonStatus(month: number): {
  tone: 'good' | 'ok' | 'low';
  label: string;
} {
  const risk = frostRisk(month);
  if (risk === 'none') return { tone: 'good', label: 'Frostlaus vaxtartími' };
  if (risk === 'risk') return { tone: 'ok', label: 'Frosthætta á jöðrum tímabils' };
  return { tone: 'low', label: 'Frost — útiræktun í dvala' };
}
