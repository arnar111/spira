/**
 * Rós reglu-vél — innidyra umhverfis-/heilsuvakt (4.4 klofningur).
 *
 * Söfn sem byggja á umhverfislestrum og plöntuástandi: rakaskráning, hita/raka-
 * bönd, pH, sein spírun, myndavakt og spunamaur. Beinn, vélrænn útdráttur úr gamla
 * `computeInsights` — engin hegðunarbreyting. Aðskilið frá indoor.ts (vaxtarlotan)
 * til að halda hvorri skrá vel undir ~500 línum.
 */

import { envTargetForPhase, bandStatus, formatBand } from '@/lib/envTargets';
import { logData } from '@/lib/logSchema';
import type { RosInsight } from '../types';
import {
  type EngineContext,
  ACTIVE_PHASES,
  ENV_FRESH_MS,
  PH_MAX,
  PH_MIN,
  dayWord,
  daysSince,
  furthestPhase,
  lastLogOfType,
  lastLogTs,
  lastPh,
  num,
  plantLabel,
  plantVariety,
  plantsInPhase,
} from './helpers';

/** — UMHVERFI (innidyra) — vægur hnippur ef engin nýleg umhverfis-skráning. */
export function envStaleInsights(ctx: EngineContext): RosInsight[] {
  const { grow, logs, now, growActive, outdoor } = ctx;
  const out: RosInsight[] = [];
  if (growActive && !outdoor) {
    const lastEnv = lastLogTs(logs, 'environment');
    const ENV_STALE_DAYS = 7;
    if (lastEnv === undefined || daysSince(now, lastEnv) >= ENV_STALE_DAYS) {
      out.push({
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
  return out;
}

/** — HITI/RAKI UTAN FASA-MARKA (innidyra) — nýlegur lestur vs envTargets. */
export function envBandInsights(ctx: EngineContext): RosInsight[] {
  const { grow, logs, now, activePlants, growActive, outdoor, veritable } = ctx;
  const out: RosInsight[] = [];
  if (growActive && !outdoor && !veritable) {
    const envLog = lastLogOfType(logs, 'environment');
    if (envLog && now - envLog.timestamp <= ENV_FRESH_MS) {
      const phase = furthestPhase(activePlants);
      const target = envTargetForPhase(phase);
      const { tempC: temp, humidityPct: humidity } = logData('environment', envLog.data);

      if (temp !== undefined) {
        const status = bandStatus(temp, target.tempC);
        if (status !== 'in') {
          out.push({
            id: `envband-temp-${grow.id}`,
            kind: 'envBand',
            severity: 'soon',
            title: status === 'low' ? 'Hiti undir marki' : 'Hiti yfir marki',
            detail: `Mældur hiti ${num(temp)}°C er ${status === 'low' ? 'undir' : 'yfir'} ráðlögðu bili (${formatBand(target.tempC, '°C')}) á þessum fasa. ${target.note}`,
          });
        }
      }
      if (humidity !== undefined) {
        const status = bandStatus(humidity, target.humidityPct);
        if (status !== 'in') {
          out.push({
            id: `envband-hum-${grow.id}`,
            kind: 'envBand',
            severity: 'soon',
            title: status === 'low' ? 'Raki undir marki' : 'Raki yfir marki',
            detail: `Mældur raki ${num(humidity)}% er ${status === 'low' ? 'undir' : 'yfir'} ráðlögðu bili (${formatBand(target.humidityPct, '%')}) á þessum fasa. ${target.note}`,
          });
        }
      }
    }
  }
  return out;
}

/** — SÝRUSTIG (pH) UTAN BILS — innidyra (mold + Véritable). */
export function phInsights(ctx: EngineContext): RosInsight[] {
  const { grow, logs, growActive, outdoor } = ctx;
  const out: RosInsight[] = [];
  if (growActive && !outdoor) {
    const ph = lastPh(logs);
    if (ph && (ph.value < PH_MIN || ph.value > PH_MAX)) {
      const lowSide = ph.value < PH_MIN;
      out.push({
        id: `ph-${grow.id}`,
        kind: 'ph',
        severity: 'info',
        title: lowSide ? 'pH of lágt' : 'pH of hátt',
        detail: `Síðasta skráða pH var ${num(ph.value)} — ${lowSide ? 'undir' : 'yfir'} ráðlögðu bili (${PH_MIN}–${PH_MAX}). Utan þess læsist upptaka næringarefna (t.d. járn/kalk). Leiðréttu vatnið/næringarlausnina að næsta sinni.`,
      });
    }
  }
  return out;
}

/** — SPÍRUN SEINKAR — planta enn í spírun langt fram úr efra marki afbrigðis. */
export function germinationInsights(ctx: EngineContext): RosInsight[] {
  const { now, activePlants } = ctx;
  const out: RosInsight[] = [];
  for (const p of plantsInPhase(activePlants, 'germinating')) {
    const variety = plantVariety(p);
    if (!variety || !variety.daysToGerminate) continue;
    const [, maxGerm] = variety.daysToGerminate;
    const sownTs = p.sowDate ?? p.createdAt;
    const ageDays = daysSince(now, sownTs);
    if (ageDays > maxGerm + 5) {
      out.push({
        id: `germin-${p.id}`,
        kind: 'info',
        severity: 'soon',
        title: `${plantLabel(p)} er sein að spíra`,
        detail: `Dagur ${ageDays} frá sáningu — afbrigðið spírar venjulega á ${variety.daysToGerminate[0]}–${maxGerm} dögum. Athugaðu að moldin haldist rök (ekki blaut) og hlý; paprika spírar best við 26–28°C. Íhugaðu að sá aftur ef ekkert bólar á spírum.`,
        plantId: p.id,
      });
    }
  }
  return out;
}

/** — MYNDAVAKT — hvetja til myndatöku ef engin/gömul mynd og planta komin fram úr spírun. */
export function photoInsights(ctx: EngineContext): RosInsight[] {
  const { grow, logs, now, activePlants, growActive } = ctx;
  const out: RosInsight[] = [];
  if (growActive) {
    const pastGerminating = activePlants.some(
      (p) => p.currentPhase !== 'germinating' && ACTIVE_PHASES.has(p.currentPhase),
    );
    if (pastGerminating) {
      const lastPhoto = lastLogTs(logs, 'photo');
      const since = lastPhoto !== undefined ? daysSince(now, lastPhoto) : undefined;
      if (since === undefined || since >= 14) {
        out.push({
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
  return out;
}

/** — SPUNAMAUR-VAKT (innidyra) — árstíðabundin + raki-næm útfærsla. */
export function spiderMiteInsights(ctx: EngineContext): RosInsight[] {
  const { grow, logs, now, month, growActive, outdoor, veritable } = ctx;
  const out: RosInsight[] = [];
  if (growActive && !outdoor && !veritable) {
    const envLog = lastLogOfType(logs, 'environment');
    const humidity =
      envLog && now - envLog.timestamp <= ENV_FRESH_MS
        ? logData('environment', envLog.data).humidityPct
        : undefined;
    const veryDry = humidity !== undefined && humidity < 45;
    const winterDry = month >= 11 || month <= 3;
    if (veryDry) {
      out.push({
        id: `pest-${grow.id}`,
        kind: 'pest',
        severity: 'soon',
        title: 'Þurrt loft — spunamaurhætta',
        detail: `Mældur raki er aðeins ${num(humidity)}% — þurrt loft ýtir undir spunamaur. Skoðaðu bakhlið blaða (fínn vefur, ljósir doppóttir blettir) og hækkaðu rakann með úðun eða rakatæki upp í a.m.k. 50%.`,
      });
    } else if (winterDry) {
      out.push({
        id: `pest-${grow.id}`,
        kind: 'pest',
        severity: 'info',
        title: 'Spunamaur-vakt',
        detail:
          'Þurrt vetrarloft innandyra ýtir undir spunamaur. Skoðaðu bakhlið blaða vikulega (fínn vefur, ljósir doppóttir blettir) og haltu rakanum uppi með úðun eða rakatæki.',
      });
    }
  }
  return out;
}
