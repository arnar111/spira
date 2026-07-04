/**
 * GrowDetail — sameiginlegir fastar og hreinir hjálparar (4.4 klofningur).
 * Deilt milli skeljarinnar og hluta-eininganna (PlantRow, LogRow, LogFilters).
 */

import {
  Bug,
  Camera,
  Droplet,
  Flame,
  GitBranch,
  Leaf,
  Move,
  Scissors,
  ShieldAlert,
  Sparkles,
  Sprout,
  StickyNote,
  Thermometer,
  Wrench,
} from 'lucide-react';
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

/**
 * ALLAR skráningartegundir með íslensk heiti + tákn (5.x — áður aðeins 7 af 14,
 * svo tímalínan sýndi hráa strengi á borð við „phase_change" og „harvest").
 * Röðin er birtingarröð síu-flaganna.
 */
export const LOG_TYPES: { id: LogType; label: string; icon: typeof Droplet }[] = [
  { id: 'water', label: 'Vökva', icon: Droplet },
  { id: 'feed', label: 'Næring', icon: Leaf },
  { id: 'note', label: 'Nóta', icon: StickyNote },
  { id: 'photo', label: 'Mynd', icon: Camera },
  { id: 'prune', label: 'Klippt', icon: Scissors },
  { id: 'top', label: 'Toppað', icon: Sparkles },
  { id: 'pollinate', label: 'Frjóvgun', icon: Flame },
  { id: 'transplant', label: 'Umpottað', icon: Move },
  { id: 'maintenance', label: 'Viðhald', icon: Wrench },
  { id: 'environment', label: 'Umhverfi', icon: Thermometer },
  { id: 'harvest', label: 'Uppskera', icon: Sprout },
  { id: 'pest', label: 'Meindýr', icon: Bug },
  { id: 'disease', label: 'Sjúkdómur', icon: ShieldAlert },
  { id: 'phase_change', label: 'Fasabreyting', icon: GitBranch },
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
