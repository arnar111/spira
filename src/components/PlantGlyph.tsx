import { type CSSProperties } from 'react';
import { Chili } from './Chili';
import { Tomato } from './Tomato';
import { Strawberry } from './Strawberry';
import { Potato } from './Potato';
import { Herb } from './Herb';
import type { PlantCategory } from '@/lib/db';
import { chiliForVarietyName, varietyByName, type Variety } from '@/lib/varieties';

interface PlantGlyphProps {
  /** Resolved variety, if you already have it. */
  variety?: Variety;
  /** Fallback: resolve by common name (e.g. plant.variety). */
  name?: string;
  /**
   * Vara-flokkur (5.x): þegar yrkið finnst ekki (t.d. tóm ræktun) ræður
   * flokkurinn tákninu — tómur tómatgarður sýnir tómat, ekki chili.
   */
  category?: PlantCategory;
  size?: number;
  tilt?: number;
  flip?: boolean;
  style?: CSSProperties;
  className?: string;
}

/**
 * Renders the correct fruit glyph for a variety — a heart-shaped tomato for
 * tomatoes, a berry for strawberries, a chili for peppers. Falls back on the
 * given category's default glyph when the variety can't be resolved, and only
 * then on a chili (the original pepper-only behaviour).
 */
export function PlantGlyph({ variety, name, category, ...rest }: PlantGlyphProps) {
  const v = variety ?? (name ? varietyByName(name) : undefined);

  if (v?.category === 'tomato') {
    return <Tomato variety={v.glyph} {...rest} />;
  }
  if (v?.category === 'strawberry') {
    return <Strawberry variety={v.glyph} {...rest} />;
  }
  if (v?.category === 'potato') {
    return <Potato variety={v.glyph} {...rest} />;
  }
  if (v?.category === 'herb' || v?.category === 'leafy') {
    return <Herb variety={v.glyph} {...rest} />;
  }
  if (v?.category === 'pepper') {
    return <Chili variety={v.chili} {...rest} />;
  }
  switch (category) {
    case 'tomato':
      return <Tomato {...rest} />;
    case 'strawberry':
      return <Strawberry {...rest} />;
    case 'potato':
      return <Potato {...rest} />;
    case 'herb':
    case 'leafy':
      return <Herb {...rest} />;
    default:
      return <Chili variety={chiliForVarietyName(name)} {...rest} />;
  }
}
