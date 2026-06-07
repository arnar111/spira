/**
 * Rós reglu-vél — samhengistexti fyrir LLM (4.4 klofningur).
 *
 * buildContextDigest dregur saman hnitmiðaðan íslenskan texta um ræktunina sem
 * fer til /api/ros. Beinn, vélrænn útdráttur úr gamla engine.ts. Kallar
 * computeInsights úr ./index — köllunin gerist á keyrslutíma, svo hringtilvísunin
 * milli digest og index er skaðlaus.
 */

import { needsGrowLight, daylightForMonth } from '@/lib/daylight';
import { seasonForMonth, frostRisk, growIsOutdoor } from '@/lib/season';
import { predictHarvestWindow } from '../predict';
import {
  type EngineInput,
  dayWord,
  daysSince,
  growIsVeritable,
  lastLogTs,
  phaseLabel,
  plantLabel,
  plantVariety,
} from './helpers';
import { shortDate } from '@/lib/dates';
import { computeInsights } from './index';

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

  if (growIsVeritable(grow)) {
    // Véritable: LLM verður að ráðleggja út frá óvirkri vatnsrækt — EKKI moldarækt.
    lines.push(
      'Kerfi: Véritable SMART — innbyggður vatnsræktar-pottagarður (passiv vatnsrækt).',
    );
    lines.push(
      'Þetta er EKKI moldarækt: plönturnar standa í Lingot-pottum (mór/kókos/perlít) og fá vatn sjálfvirkt um hárpípu-dúka úr 2 lítra tanki — engin handvökvun á mold. Innbyggt LED keyrir fast ~16 klst/dag, svo ekkert auka-gróðurljós þarf óháð birtu úti. Innbyggð Lingot-næring dugar í ~12 vikur; aðeins aldinplöntur ≥ 8 vikna þurfa viðbótar fljótandi áburð í tankinn. Tankinn þarf að athuga á ~3 daga fresti og fylla á 7–14 daga fresti (eftir álagi). Öll ráð verða að miðast við óvirka vatnsrækt, ekki moldarmenningu.',
    );
  } else if (growIsOutdoor(grow, activePlants)) {
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
