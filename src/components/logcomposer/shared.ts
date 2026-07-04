import type { ComponentType } from 'react';
import {
  Bug,
  Camera,
  Droplet,
  Flame,
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

/**
 * Deildir fastar skráningarformsins (5.x) — í eigin einingu svo
 * component-skrárnar haldist hreinar fyrir fast-refresh.
 */

type IconComponent = ComponentType<{ size?: number | string }>;

/** Maps the icon strings in LOG_TYPE_META to lucide components. */
export const LOG_ICONS: Record<string, IconComponent> = {
  Droplet,
  Leaf,
  Camera,
  StickyNote,
  Thermometer,
  Flame,
  Scissors,
  Sparkles,
  Sprout,
  Move,
  Wrench,
  Bug,
  ShieldAlert,
};

export function logIcon(name: string): IconComponent {
  return LOG_ICONS[name] ?? StickyNote;
}

/** Sameiginlegt útlit innsláttarreita í skráningarforminu. */
export const inputClass =
  'w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2 text-sm text-cream-100 outline-none focus:border-moss-400 placeholder:text-cream-400/40';
