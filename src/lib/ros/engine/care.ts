/**
 * Rós reglu-vél — umhirðu-eftirfylgni (nýtt safn, 5.5).
 *
 * Fjögur söfn sem fylgja vaxtarlotunni eftir milli kjarnaverkanna:
 *  - meindýra-/sjúkdóms-eftirfylgni (endurskoðun eftir skráningu),
 *  - fasa-hraði miðað við afbrigðaglugga (growthTrack.plantPace),
 *  - umpottunar-hnippur fyrir plöntur sem sitja lengi í sáðbakka/litlum potti,
 *  - vor-vakning fyrir jarðarber í dvala.
 *
 * Sömu hönnunarreglur og önnur söfn: HREIN föll, `now`/`month` berast inn,
 * engin klukka/IO. Skráin er ný svo indoor.ts haldist undir ~500 línum;
 * söfnunum er BÆTT AFTAST í röðina í index.ts (röðunar-samningurinn helst).
 */

import type { GrowPhase } from '@/lib/db';
import { logData } from '@/lib/logSchema';
import { plantPace, paceLabel } from '../growthTrack';
import type { RosInsight, RosSeverity } from '../types';
import {
  type EngineContext,
  dayWord,
  daysSince,
  lastLogForPlant,
  lastPestOrDisease,
  logOptionLabel,
  plantLabel,
  plantStartTs,
  plantVariety,
} from './helpers';

/** Meindýra-/sjúkdómsskráning telst „virk" (þarf eftirfylgni) innan þessa glugga. */
const PEST_FOLLOWUP_WINDOW_DAYS = 14;

/** Endurskoðunar-tíðni og alvarleiki eftir skráðu umfangi. */
function pestCadence(severity: string | undefined): { days: number; severity: RosSeverity } {
  switch (severity) {
    case 'mikil':
      return { days: 2, severity: 'due' };
    case 'midlungs':
      return { days: 4, severity: 'soon' };
    default:
      // 'litil' og óskráð umfang: róleg info-endurskoðun eftir ~viku.
      return { days: 7, severity: 'info' };
  }
}

/** — MEINDÝR/SJÚKDÓMAR: EFTIRFYLGNI — endurskoðun eftir skráningu (< 14 daga). */
export function pestFollowUpInsights(ctx: EngineContext): RosInsight[] {
  const { grow, logs, now, growActive } = ctx;
  const out: RosInsight[] = [];
  if (!growActive) return out;

  const latest = lastPestOrDisease(logs);
  if (!latest) return out;
  const age = daysSince(now, latest.timestamp);
  if (age >= PEST_FOLLOWUP_WINDOW_DAYS) return out;

  const type = latest.type as 'pest' | 'disease';
  const { kind, severity } = logData(type, latest.data);
  const cadence = pestCadence(severity);
  if (age < cadence.days) return out; // nýskráð — notandinn veit af þessu.

  const kindLabel = kind !== undefined ? logOptionLabel(type, 'kind', kind) : undefined;
  const what =
    kindLabel !== undefined
      ? kindLabel
      : type === 'pest'
        ? 'meindýr'
        : 'sjúkdóm';
  const sevLabel =
    severity !== undefined ? logOptionLabel(type, 'severity', severity).toLowerCase() : undefined;

  out.push({
    id: `pestcheck-${grow.id}`,
    kind: 'pest',
    severity: cadence.severity,
    title: type === 'pest' ? 'Athugaðu meindýrin aftur' : 'Athugaðu sjúkdóminn aftur',
    detail: `Fyrir ${age} ${dayWord(age)} skráðir þú ${what}${sevLabel ? ` (umfang: ${sevLabel})` : ''}. Skoðaðu plönturnar aftur — sérstaklega bakhlið blaða og nývöxt — og skráðu hvort ástandið hefur batnað eða versnað.`,
    plantId: latest.plantId,
  });
  return out;
}

/** „Á eftir" telst marktækt frá þessum mun (dagar fram yfir hámark gluggans). */
const PACE_BEHIND_MARGIN_DAYS = 7;

/** — FASA-HRAÐI — plantPace (growthTrack) borinn saman við afbrigðagluggann.
 * Aðeins innidyra moldarrækt: ráðin snúa að ljósi/hita sem notandinn stýrir;
 * úti ræður veðrið og Véritable er með fast LED. */
export function paceInsights(ctx: EngineContext): RosInsight[] {
  const { now, activePlants, outdoor, veritable } = ctx;
  const out: RosInsight[] = [];
  if (outdoor || veritable) return out;

  for (const p of activePlants) {
    const variety = plantVariety(p);
    const pace = plantPace(p, variety?.daysToHarvest, now);
    if (!pace) continue;

    if (pace.status === 'behind' && (pace.offsetDays ?? 0) >= PACE_BEHIND_MARGIN_DAYS) {
      out.push({
        id: `pace-${p.id}`,
        kind: 'info',
        severity: 'soon',
        title: `${plantLabel(p)} er á eftir áætlun`,
        detail: `${paceLabel(pace) ?? 'Á eftir áætlun'} — afbrigðið nær venjulega uppskeru á ${pace.window[0]}–${pace.window[1]} dögum. Algengustu skýringar innandyra eru of lítil birta eða of svalt: athugaðu ljóstímann (14–16 klst LED) og að hitinn haldist innan fasa-bands.`,
        plantId: p.id,
      });
    } else if (pace.status === 'ahead' && pace.offsetDays !== null) {
      out.push({
        id: `pace-${p.id}`,
        kind: 'info',
        severity: 'info',
        title: `${plantLabel(p)} er á undan áætlun`,
        detail: `${paceLabel(pace) ?? 'Á undan áætlun'} — plantan er þegar komin að þroska/uppskeru. Vel gert! Haltu umhverfinu stöðugu meðan aldinin klárast.`,
        plantId: p.id,
      });
    }
  }
  return out;
}

/** Umpottunar-gluggi: nógu gömul til að þurfa pláss, ekki svo gömul að hnippurinn sé orðinn úreltur. */
const TRANSPLANT_MIN_AGE_DAYS = 28;
const TRANSPLANT_MAX_AGE_DAYS = 120;
const TRANSPLANT_PHASES: ReadonlySet<GrowPhase> = new Set<GrowPhase>(['seedling', 'vegetative']);

/** — UMPOTTUN — planta í plöntu-/vegfasa, aldrei umpottuð (hvorki transplantDate
 * né 'transplant'-skráning) og komin yfir ~4 vikur → einu sinni-stíls hnippur.
 * Á ekki við úti (beint í beð) né í Véritable (Lingot er aldrei umpottað). */
export function transplantInsights(ctx: EngineContext): RosInsight[] {
  const { logs, now, activePlants, growActive, outdoor, veritable } = ctx;
  const out: RosInsight[] = [];
  if (!growActive || outdoor || veritable) return out;

  for (const p of activePlants) {
    if (!TRANSPLANT_PHASES.has(p.currentPhase)) continue;
    if (p.category === 'potato') continue; // kartöflur eru hreyktar, ekki umpottaðar.
    if (p.transplantDate !== undefined) continue;
    if (lastLogForPlant(logs, 'transplant', p.id) !== undefined) continue;
    const ageDays = daysSince(now, plantStartTs(p));
    if (ageDays < TRANSPLANT_MIN_AGE_DAYS || ageDays > TRANSPLANT_MAX_AGE_DAYS) continue;
    out.push({
      id: `transplant-${p.id}`,
      kind: 'transplant',
      severity: 'soon',
      title: `Íhugaðu að umpotta ${plantLabel(p)}`,
      detail: `Plantan er ${ageDays} ${dayWord(ageDays)} gömul og engin umpottun skráð. Rætur sem fylla pottinn hægja á vexti — færðu hana í stærri pott (rótarhnaus í sömu dýpt) og vökvaðu vel á eftir.`,
      plantId: p.id,
    });
  }
  return out;
}

/** — VOR-VAKNING (jarðarber) — mars–maí og planta enn í dvala/vetrardvala.
 * ATH: gáttar EKKI á growActive — ræktun þar sem allar plöntur eru í dvala
 * telst óvirk, en einmitt þá þarf þetta hnipp. */
export function springWakeInsights(ctx: EngineContext): RosInsight[] {
  const { grow, month, activePlants } = ctx;
  const out: RosInsight[] = [];
  if (grow.archived) return out;
  if (month < 3 || month > 5) return out;

  for (const p of activePlants) {
    if (p.category !== 'strawberry') continue;
    if (p.currentPhase !== 'overwintering' && p.currentPhase !== 'dormant') continue;
    out.push({
      id: `wake-${p.id}`,
      kind: 'season',
      severity: 'soon',
      title: `Vektu ${plantLabel(p)} úr dvala`,
      detail:
        'Vorið er komið: taktu jarðarberið úr dvala — klipptu dauð og brún blöð frá krónunni, skiptu um efsta lag moldar ef hún er þreytt og byrjaðu að vökva varlega. Settu plöntuna í birtu og uppfærðu fasann þegar nývöxtur sést.',
      plantId: p.id,
    });
  }
  return out;
}
