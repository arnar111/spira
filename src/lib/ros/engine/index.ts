/**
 * Rós reglu-vél — orchestration (4.4 klofningur).
 *
 * computeInsights byggir sameiginlegt samhengi og kallar innsýnasöfnin í NÁKVÆMLEGA
 * sömu röð og gamla einþætta fallið, skeytir niðurstöðunum saman og raðar með
 * stableSortBySeverity. Þar sem röðunin er stöðug innan severity verður útkoman
 * bæði-fyrir-bita eins og áður (engin hegðunarbreyting — 4.2/3.4 prófin sanna það).
 */

import { growIsOutdoor } from '@/lib/season';
import type { RosInsight } from '../types';
import {
  type EngineContext,
  type EngineInput,
  ACTIVE_PHASES,
  growIsVeritable,
  stableSortBySeverity,
} from './helpers';
import {
  feedInsights,
  harvestEtaInsights,
  lightInsights,
  pollinationInsights,
  runnerInsights,
  toppingInsights,
  waterInsights,
} from './indoor';
import {
  ecInsights,
  envBandInsights,
  envStaleInsights,
  germinationInsights,
  phInsights,
  photoInsights,
  spiderMiteInsights,
} from './indoorEnv';
import { outdoorInsights } from './outdoor';
import { veritableInsights } from './veritable';
import {
  paceInsights,
  pestFollowUpInsights,
  springWakeInsights,
  transplantInsights,
} from './care';

/**
 * Reiknar allar virkar innsýnir fyrir eitt grow.
 * Skilar röðuðu fylki: 'due' fyrst, svo 'soon', svo 'info' (stöðug röðun).
 */
export function computeInsights(input: EngineInput): RosInsight[] {
  const { grow, plants } = input;

  const activePlants = plants.filter((p) => !p.archived);
  const growActive =
    !grow.archived && activePlants.some((p) => ACTIVE_PHASES.has(p.currentPhase));
  const outdoor = growIsOutdoor(grow, activePlants);
  const veritable = growIsVeritable(grow);

  const ctx: EngineContext = {
    ...input,
    activePlants,
    growActive,
    outdoor,
    veritable,
  };

  // RÖÐ SKIPTIR MÁLI: sama efsta-til-neðsta röð og í upprunalega fallinu, svo
  // stableSortBySeverity skili sömu útkomu bita-fyrir-bita.
  const insights: RosInsight[] = [
    ...waterInsights(ctx),
    ...feedInsights(ctx),
    ...toppingInsights(ctx),
    ...pollinationInsights(ctx),
    ...runnerInsights(ctx),
    ...harvestEtaInsights(ctx),
    ...lightInsights(ctx),
    ...veritableInsights(ctx),
    ...outdoorInsights(ctx),
    ...envStaleInsights(ctx),
    ...envBandInsights(ctx),
    ...phInsights(ctx),
    ...germinationInsights(ctx),
    ...photoInsights(ctx),
    ...spiderMiteInsights(ctx),
    // — Ný söfn (5.5) — AÐEINS bætt aftast; röð eldri safna er samningur.
    ...ecInsights(ctx),
    ...pestFollowUpInsights(ctx),
    ...paceInsights(ctx),
    ...transplantInsights(ctx),
    ...springWakeInsights(ctx),
  ];

  // Stöðug röðun: 'due' -> 'soon' -> 'info'. Innan sömu severity helst upphafleg röð.
  return stableSortBySeverity(insights);
}

export { buildContextDigest } from './digest';
export { plantLabel, phaseLabel } from './helpers';
export type { EngineInput } from './helpers';
