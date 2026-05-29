import { type CSSProperties } from 'react';
import { Chili } from './Chili';
import { Tomato } from './Tomato';
import { chiliForVarietyName, varietyByName, type Variety } from '@/lib/varieties';

interface PlantGlyphProps {
  /** Resolved variety, if you already have it. */
  variety?: Variety;
  /** Fallback: resolve by common name (e.g. plant.variety). */
  name?: string;
  size?: number;
  tilt?: number;
  flip?: boolean;
  style?: CSSProperties;
  className?: string;
}

/**
 * Renders the correct fruit glyph for a variety — a heart-shaped tomato for
 * tomatoes, a chili for peppers. Falls back to a chili (by name) when the
 * variety can't be resolved, preserving the original pepper-only behaviour.
 */
export function PlantGlyph({ variety, name, ...rest }: PlantGlyphProps) {
  const v = variety ?? (name ? varietyByName(name) : undefined);

  if (v?.category === 'tomato') {
    return <Tomato variety={v.glyph} {...rest} />;
  }
  if (v?.category === 'pepper') {
    return <Chili variety={v.chili} {...rest} />;
  }
  return <Chili variety={chiliForVarietyName(name)} {...rest} />;
}
