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
import { varietyByName, varietyById, isTomato } from '@/lib/varieties';
import type { RosInsight, RosSeverity } from './types';

const DAY_MS = 1000 * 60 * 60 * 24;

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

  // — VÖKVUN —
  // Finndu síðustu vökvun; berðu saman við tíðni eftir fasa/staðsetningu.
  {
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
  // Á veg/blóma/aldinfasa: mælt með áburði á ~7 daga fresti m.v. síðasta 'feed'.
  {
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

  // — GRÓÐURLJÓS —
  // Reykjavík: needsGrowLight(month) -> mæla með LED þennan mánuð, annars dugar náttúrubirta.
  if (growActive) {
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

  // — UMHVERFI —
  // Engin nýleg 'environment' skráning -> vægur hnippur um að skrá hita/raka.
  if (growActive) {
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

/** Stutt merki fyrir plöntu — gælunafn ef til, annars afbrigðisnafn. */
function plantLabel(p: Plant): string {
  return p.nickname?.trim() || p.variety;
}

/** Íslenskt heiti fasa fyrir samhengistexta. */
function phaseLabel(phase: GrowPhase): string {
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

  const daylight = daylightForMonth(month);
  lines.push(
    `Birta (${daylight.name}): ~${daylight.hours} klst — ${needsGrowLight(month) ? 'gróðurljós mælt með' : 'náttúrubirta nægir'}.`,
  );

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
