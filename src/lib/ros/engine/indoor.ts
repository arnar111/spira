/**
 * Rós reglu-vél — innidyra vaxtarlotu-innsýnir (4.4 klofningur).
 *
 * Söfn fyrir kjarna vaxtarlotunnar innandyra: vökvun, áburður, toppun, frjóvgun,
 * renglur, uppskeru-ETA og gróðurljós. Umhverfis-/heilsuvaktin (raki, pH, myndir,
 * spunamaur) býr í indoorEnv.ts. Beinn, vélrænn útdráttur úr gamla `computeInsights`
 * — engin hegðunarbreyting; röðun er varðveitt af index.ts.
 */

import type { GrowPhase } from '@/lib/db';
import { needsGrowLight, daylightForMonth } from '@/lib/daylight';
import { isTomato, isStrawberry } from '@/lib/varieties';
import type { RosInsight } from '../types';
import {
  type EngineContext,
  STRAWBERRY_DEBLOSSOM_DAYS,
  dayWord,
  daysSince,
  lastLogForPlant,
  lastLogTs,
  plantLabel,
  plantStartTs,
  plantVariety,
  plantsInPhase,
  wateringCadenceDays,
} from './helpers';

/** — VÖKVUN — innidyra (ekki útiræktun, ekki Véritable). */
export function waterInsights(ctx: EngineContext): RosInsight[] {
  const { grow, logs, now, activePlants, growActive, outdoor, veritable } = ctx;
  const out: RosInsight[] = [];
  if (!outdoor && !veritable) {
    const cadence = wateringCadenceDays(grow, activePlants);
    const lastWater = lastLogTs(logs, 'water');
    if (lastWater === undefined) {
      // Aldrei vökvað en grow virkt -> tímabært.
      if (growActive) {
        out.push({
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
        out.push({
          id: `water-${grow.id}`,
          kind: 'water',
          severity: 'due',
          title: 'Tími til að vökva',
          detail: `Síðast vökvað fyrir ${since} ${dayWord(since)}. Mælt er með vökvun á ~${cadence} daga fresti hér. Fingurpróf áður en þú vökvar.`,
          dueInDays,
        });
      } else if (dueInDays <= 1) {
        out.push({
          id: `water-${grow.id}`,
          kind: 'water',
          severity: 'soon',
          title: 'Vökvun á næsta leiti',
          detail: `Síðast vökvað fyrir ${since} ${dayWord(since)}. Næsta vökvun líklega á morgun — athugaðu rakann.`,
          dueInDays,
        });
      } else if (growActive) {
        out.push({
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
  return out;
}

/** — ÁBURÐUR — innidyra á veg/blóma/aldinfasa. */
export function feedInsights(ctx: EngineContext): RosInsight[] {
  const { grow, logs, now, activePlants, outdoor, veritable } = ctx;
  const out: RosInsight[] = [];
  if (!outdoor && !veritable) {
    const feedPhases: GrowPhase[] = ['vegetative', 'flowering', 'fruiting'];
    const needsFeed = activePlants.some((p) => feedPhases.includes(p.currentPhase));
    if (needsFeed) {
      const FEED_CADENCE = 7;
      const lastFeed = lastLogTs(logs, 'feed');
      if (lastFeed === undefined) {
        out.push({
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
          out.push({
            id: `feed-${grow.id}`,
            kind: 'feed',
            severity: 'due',
            title: 'Tími til að gefa áburð',
            detail: `Síðast gefið fyrir ${since} ${dayWord(since)}. Mælt með áburði á ~${FEED_CADENCE} daga fresti á þessum fasa.`,
            dueInDays,
          });
        } else if (dueInDays <= 1) {
          out.push({
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
  return out;
}

/** — TOPPUN — paprika í vegfasa með skynsamlegan aldur, ótoppuð. */
export function toppingInsights(ctx: EngineContext): RosInsight[] {
  const { logs, now, activePlants } = ctx;
  const out: RosInsight[] = [];
  for (const p of plantsInPhase(activePlants, 'vegetative')) {
    if (p.category !== 'pepper') continue; // Tómatur/dvergur: sleppa toppun.
    const variety = plantVariety(p);
    if (variety && isTomato(variety)) continue;
    const alreadyTopped = lastLogForPlant(logs, 'top', p.id) !== undefined;
    if (alreadyTopped) continue;
    const ageDays = daysSince(now, plantStartTs(p));
    // Skynsamlegur gluggi: nógu gömul til að þola toppun en ekki of langt í veg.
    if (ageDays >= 30 && ageDays <= 75) {
      out.push({
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
  return out;
}

/** — FRJÓVGUN — plöntur í blómgun innandyra (handfrjóvgun) + jarðarberja-deblossom. */
export function pollinationInsights(ctx: EngineContext): RosInsight[] {
  const { logs, now, activePlants, outdoor } = ctx;
  const out: RosInsight[] = [];
  const flowering = plantsInPhase(activePlants, 'flowering');
  for (const p of flowering) {
    const variety = plantVariety(p);

    // — JARÐARBER —
    // Ung planta: fjarlægja fyrstu blóm (deblossom). Eldri: pensilfrjóvgun ~2 daga fresti.
    const straw = variety ? isStrawberry(variety) : p.category === 'strawberry';
    if (straw) {
      const ageDays = daysSince(now, plantStartTs(p));
      if (ageDays < STRAWBERRY_DEBLOSSOM_DAYS) {
        out.push({
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
        out.push({
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
      out.push({
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
      out.push({
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
      out.push({
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
      out.push({
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
  return out;
}

/** — RENGLUR (jarðarber) — klippa vikulega til hámarksuppskeru (ekki alpa-yrki). */
export function runnerInsights(ctx: EngineContext): RosInsight[] {
  const { logs, now, activePlants } = ctx;
  const out: RosInsight[] = [];
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
      out.push({
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
  return out;
}

/** — UPPSKERU-ETA — áætla daga í þroska út frá daysToHarvest. */
export function harvestEtaInsights(ctx: EngineContext): RosInsight[] {
  const { now, activePlants } = ctx;
  const out: RosInsight[] = [];
  const harvestPhases: GrowPhase[] = ['flowering', 'fruiting', 'ripening'];
  for (const p of activePlants) {
    if (!harvestPhases.includes(p.currentPhase)) continue;
    const variety = plantVariety(p);
    if (!variety) continue;
    const [, maxDays] = variety.daysToHarvest;
    const ageDays = daysSince(now, plantStartTs(p));
    const dueInDays = maxDays - ageDays;
    if (dueInDays <= 0) {
      out.push({
        id: `harvest-${p.id}`,
        kind: 'harvest',
        severity: 'due',
        title: `${plantLabel(p)} ætti að vera uppskerutilbúin`,
        detail: `Áætluð uppskera (${variety.commonName}: ${variety.daysToHarvest[0]}–${maxDays} dagar) er liðin. Athugaðu lit og þroska aldina.`,
        dueInDays,
        plantId: p.id,
      });
    } else if (dueInDays <= 14) {
      out.push({
        id: `harvest-${p.id}`,
        kind: 'harvest',
        severity: 'soon',
        title: `${plantLabel(p)} nálgast uppskeru`,
        detail: `Áætlað ~${dueInDays} ${dayWord(dueInDays)} í þroska (${variety.commonName}: ${variety.daysToHarvest[0]}–${maxDays} dagar frá byrjun).`,
        dueInDays,
        plantId: p.id,
      });
    } else {
      out.push({
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
  return out;
}

/** — GRÓÐURLJÓS — aðeins innidyra (ekki Véritable), árstíðabundið. */
export function lightInsights(ctx: EngineContext): RosInsight[] {
  const { grow, month, growActive, outdoor, veritable } = ctx;
  const out: RosInsight[] = [];
  if (growActive && !outdoor && !veritable) {
    const daylight = daylightForMonth(month);
    if (needsGrowLight(month)) {
      out.push({
        id: `light-${grow.id}`,
        kind: 'light',
        severity: 'soon',
        title: 'Gróðurljós þörf þennan mánuð',
        detail: `${daylight.name}: aðeins ~${daylight.hours} klst dagsbirta í Reykjavík. Notaðu LED 14–16 klst á dag til að halda plöntum í vexti.`,
      });
    } else {
      out.push({
        id: `light-${grow.id}`,
        kind: 'light',
        severity: 'info',
        title: 'Náttúrubirta nægir',
        detail: `${daylight.name}: ~${daylight.hours} klst dagsbirta í Reykjavík — náttúrubirtan dugar þennan mánuð.`,
      });
    }
  }
  return out;
}
