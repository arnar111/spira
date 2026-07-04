/**
 * Rós reglu-vél — samhengistexti fyrir LLM (4.4 klofningur).
 *
 * buildContextDigest dregur saman hnitmiðaðan íslenskan texta um ræktunina sem
 * fer til /api/ros. Beinn, vélrænn útdráttur úr gamla engine.ts. Kallar
 * computeInsights úr ./index — köllunin gerist á keyrslutíma, svo hringtilvísunin
 * milli digest og index er skaðlaus.
 */

import type { Plant } from '@/lib/db';
import { needsGrowLight, daylightForMonth } from '@/lib/daylight';
import { seasonForMonth, frostRisk, growIsOutdoor } from '@/lib/season';
import { envTargetForPhase, formatBand } from '@/lib/envTargets';
import { logData } from '@/lib/logSchema';
import { resolveCare } from '@/lib/varieties';
import { predictHarvestWindow } from '../predict';
import {
  type EngineInput,
  dayWord,
  daysSince,
  furthestPlant,
  growIsVeritable,
  lastEc,
  lastLogOfType,
  lastLogTs,
  lastPestOrDisease,
  lastPh,
  logOptionLabel,
  num,
  phaseLabel,
  plantLabel,
  plantStartTs,
  plantVariety,
} from './helpers';
import { shortDate } from '@/lib/dates';
import { computeInsights } from './index';

/** Íslensk lýsing á uppruna plöntu (StartedFrom). Fellur aftur á hrátt gildi. */
function startedFromLabel(from: Plant['startedFrom']): string {
  switch (from) {
    case 'seed':
      return 'fræ';
    case 'seedling':
      return 'forræktuð planta';
    case 'clone':
      return 'græðlingur';
    case 'purchased':
      return 'keypt planta';
    default:
      return from;
  }
}

/** Íslensk mánaðanöfn fyrir dagsetningarlínuna (handvirkt — engin locale-háð köllun). */
const MONTHS_IS = [
  'janúar',
  'febrúar',
  'mars',
  'apríl',
  'maí',
  'júní',
  'júlí',
  'ágúst',
  'september',
  'október',
  'nóvember',
  'desember',
];

/** „í dag" / „fyrir N dögum"-stubbur fyrir aldur skráningar. */
function ago(days: number): string {
  return days === 0 ? 'í dag' : `fyrir ${days} ${dayWord(days)}`;
}

/** Fyrsta setning umhirðu-samantektar (fellur á allan textann ef enginn punktur). */
function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]*[.!?]/);
  return (m ? m[0] : text).trim();
}

/**
 * Hnitmiðaður íslenskur samhengistexti fyrir LLM (Rós).
 * Inniheldur: nafn, dag, fasa, plöntulista með fösum, síðustu vökvun/áburð,
 * nýleg minnispunkta og virkar innsýnir.
 */
export function buildContextDigest(input: EngineInput): string {
  const { grow, plants, logs, harvests, now, month, focusPlant } = input;
  const lines: string[] = [];

  const activePlants = plants.filter((p) => !p.archived);
  const growDay = Math.max(0, daysSince(now, grow.startDate));

  lines.push(`Ræktun: ${grow.name} (dagur ${growDay})`);
  // Ísland er á UTC allt árið — UTC-lesarar halda fallinu hreinu og deterministic.
  const nowDate = new Date(now);
  lines.push(
    `Dagsetning: ${nowDate.getUTCDate()}. ${MONTHS_IS[nowDate.getUTCMonth()]} ${nowDate.getUTCFullYear()}.`,
  );
  if (focusPlant) {
    lines.push(
      `Spjall um eina plöntu: ${plantLabel(focusPlant)} (${focusPlant.variety}) — fasi ${phaseLabel(focusPlant.currentPhase)}.`,
    );
  }
  if (grow.location) lines.push(`Staðsetning: ${grow.location}`);

  const veritable = growIsVeritable(grow);
  const outdoor = !veritable && growIsOutdoor(grow, activePlants);

  if (veritable) {
    // Véritable: LLM verður að ráðleggja út frá óvirkri vatnsrækt — EKKI moldarækt.
    lines.push(
      'Kerfi: Véritable SMART — innbyggður vatnsræktar-pottagarður (passiv vatnsrækt).',
    );
    lines.push(
      'Þetta er EKKI moldarækt: plönturnar standa í Lingot-pottum (mór/kókos/perlít) og fá vatn sjálfvirkt um hárpípu-dúka úr 2 lítra tanki — engin handvökvun á mold. Innbyggt LED keyrir fast ~16 klst/dag, svo ekkert auka-gróðurljós þarf óháð birtu úti. Innbyggð Lingot-næring dugar í ~12 vikur; aðeins aldinplöntur ≥ 8 vikna þurfa viðbótar fljótandi áburð í tankinn. Tankinn þarf að athuga á ~3 daga fresti og fylla á 7–14 daga fresti (eftir álagi). Öll ráð verða að miðast við óvirka vatnsrækt, ekki moldarmenningu.',
    );
  } else if (outdoor) {
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

  // Plöntulisti með fösum — eða ítarlegur fókus-kafli ef spjall snýst um eina plöntu.
  if (focusPlant) {
    const p = focusPlant;
    lines.push('Planta í fókus:');
    const ageDays = daysSince(now, plantStartTs(p));
    lines.push(`- Aldur: ${ageDays} ${dayWord(ageDays)}`);
    lines.push(`- Uppruni: ${startedFromLabel(p.startedFrom)}`);
    lines.push(`- Afbrigði: ${p.variety}`);
    if (p.nickname?.trim()) lines.push(`- Gælunafn: ${p.nickname.trim()}`);
    if (p.sowDate !== undefined) lines.push(`- Sáning: ${shortDate(p.sowDate)}`);
    if (p.germinatedDate !== undefined) lines.push(`- Spírun: ${shortDate(p.germinatedDate)}`);
    if (p.transplantDate !== undefined) lines.push(`- Umpottun: ${shortDate(p.transplantDate)}`);

    // Stutt umhirðu-samantekt afbrigðisins (resolveCare) — hnitmiðuð heimild fyrir LLM.
    const care = resolveCare(plantVariety(p));
    if (care) {
      lines.push(`Umhirða afbrigðis: ${firstSentence(care.summary)}`);
      if (care.watering.length > 0) lines.push(`- Vökvun: ${care.watering[0]}`);
      const fert = care.fertilizer[0];
      if (fert) lines.push(`- Næring: ${fert.npk} — ${fert.freq.toLowerCase()}`);
      const light = care.targets.find((t) => t.label.startsWith('Ljós'));
      if (light) lines.push(`- Ljós: ${light.value}`);
    }
  } else if (activePlants.length > 0) {
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

  // Síðasta aldintalning (fruitCount á frjóvgunar-skráningum) — fóður í uppskerumat.
  let lastFruitCount: { count: number; ts: number } | undefined;
  for (const l of logs) {
    if (l.type !== 'pollinate') continue;
    const fc = logData('pollinate', l.data).fruitCount;
    if (fc === undefined) continue;
    if (lastFruitCount === undefined || l.timestamp > lastFruitCount.ts) {
      lastFruitCount = { count: fc, ts: l.timestamp };
    }
  }
  if (lastFruitCount) {
    lines.push(
      `Síðasta aldintalning: ${num(lastFruitCount.count)} aldin (${ago(daysSince(now, lastFruitCount.ts))}).`,
    );
  }

  // — Umhverfi: nýjustu mælingar + aldur, og markgildi fasans (aðeins innidyra). —
  const envLines: string[] = [];
  const envLog = lastLogOfType(logs, 'environment');
  if (envLog) {
    const env = logData('environment', envLog.data);
    const parts: string[] = [];
    if (env.tempC !== undefined) parts.push(`hiti ${num(env.tempC)}°C`);
    if (env.humidityPct !== undefined) parts.push(`raki ${num(env.humidityPct)}%`);
    if (env.lightHours !== undefined) parts.push(`ljós ${num(env.lightHours)} klst`);
    if (parts.length > 0) {
      envLines.push(`- Mæling (${ago(daysSince(now, envLog.timestamp))}): ${parts.join(', ')}`);
    }
  }
  const ph = lastPh(logs);
  if (ph) envLines.push(`- pH ${num(ph.value)} (${ago(daysSince(now, ph.ts))})`);
  const ec = lastEc(logs);
  if (ec) envLines.push(`- EC ${num(ec.value)} mS/cm (${ago(daysSince(now, ec.ts))})`);
  if (!outdoor && activePlants.length > 0) {
    const lead = furthestPlant(activePlants);
    if (lead) {
      const target = envTargetForPhase(lead.currentPhase, lead.category);
      const bandParts = [
        `hiti ${formatBand(target.tempC, '°C')}`,
        `raki ${formatBand(target.humidityPct, '%')}`,
      ];
      if (target.ec) bandParts.push(`EC ${formatBand(target.ec, ' mS/cm')}`);
      envLines.push(`- Markgildi (${phaseLabel(lead.currentPhase)}): ${bandParts.join(', ')}`);
    }
  }
  if (envLines.length > 0) {
    lines.push('Umhverfi:');
    lines.push(...envLines);
  }

  // Nýjasta meindýra-/sjúkdómsskráning (innan 21 dags) — mikilvæg heimild fyrir ráð.
  const pd = lastPestOrDisease(logs);
  if (pd) {
    const pdAge = daysSince(now, pd.timestamp);
    if (pdAge <= 21) {
      const pdType = pd.type as 'pest' | 'disease';
      const data = logData(pdType, pd.data);
      const kindLabel =
        data.kind !== undefined
          ? logOptionLabel(pdType, 'kind', data.kind)
          : pdType === 'pest'
            ? 'meindýr'
            : 'sjúkdómur';
      const sev =
        data.severity !== undefined
          ? `, umfang ${logOptionLabel(pdType, 'severity', data.severity).toLowerCase()}`
          : '';
      const det = data.detail ? ` — ${data.detail}` : '';
      lines.push(
        `${pdType === 'pest' ? 'Meindýr' : 'Sjúkdómur'} (${ago(pdAge)}): ${kindLabel}${sev}${det}.`,
      );
    }
  }

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
  // flatMap síar OG þrengir í senn — engin non-null fullyrðing (4.3).
  const notes = logs
    .flatMap((l) => {
      if (l.type !== 'note') return [];
      const note = l.note?.trim();
      return note ? [{ note, timestamp: l.timestamp }] : [];
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);
  if (notes.length > 0) {
    lines.push('Nýlegir minnispunktar:');
    for (const n of notes) {
      lines.push(`- ${n.note}`);
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
