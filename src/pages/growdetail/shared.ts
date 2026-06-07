/**
 * GrowDetail — sameiginlegir fastar og hreinir hjálparar (4.4 klofningur).
 * Deilt milli skeljarinnar og hluta-eininganna (PlantRow, LogRow, LogFilters).
 */

import { Droplet, Flame, Leaf, Scissors, Sparkles, StickyNote, Thermometer } from 'lucide-react';
import type { GrowPhase, LogType, Plant } from '@/lib/db';

export const PHASE_OPTIONS: { id: GrowPhase; label: string }[] = [
  { id: 'planning', label: 'Áætlun' },
  { id: 'germinating', label: 'Spírun' },
  { id: 'seedling', label: 'Plöntu' },
  { id: 'vegetative', label: 'Veg' },
  { id: 'flowering', label: 'Blómgun' },
  { id: 'fruiting', label: 'Aldin' },
  { id: 'ripening', label: 'Þroskast' },
  { id: 'harvest', label: 'Uppskera' },
];

export const LOG_TYPES: { id: LogType; label: string; icon: typeof Droplet }[] = [
  { id: 'water', label: 'Vökva', icon: Droplet },
  { id: 'feed', label: 'Næring', icon: Leaf },
  { id: 'note', label: 'Nóta', icon: StickyNote },
  { id: 'prune', label: 'Klippt', icon: Scissors },
  { id: 'top', label: 'Toppað', icon: Sparkles },
  { id: 'pollinate', label: 'Frjóvgun', icon: Flame },
  { id: 'environment', label: 'Umhverfi', icon: Thermometer },
];

/** Merki (tákn + heiti) fyrir logtegund; fellur aftur á tegundarstrenginn. */
export function logTypeMeta(type: LogType): { label: string; icon: typeof Droplet } {
  return LOG_TYPES.find((t) => t.id === type) ?? { label: type, icon: StickyNote };
}

/** Röðun fasa eftir framvindu — fyrir „lengst kominn" fulltrúa-fasa. */
const PHASE_ORDER: GrowPhase[] = [
  'planning',
  'germinating',
  'seedling',
  'vegetative',
  'flowering',
  'fruiting',
  'ripening',
  'harvest',
];

/** Lengst kominn virkur plöntufasi (fyrir umhverfis-markgildi). */
export function pickRepresentativePhase(plants: Plant[]): GrowPhase {
  let best: GrowPhase = 'vegetative';
  let bestRank = -1;
  for (const p of plants) {
    if (p.archived) continue;
    const rank = PHASE_ORDER.indexOf(p.currentPhase);
    if (rank > bestRank) {
      bestRank = rank;
      best = p.currentPhase;
    }
  }
  return best;
}
