/**
 * Rós reglu-vél — offline, deterministísk leiðsögn fyrir ræktanda.
 *
 * Hönnunarreglur:
 *  - HREINAR fallgerðir: engin bein köllun á Date.now() / Math.random() inni.
 *    'now' (epoch-ms) og 'month' (1–12) berast alltaf inn sem rök.
 *  - Þolið gagnvart tómum fylkjum og vantandi dagsetningum.
 *  - Öll auðkenni eru stöðug (t.d. 'water-<growId>') svo þau séu nothæf sem React key.
 *
 * Hver heuristík er skjalfest með íslenskri athugasemd og þeim forsendum sem hún byggir á.
 */

import type {
  Grow,
  Plant,
  LogEntry,
  HarvestEntry,
  GrowPhase,
} from '@/lib/db';
import { needsGrowLight, daylightForMonth } from '@/lib/daylight';
import { seasonForMonth, frostRisk } from '@/lib/season';
import { varietyByName, varietyById, isTomato, isStrawberry } from '@/lib/varieties';
import { predictHarvestWindow } from './predict';
import type { RosInsight, RosSeverity } from './types';

const DAY_MS = 1000 * 60 * 60 * 24;

/** Jarðarber: fjarlægja á fyrstu blóm í ~5 vikur til að byggja upp krónu/rætur. */
const STRAWBERRY_DEBLOSSOM_DAYS = 35;

/** Fasar þar sem grow telst virkt (ekki í skipulagi / búið / dvala). */
const ACTIVE_PHASES: ReadonlySet<GrowPhase> = new Set<GrowPhase>([
  'germinating',
  'seedling',
  'vegetative',
  'flowering',
  'fruiting',
  'ripening',
  'harvest',
]);

interface EngineInput {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
  /** Núverandi tímastimpill í ms (berst inn — engin klukka inni í vélinni). */
  now: number;
  /** Núverandi mánuður 1–12 (berst inn). */
  month: number;
}

/** Heilir dagar liðnir frá tímastimpli (>= 0). */
function daysSince(now: number, ts: number): number {
  return Math.floor((now - ts) / DAY_MS);
}

/** Nýjasti log-tímastimpill af tiltekinni gerð (eða undefined). */
function lastLogTs(
  logs: LogEntry[],
  type: LogEntry['type'],
  plantId?: string,
): number | undefined {
  let latest: number | undefined;
  for (const l of logs) {
    if (l.type !== type) continue;
    if (plantId !== undefined && l.plantId !== plantId) continue;
    if (latest === undefined || l.timestamp > latest) latest = l.timestamp;
  }
  return latest;
}

/**
 * Nýjasti log-tímastimpill af tiltekinni gerð sem á við TILTEKNA plöntu:
 * annaðhvort skráð á plöntuna sjálfa eða á ræktunina í heild (plantId óskilgreint).
 * Aðgerðir eru oft skráðar fyrir „Öll ræktunin", svo plöntustigs-áminningar
 * (frjóvgun, toppun) verða að telja slíkar skráningar með.
 */
function lastLogForPlant(
  logs: LogEntry[],
  type: LogEntry['type'],
  plantId: string,
): number | undefined {
  let latest: number | undefined;
  for (const l of logs) {
    if (l.type !== type) continue;
    // Skráning á ræktunina (engin plantId) gildir fyrir allar plöntur hennar.
    if (l.plantId !== undefined && l.plantId !== plantId) continue;
    if (latest === undefined || l.timestamp > latest) latest = l.timestamp;
  }
  return latest;
}

/** Er einhver virk planta í þessu grow í tilteknum fasa? */
function plantsInPhase(plants: Plant[], phase: GrowPhase): Plant[] {
  return plants.filter((p) => !p.archived && p.currentPhase === phase);
}

/** Sækir afbrigði fyrir plöntu — fyrst eftir id, svo eftir nafni. */
function plantVariety(p: Plant) {
  return varietyById(p.varietyId) ?? varietyByName(p.variety);
}

/** Besta upphafsdagsetning til að mæla aldur plöntu (spírun > sáning > stofnun). */
function plantStartTs(p: Plant): number {
  return p.germinatedDate ?? p.sowDate ?? p.createdAt;
}

/**
 * Er ræktunin utandyra? Notar `environment` ef sett; annars ræður garður-
 * staðsetning eða kartöflur (alltaf útiræktun) því. Útiræktun fær árstíða-/
 * frostráð í stað innidyra-ráða (LED, fingurpróf, handfrjóvgun).
 */
function growIsOutdoor(grow: Grow, plants: Plant[]): boolean {
  if (grow.environment) return grow.environment === 'outdoor';
  if (grow.locationKey === 'garden') return true;
  return plants.some((p) => !p.archived && p.category === 'potato');
}

/**
 * VÖKVUN — tíðni ræðst af fasa, staðsetningu og flokki.
 * Forsenda: grunnur ~3 dagar. Gluggi þornar hraðar (-1). Spírun/plöntufasar oftar.
 * Blómgun/aldin á papriku ~2–3 dagar. Lágmark 1 dagur.
 */
function wateringCadenceDays(grow: Grow, plants: Plant[]): number {
  let cadence = 3;
  // Gluggi þornar hraðar en lokað tjald/sturta.
  if (grow.locationKey === 'window') cadence -= 1;

  // Finndu „þyrstasta" fasa meðal virkra plantna (lægsta tíðni ræður).
  const active = plants.filter((p) => !p.archived);
  let minPhaseCadence = cadence;
  for (const p of active) {
    let c = cadence;
    if (p.currentPhase === 'germinating' || p.currentPhase === 'seedling') {
      // Ungplöntur þorna hratt og þola illa þurrk.
      c = Math.min(c, 2);
    }
    if (
      p.category === 'pepper' &&
      (p.currentPhase === 'flowering' ||
        p.currentPhase === 'fruiting' ||
        p.currentPhase === 'ripening')
    ) {
      // Paprika á blóma/aldinfasa drekkur meira.
      c = Math.min(c, grow.locationKey === 'window' ? 2 : 3);
    }
    if (p.category === 'strawberry') {
      // Jarðarber í litlum pottum þorna hratt — vökva þegar efsti 1 cm er þurr.
      c = Math.min(c, 2);
    }
    minPhaseCadence = Math.min(minPhaseCadence, c);
  }

  return Math.max(1, minPhaseCadence);
}

function severityRank(s: RosSeverity): number {
  return s === 'due' ? 0 : s === 'soon' ? 1 : 2;
}

/**
 * Reiknar allar virkar innsýnir fyrir eitt grow.
 * Skilar röðuðu fylki: 'due' fyrst, svo 'soon', svo 'info' (stöðug röðun).
 */
export function computeInsights(input: EngineInput): RosInsight[] {
  const { grow, plants, logs, now, month } = input;
  const insights: RosInsight[] = [];

  const activePlants = plants.filter((p) => !p.archived);
  const growActive =
    !grow.archived && activePlants.some((p) => ACTIVE_PHASES.has(p.currentPhase));
  const outdoor = growIsOutdoor(grow, activePlants);

  // — VÖKVUN —
  // Innidyra: tíðni ræðst af fasa/staðsetningu. Útiræktun reiðir sig á regn,
  // svo við sleppum vökvunar-áminningum þar (árstíðaráð koma í staðinn).
  if (!outdoor) {
    const cadence = wateringCadenceDays(grow, activePlants);
    const lastWater = lastLogTs(logs, 'water');
    if (lastWater === undefined) {
      // Aldrei vökvað en grow virkt -> tímabært.
      if (growActive) {
        insights.push({
          id: `water-${grow.id}`,
          kind: 'water',
          severity: 'due',
          title: 'Tími til að vökva',
          detail:
            'Engin vökvun hefur verið skráð. Stingdu fingri 2–3 cm í moldina — sé hún þurr, vökvaðu þar til rennur úr botni.',
          dueInDays: 0,
        });
      }
    } else {
      const since = daysSince(now, lastWater);
      const dueInDays = cadence - since;
      if (since >= cadence) {
        insights.push({
          id: `water-${grow.id}`,
          kind: 'water',
          severity: 'due',
          title: 'Tími til að vökva',
          detail: `Síðast vökvað fyrir ${since} ${dayWord(since)}. Mælt er með vökvun á ~${cadence} daga fresti hér. Fingurpróf áður en þú vökvar.`,
          dueInDays,
        });
      } else if (dueInDays <= 1) {
        insights.push({
          id: `water-${grow.id}`,
          kind: 'water',
          severity: 'soon',
          title: 'Vökvun á næsta leiti',
          detail: `Síðast vökvað fyrir ${since} ${dayWord(since)}. Næsta vökvun líklega á morgun — athugaðu rakann.`,
          dueInDays,
        });
      } else if (growActive) {
        insights.push({
          id: `water-${grow.id}`,
          kind: 'water',
          severity: 'info',
          title: 'Vökvun í lagi',
          detail: `Síðast vökvað fyrir ${since} ${dayWord(since)}. Næsta vökvun eftir ~${dueInDays} ${dayWord(dueInDays)}.`,
          dueInDays,
        });
      }
    }
  }

  // — ÁBURÐUR —
  // Innidyra á veg/blóma/aldinfasa: áburður á ~7 daga fresti. Útiræktun fær
  // áburðarráð gegnum árstíða-vaktina (hliðargjöf við hreykingu o.s.frv.).
  if (!outdoor) {
    const feedPhases: GrowPhase[] = ['vegetative', 'flowering', 'fruiting'];
    const needsFeed = activePlants.some((p) => feedPhases.includes(p.currentPhase));
    if (needsFeed) {
      const FEED_CADENCE = 7;
      const lastFeed = lastLogTs(logs, 'feed');
      if (lastFeed === undefined) {
        insights.push({
          id: `feed-${grow.id}`,
          kind: 'feed',
          severity: 'due',
          title: 'Tími til að gefa áburð',
          detail:
            'Enginn áburður skráður á vaxtarfasa. Gefðu vægan áburð (lágt N, hátt P-K á blóma/aldinfasa).',
          dueInDays: 0,
        });
      } else {
        const since = daysSince(now, lastFeed);
        const dueInDays = FEED_CADENCE - since;
        if (since >= FEED_CADENCE) {
          insights.push({
            id: `feed-${grow.id}`,
            kind: 'feed',
            severity: 'due',
            title: 'Tími til að gefa áburð',
            detail: `Síðast gefið fyrir ${since} ${dayWord(since)}. Mælt með áburði á ~${FEED_CADENCE} daga fresti á þessum fasa.`,
            dueInDays,
          });
        } else if (dueInDays <= 1) {
          insights.push({
            id: `feed-${grow.id}`,
            kind: 'feed',
            severity: 'soon',
            title: 'Áburður á næsta leiti',
            detail: `Síðast gefið fyrir ${since} ${dayWord(since)}. Næsta gjöf líklega á morgun.`,
            dueInDays,
          });
        }
      }
    }
  }

  // — TOPPUN —
  // Paprika í vegfasa með skynsamlegan dag-í-fasa glugga og enga 'top' skráningu.
  // Forsenda: toppun gagnast papriku við ~15 cm hæð / um 30–60 daga aldur.
  // Sleppt fyrir tómat (Steinunn er dvergyrki) og dvergplöntur.
  {
    for (const p of plantsInPhase(activePlants, 'vegetative')) {
      if (p.category !== 'pepper') continue; // Tómatur/dvergur: sleppa toppun.
      const variety = plantVariety(p);
      if (variety && isTomato(variety)) continue;
      const alreadyTopped = lastLogForPlant(logs, 'top', p.id) !== undefined;
      if (alreadyTopped) continue;
      const ageDays = daysSince(now, plantStartTs(p));
      // Skynsamlegur gluggi: nógu gömul til að þola toppun en ekki of langt í veg.
      if (ageDays >= 30 && ageDays <= 75) {
        insights.push({
          id: `top-${p.id}`,
          kind: 'top',
          severity: 'soon',
          title: `Íhugaðu að toppa ${plantLabel(p)}`,
          detail:
            'Toppun á papriku í vegfasa (við ~15 cm hæð) gefur þéttari, greinóttari plöntu og meiri uppskeru. Klíptu efsta vaxtarbroddinn.',
          plantId: p.id,
        });
      }
    }
  }

  // — FRJÓVGUN —
  // Plöntur í blómgun innandyra þurfa handfrjóvgun (engar býflugur). Hafi nýlega
  // verið frjóvgað (innan tíðni) -> upplýsing í stað áminningar.
  {
    const flowering = plantsInPhase(activePlants, 'flowering');
    for (const p of flowering) {
      const variety = plantVariety(p);

      // — JARÐARBER —
      // Ung planta: fjarlægja fyrstu blóm (deblossom). Eldri: pensilfrjóvgun ~2 daga fresti.
      const straw = variety ? isStrawberry(variety) : p.category === 'strawberry';
      if (straw) {
        const ageDays = daysSince(now, plantStartTs(p));
        if (ageDays < STRAWBERRY_DEBLOSSOM_DAYS) {
          insights.push({
            id: `deblossom-${p.id}`,
            kind: 'deblossom',
            severity: 'soon',
            title: `Fjarlægðu fyrstu blóm af ${plantLabel(p)}`,
            detail: `Ung jarðarberjaplanta (dagur ${ageDays}): klíptu af blómum fyrstu ~5 vikurnar þar til plantan hefur 6–8 þroskuð blöð. Þá byggjast upp rætur og króna og uppskeran verður margfalt meiri síðar.`,
            dueInDays: 0,
            plantId: p.id,
          });
          continue;
        }
        // Útiræktun: frjóvgun gerist náttúrulega (skordýr) — engin pensil-áminning.
        if (outdoor) continue;
        const cadence = 2;
        const last = lastLogForPlant(logs, 'pollinate', p.id);
        const since = last !== undefined ? daysSince(now, last) : undefined;
        if (since !== undefined && since < cadence) {
          const left = cadence - since;
          insights.push({
            id: `pollinate-${p.id}`,
            kind: 'pollinate',
            severity: 'info',
            title: `${plantLabel(p)} nýlega frjóvguð`,
            detail: `Síðast frjóvgað ${since === 0 ? 'í dag' : `fyrir ${since} ${dayWord(since)}`}. Næsta pensilfrjóvgun eftir ~${left} ${dayWord(left)}.`,
            dueInDays: left,
            plantId: p.id,
          });
          continue;
        }
        insights.push({
          id: `pollinate-${p.id}`,
          kind: 'pollinate',
          severity: 'due',
          title: `Frjóvgaðu ${plantLabel(p)}`,
          detail:
            'Jarðarber innandyra: strjúktu hvert blómhjarta mjúkt með pensli á 1–2 daga fresti. Hvert blóm hefur 200–400 frævur — annars verður berið skakkt („kattarandlit").',
          dueInDays: since !== undefined ? cadence - since : 0,
          plantId: p.id,
        });
        continue;
      }

      // Útiræktun: tómatar/paprika fá náttúrulega frjóvgun — sleppa áminningu.
      if (outdoor) continue;

      const tomato = variety ? isTomato(variety) : p.category === 'tomato';
      // Handfrjóvgun: tómatur ~3 daga fresti, paprika ~2 (vægur hristingur).
      const cadence = tomato ? 3 : 2;
      const last = lastLogForPlant(logs, 'pollinate', p.id);
      const since = last !== undefined ? daysSince(now, last) : undefined;

      if (since !== undefined && since < cadence) {
        // Nýlega frjóvgað — Rós veit það, engin „gerðu þetta núna" áminning.
        const left = cadence - since;
        insights.push({
          id: `pollinate-${p.id}`,
          kind: 'pollinate',
          severity: 'info',
          title: `${plantLabel(p)} nýlega frjóvguð`,
          detail: `Síðast frjóvgað ${since === 0 ? 'í dag' : `fyrir ${since} ${dayWord(since)}`}. Næsta handfrjóvgun eftir ~${left} ${dayWord(left)}.`,
          dueInDays: left,
          plantId: p.id,
        });
        continue;
      }

      const dueInDays = since !== undefined ? cadence - since : 0;
      if (tomato) {
        // Tómatur: buzz-pollination. Steinunn-leiðbeiningar nefna rafmagnstannbursta.
        const steinunn = (p.varietyId ?? '') === 'tomato-steinunn';
        insights.push({
          id: `pollinate-${p.id}`,
          kind: 'pollinate',
          severity: 'due',
          title: `Frjóvgaðu ${plantLabel(p)}`,
          detail: steinunn
            ? 'Steinunn í blómgun: frjóvga með rafmagnstannbursta á 2–3 daga fresti (snertu blaðstöngul/bakhlið blóms í 2–3 sek). Annars detta blómin án aldins.'
            : 'Tómatur í blómgun innandyra: frjóvga með rafmagnstannbursta eða mildum hristingi á 2–3 daga fresti. Annars detta blómin án aldins.',
          dueInDays,
          plantId: p.id,
        });
      } else {
        // Paprika er að mestu sjálffrjóvgandi — vægur gustur/hristingur hjálpar.
        insights.push({
          id: `pollinate-${p.id}`,
          kind: 'pollinate',
          severity: 'soon',
          title: `Hjálpaðu ${plantLabel(p)} að frjóvgast`,
          detail:
            'Paprika er að mestu sjálffrjóvgandi, en mildur gustur eða létt hristing á plöntunni daglega bætir aldinsetningu innandyra.',
          dueInDays,
          plantId: p.id,
        });
      }
    }
  }

  // — RENGLUR (jarðarber) —
  // Jarðarber reka út renglur; til hámarksuppskeru á að klippa þær vikulega.
  // Alpa-yrki (Fragaria vesca) mynda engar renglur og eru undanskilin.
  {
    const RUNNER_CADENCE = 7;
    const runnerPhases: GrowPhase[] = ['vegetative', 'flowering', 'fruiting', 'ripening'];
    for (const p of activePlants) {
      if (p.category !== 'strawberry') continue;
      if (!runnerPhases.includes(p.currentPhase)) continue;
      const variety = plantVariety(p);
      if (variety && isStrawberry(variety) && variety.berryType === 'alpine') continue;
      const last = lastLogForPlant(logs, 'prune', p.id);
      const since = last !== undefined ? daysSince(now, last) : undefined;
      if (since === undefined || since >= RUNNER_CADENCE) {
        insights.push({
          id: `runner-${p.id}`,
          kind: 'runner',
          severity: 'info',
          title: `Klíptu renglur af ${plantLabel(p)}`,
          detail:
            since === undefined
              ? 'Jarðarber reka út renglur (rennur). Klíptu þær af við krónuna vikulega svo orkan fari í ber, ekki í nýjar plöntur.'
              : `Síðast snyrt fyrir ${since} ${dayWord(since)}. Athugaðu renglur og klíptu þær af við krónuna — vikulega til hámarksuppskeru.`,
          plantId: p.id,
        });
      }
    }
  }

  // — UPPSKERU-ETA —
  // Áætla daga í þroska út frá daysToHarvest afbrigðis m.v. spírun/sáningu.
  {
    const harvestPhases: GrowPhase[] = ['flowering', 'fruiting', 'ripening'];
    for (const p of activePlants) {
      if (!harvestPhases.includes(p.currentPhase)) continue;
      const variety = plantVariety(p);
      if (!variety) continue;
      const [, maxDays] = variety.daysToHarvest;
      const ageDays = daysSince(now, plantStartTs(p));
      const dueInDays = maxDays - ageDays;
      if (dueInDays <= 0) {
        insights.push({
          id: `harvest-${p.id}`,
          kind: 'harvest',
          severity: 'due',
          title: `${plantLabel(p)} ætti að vera uppskerutilbúin`,
          detail: `Áætluð uppskera (${variety.commonName}: ${variety.daysToHarvest[0]}–${maxDays} dagar) er liðin. Athugaðu lit og þroska aldina.`,
          dueInDays,
          plantId: p.id,
        });
      } else if (dueInDays <= 14) {
        insights.push({
          id: `harvest-${p.id}`,
          kind: 'harvest',
          severity: 'soon',
          title: `${plantLabel(p)} nálgast uppskeru`,
          detail: `Áætlað ~${dueInDays} ${dayWord(dueInDays)} í þroska (${variety.commonName}: ${variety.daysToHarvest[0]}–${maxDays} dagar frá byrjun).`,
          dueInDays,
          plantId: p.id,
        });
      } else {
        insights.push({
          id: `harvest-${p.id}`,
          kind: 'harvest',
          severity: 'info',
          title: `Aldin á leiðinni á ${plantLabel(p)}`,
          detail: `Áætlað ~${dueInDays} ${dayWord(dueInDays)} í þroska (${variety.commonName}).`,
          dueInDays,
          plantId: p.id,
        });
      }
    }
  }

  // — GRÓÐURLJÓS (aðeins innidyra) —
  // Reykjavík: needsGrowLight(month) -> mæla með LED þennan mánuð, annars dugar náttúrubirta.
  if (growActive && !outdoor) {
    const daylight = daylightForMonth(month);
    if (needsGrowLight(month)) {
      insights.push({
        id: `light-${grow.id}`,
        kind: 'light',
        severity: 'soon',
        title: 'Gróðurljós þörf þennan mánuð',
        detail: `${daylight.name}: aðeins ~${daylight.hours} klst dagsbirta í Reykjavík. Notaðu LED 14–16 klst á dag til að halda plöntum í vexti.`,
      });
    } else {
      insights.push({
        id: `light-${grow.id}`,
        kind: 'light',
        severity: 'info',
        title: 'Náttúrubirta nægir',
        detail: `${daylight.name}: ~${daylight.hours} klst dagsbirta í Reykjavík — náttúrubirtan dugar þennan mánuð.`,
      });
    }
  }

  // — ÁRSTÍÐ & FROST (aðeins útiræktun) —
  // Útiræktun stýrist af árstíð: mánaðarráð, frostvörn fyrir uppskeru,
  // hreyking kartaflna, mygluvakt og vetrarmold fyrir fjölær jarðarber.
  // Athugið: ekki gáttað á `growActive` — útiræktun í 'planning' (t.d. nýsett
  // kartöflubeð) á samt að fá árstíða- og sáningarráð.
  if (outdoor && !grow.archived && activePlants.length > 0) {
    const season = seasonForMonth(month);
    const risk = frostRisk(month);
    const hasPotato = activePlants.some((p) => p.category === 'potato');
    const hasStrawberry = activePlants.some((p) => p.category === 'strawberry');

    // Sáning/forspírun: kartöflur sem bíða niðursetningar fá árstíðabundið ráð,
    // svo splunkuný ræktun standi ekki ráðlaus.
    const plantingPotatoes = activePlants.some(
      (p) =>
        p.category === 'potato' &&
        (p.currentPhase === 'planning' || p.currentPhase === 'germinating'),
    );
    if (plantingPotatoes) {
      if (month >= 2 && month <= 4) {
        insights.push({
          id: `plant-${grow.id}`,
          kind: 'season',
          severity: 'soon',
          title: 'Forspíraðu kartöfluútsæðið',
          detail:
            'Mars er rétti tíminn til að forspíra útsæði inni (ljóst, 10–15°C) þar til spírur eru 1–2 cm — það flýtir uppskeru um 2–4 vikur.',
        });
      } else if (month === 5 || month === 6) {
        insights.push({
          id: `plant-${grow.id}`,
          kind: 'season',
          severity: 'soon',
          title: 'Kominn tími til að setja niður',
          detail:
            'Seint í maí–júní: settu kartöflur niður 10–15 cm djúpt þegar jarðvegur er 7–10°C og frosthætta er liðin.',
        });
      }
    }

    // Frost ræðst af árstíð: á haustin -> taktu upp fyrir frost; á vorin ->
    // verðu ungar plöntur fyrir næturfrosti (ekki uppskera!).
    const growingPhases: GrowPhase[] = ['vegetative', 'flowering', 'fruiting', 'ripening', 'harvest'];
    const someGrowing = activePlants.some((p) => growingPhases.includes(p.currentPhase));
    if (someGrowing && risk !== 'none') {
      if (month >= 9) {
        insights.push({
          id: `frost-${grow.id}`,
          kind: 'frost',
          severity: risk === 'hard' ? 'due' : 'soon',
          title: risk === 'hard' ? 'Frosthætta — taktu upp núna' : 'Frost á næsta leiti',
          detail: `${season.name}: ${risk === 'hard' ? 'hörð frosthætta' : 'frosthætta á jaðri tímabils'} í Reykjavík. Taktu upp uppskeru fyrir fyrsta frost (hörð frost undir −2°C skemma hnýði og aldin).`,
        });
      } else {
        insights.push({
          id: `frost-${grow.id}`,
          kind: 'frost',
          severity: 'soon',
          title: 'Næturfrost mögulegt',
          detail: `${season.name}: enn getur gert næturfrost í Reykjavík. Verðu ungar plöntur með reyfi á köldum nóttum og bíddu með viðkvæm afbrigði þar til frosthætta er liðin.`,
        });
      }
    }

    // Hreyking kartaflna í vexti.
    if (hasPotato) {
      for (const p of activePlants) {
        if (p.category !== 'potato') continue;
        if (p.currentPhase !== 'vegetative') continue;
        const lastHill = lastLogForPlant(logs, 'prune', p.id);
        const since = lastHill !== undefined ? daysSince(now, lastHill) : undefined;
        if (since === undefined || since >= 21) {
          insights.push({
            id: `hill-${p.id}`,
            kind: 'hill',
            severity: 'soon',
            title: `Hreyktu að ${plantLabel(p)}`,
            detail:
              since === undefined
                ? 'Mokaðu mold að stönglunum þegar grös eru 15–20 cm, og aftur við 30–40 cm. Hreyking ver hnýðin gegn ljósi (grænku) og eykur uppskeru.'
                : `Síðast hreykt fyrir ${since} ${dayWord(since)}. Mokaðu mold að stönglunum aftur ef grös hafa hækkað um 15–20 cm.`,
            plantId: p.id,
          });
        }
      }
      // Mygluvakt í ágúst.
      if (month === 8) {
        insights.push({
          id: `blight-${grow.id}`,
          kind: 'info',
          severity: 'info',
          title: 'Mygluvakt',
          detail:
            'Ágúst í röku veðri er háannatími kartöflumyglu. Tryggðu loftflæði, forðastu yfirvökvun og fjarlægðu sýkt grös strax.',
        });
      }
    }

    // Vetrarmold fyrir fjölær jarðarber.
    if (hasStrawberry) {
      if (month === 10 || month === 11) {
        insights.push({
          id: `mulch-${grow.id}`,
          kind: 'mulch',
          severity: 'soon',
          title: 'Leggðu vetrarmold yfir jarðarberin',
          detail:
            'Eftir fyrstu hörðu frostin: leggðu 10–15 cm af hálmi (eða meira ef snjór er óáreiðanlegur) yfir krónurnar til að verja þær yfir veturinn.',
        });
      } else if (month === 5) {
        insights.push({
          id: `mulch-${grow.id}`,
          kind: 'mulch',
          severity: 'info',
          title: 'Fjarlægðu vetrarmoldina',
          detail:
            'Þegar jarðvegur nær ~5°C og nývöxtur byrjar (oftast seint í maí): fjarlægðu vetrarmoldina smám saman á 1–2 vikum.',
        });
      }
    }

    // Almennt mánaðarráð fyrir útiræktun.
    insights.push({
      id: `season-${grow.id}`,
      kind: 'season',
      severity: 'info',
      title: `${season.name}: útiræktun`,
      detail: season.outdoorNote,
    });
  }

  // — UMHVERFI (aðeins innidyra) —
  // Engin nýleg 'environment' skráning -> vægur hnippur um að skrá hita/raka.
  if (growActive && !outdoor) {
    const lastEnv = lastLogTs(logs, 'environment');
    const ENV_STALE_DAYS = 7;
    if (lastEnv === undefined || daysSince(now, lastEnv) >= ENV_STALE_DAYS) {
      insights.push({
        id: `env-${grow.id}`,
        kind: 'env',
        severity: 'info',
        title: 'Skráðu hita og raka',
        detail:
          lastEnv === undefined
            ? 'Engar umhverfismælingar skráðar. Skráðu hita og raka til að Rós geti gefið betri ráð.'
            : `Síðasta umhverfismæling var fyrir ${daysSince(now, lastEnv)} ${dayWord(daysSince(now, lastEnv))}. Skráðu hita og raka að nýju.`,
      });
    }
  }

  // — SPÍRUN SEINKAR —
  // Planta enn í spírun en aldur (frá sáningu/stofnun) hefur farið vel fram úr
  // efra spírunarmarki afbrigðis (+5 daga svigrúm). Líklega vandi með raka/hita.
  {
    for (const p of plantsInPhase(activePlants, 'germinating')) {
      const variety = plantVariety(p);
      if (!variety || !variety.daysToGerminate) continue;
      const [, maxGerm] = variety.daysToGerminate;
      const sownTs = p.sowDate ?? p.createdAt;
      const ageDays = daysSince(now, sownTs);
      if (ageDays > maxGerm + 5) {
        insights.push({
          id: `germin-${p.id}`,
          kind: 'info',
          severity: 'soon',
          title: `${plantLabel(p)} er sein að spíra`,
          detail: `Dagur ${ageDays} frá sáningu — afbrigðið spírar venjulega á ${variety.daysToGerminate[0]}–${maxGerm} dögum. Athugaðu að moldin haldist rök (ekki blaut) og hlý; paprika spírar best við 26–28°C. Íhugaðu að sá aftur ef ekkert bólar á spírum.`,
          plantId: p.id,
        });
      }
    }
  }

  // — MYNDAVAKT —
  // Engin (eða gömul, >= 14 daga) 'photo' skráning meðan einhver planta er komin
  // fram úr spírun -> hvetja til myndatöku svo Heilsa-sjónmat Rósar geti fylgst með.
  if (growActive) {
    const pastGerminating = activePlants.some(
      (p) => p.currentPhase !== 'germinating' && ACTIVE_PHASES.has(p.currentPhase),
    );
    if (pastGerminating) {
      const lastPhoto = lastLogTs(logs, 'photo');
      const since = lastPhoto !== undefined ? daysSince(now, lastPhoto) : undefined;
      if (since === undefined || since >= 14) {
        insights.push({
          id: `photo-${grow.id}`,
          kind: 'info',
          severity: 'info',
          title: 'Taktu mynd af plöntunum',
          detail:
            since === undefined
              ? 'Engin mynd skráð enn. Taktu mynd svo Heilsa-sjónmat Rósar geti metið vöxt og heilsu og fylgst með framvindu.'
              : `Síðasta mynd fyrir ${since} ${dayWord(since)}. Taktu nýja mynd svo Heilsa-sjónmat Rósar geti borið saman og fylgst með framvindu.`,
        });
      }
    }
  }

  // — SPUNAMAUR-VAKT (aðeins innidyra) —
  // Þurrt vetrarloft innandyra (nóv–mars) er kjörlendi spunamaurs. Vægur hnippur
  // um vikulega skoðun á bakhlið blaða og að halda rakanum uppi.
  if (growActive && !outdoor && (month >= 11 || month <= 3)) {
    insights.push({
      id: `pest-${grow.id}`,
      kind: 'info',
      severity: 'info',
      title: 'Spunamaur-vakt',
      detail:
        'Þurrt vetrarloft innandyra ýtir undir spunamaur. Skoðaðu bakhlið blaða vikulega (fínn vefur, ljósir doppóttir blettir) og haltu rakanum uppi með úðun eða rakatæki.',
    });
  }

  // Stöðug röðun: 'due' -> 'soon' -> 'info'. Innan sömu severity helst upphafleg röð.
  return stableSortBySeverity(insights);
}

/** Stöðug röðun eftir severity (Array.sort er ekki tryggt stöðug alls staðar). */
function stableSortBySeverity(items: RosInsight[]): RosInsight[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const r = severityRank(a.item.severity) - severityRank(b.item.severity);
      return r !== 0 ? r : a.index - b.index;
    })
    .map((x) => x.item);
}

/** Íslensk fleirtölu-/eintölumeðferð fyrir „dag(a)". */
function dayWord(n: number): string {
  return Math.abs(n) === 1 ? 'dag' : 'daga';
}

/**
 * Stutt dagsetning á íslensku frá tímastimpli (fellur aftur á ISO ef locale vantar).
 * Hér er Date smíðað ÚT FRÁ ts sem berst inn — engin klukkuköllun (deterministískt).
 */
function shortDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('is-IS', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

/** Stutt merki fyrir plöntu — gælunafn ef til, annars afbrigðisnafn. */
export function plantLabel(p: Plant): string {
  return p.nickname?.trim() || p.variety;
}

/** Íslenskt heiti fasa fyrir samhengistexta. */
export function phaseLabel(phase: GrowPhase): string {
  const map: Record<GrowPhase, string> = {
    planning: 'skipulag',
    germinating: 'spírun',
    seedling: 'plöntufasi',
    vegetative: 'vegfasi',
    flowering: 'blómgun',
    fruiting: 'aldin',
    ripening: 'þroski',
    harvest: 'uppskera',
    overwintering: 'vetrardvali',
    dormant: 'dvali',
    finished: 'lokið',
  };
  return map[phase];
}

/**
 * Hnitmiðaður íslenskur samhengistexti fyrir LLM (Rós).
 * Inniheldur: nafn, dag, fasa, plöntulista með fösum, síðustu vökvun/áburð,
 * nýleg minnispunkta og virkar innsýnir.
 */
export function buildContextDigest(input: EngineInput): string {
  const { grow, plants, logs, harvests, now, month } = input;
  const lines: string[] = [];

  const activePlants = plants.filter((p) => !p.archived);
  const growDay = Math.max(0, daysSince(now, grow.startDate));

  lines.push(`Ræktun: ${grow.name} (dagur ${growDay})`);
  if (grow.location) lines.push(`Staðsetning: ${grow.location}`);

  if (growIsOutdoor(grow, activePlants)) {
    const season = seasonForMonth(month);
    lines.push(
      `Útiræktun — ${season.name} (frost: ${frostRisk(month)}): ${season.outdoorNote}`,
    );
  } else {
    const daylight = daylightForMonth(month);
    lines.push(
      `Birta (${daylight.name}): ~${daylight.hours} klst — ${needsGrowLight(month) ? 'gróðurljós mælt með' : 'náttúrubirta nægir'}.`,
    );
  }

  // Plöntulisti með fösum.
  if (activePlants.length > 0) {
    lines.push('Plöntur:');
    for (const p of activePlants) {
      lines.push(`- ${plantLabel(p)} (${p.variety}) — ${phaseLabel(p.currentPhase)}`);
    }
  } else {
    lines.push('Engar virkar plöntur skráðar.');
  }

  // Síðasta vökvun / áburður.
  const lastWater = lastLogTs(logs, 'water');
  lines.push(
    lastWater !== undefined
      ? `Síðasta vökvun: fyrir ${daysSince(now, lastWater)} ${dayWord(daysSince(now, lastWater))}.`
      : 'Síðasta vökvun: engin skráð.',
  );
  const lastFeed = lastLogTs(logs, 'feed');
  lines.push(
    lastFeed !== undefined
      ? `Síðasti áburður: fyrir ${daysSince(now, lastFeed)} ${dayWord(daysSince(now, lastFeed))}.`
      : 'Síðasti áburður: enginn skráður.',
  );

  // Uppskera til þessa.
  if (harvests.length > 0) {
    const totalG = harvests.reduce((sum, h) => sum + (h.weightG || 0), 0);
    lines.push(`Uppskera til þessa: ${harvests.length} skráningar, samtals ${totalG} g.`);
  }

  // Uppskeruspá: áætlaður gluggi hverrar virkrar plöntu (deterministískt frá 'now').
  const outlookLines: string[] = [];
  for (const p of activePlants) {
    const prediction = predictHarvestWindow(p, plantVariety(p), now);
    if (!prediction) continue;
    const { daysUntilStart, windowStart } = prediction;
    const when =
      daysUntilStart <= 0
        ? 'gluggi opinn núna'
        : `gluggi opnast eftir ${daysUntilStart} ${dayWord(daysUntilStart)}`;
    outlookLines.push(`- ${plantLabel(p)}: ${when} (${shortDate(windowStart)})`);
  }
  if (outlookLines.length > 0) {
    lines.push('Uppskeruspá:');
    lines.push(...outlookLines);
  }

  // Nýlegir minnispunktar (síðustu 3 'note' skráningar).
  const notes = logs
    .filter((l) => l.type === 'note' && l.note && l.note.trim())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);
  if (notes.length > 0) {
    lines.push('Nýlegir minnispunktar:');
    for (const n of notes) {
      lines.push(`- ${n.note!.trim()}`);
    }
  }

  // Virkar innsýnir.
  const insights = computeInsights(input);
  if (insights.length > 0) {
    lines.push('Virk ráð frá Rós:');
    for (const ins of insights) {
      lines.push(`- [${ins.severity}] ${ins.title}: ${ins.detail}`);
    }
  }

  return lines.join('\n');
}
