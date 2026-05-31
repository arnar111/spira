import { useId, type CSSProperties } from 'react';

/**
 * Tomato glyph — companion to <Chili> and <Strawberry>. Renders Steinunn's
 * heart-shaped (oxheart) fruit plus the international catalog shapes: round
 * cherries, elongated plums (Roma/San Marzano) and wide ribbed beefsteaks.
 * Mirrors the Chili API so <PlantGlyph> can swap them in the same slot.
 */
export type TomatoGlyph =
  | 'steinunn'
  | 'steinunn_green'
  | 'cherry_red'
  | 'cherry_gold'
  | 'cherry_black'
  | 'plum_red'
  | 'beefsteak_red'
  | 'beefsteak_pink'
  | 'round_red';

/** Body silhouette — drives which path is drawn and whether ribs show. */
type TShape = 'heart' | 'cherry' | 'plum' | 'beefsteak' | 'round';

interface TPreset {
  label: string;
  shape: TShape;
  body: string;
  shadow: string;
  highlight: string;
}

const PRESETS: Record<TomatoGlyph, TPreset> = {
  steinunn: { label: 'Steinunn', shape: 'heart', body: '#d83a2a', shadow: '#8e1f12', highlight: '#f57a5f' },
  steinunn_green: { label: 'Steinunn (óþroskað)', shape: 'heart', body: '#6f9a4f', shadow: '#3f5e2c', highlight: '#a7c77f' },
  cherry_red: { label: 'Kirsuber', shape: 'cherry', body: '#e0402c', shadow: '#9a1c14', highlight: '#ff7a5f' },
  cherry_gold: { label: 'Gyllt kirsuber', shape: 'cherry', body: '#f0962f', shadow: '#b5651a', highlight: '#ffc370' },
  cherry_black: { label: 'Svart kirsuber', shape: 'cherry', body: '#7e4a66', shadow: '#432740', highlight: '#a87391' },
  plum_red: { label: 'Plóma', shape: 'plum', body: '#d8352a', shadow: '#931d12', highlight: '#f4705a' },
  beefsteak_red: { label: 'Beefsteak', shape: 'beefsteak', body: '#d23320', shadow: '#8e1f12', highlight: '#f57a5f' },
  beefsteak_pink: { label: 'Bleikur beefsteak', shape: 'beefsteak', body: '#d76b7a', shadow: '#9c4250', highlight: '#f0a3ad' },
  round_red: { label: 'Kúlulaga', shape: 'round', body: '#d83a2a', shadow: '#8e1f12', highlight: '#f57a5f' },
};

const BODIES: Record<TShape, string> = {
  /** Oxheart / heart-shaped: wide shoulders, soft cleft on top, point at bottom. */
  heart:
    'M50,52 C46,44 38,40 30,44 C20,49 18,60 22,70 C27,82 38,96 50,116 C62,96 73,82 78,70 C82,60 80,49 70,44 C62,40 54,44 50,52 Z',
  /** Compact round cherry, sitting a touch higher in the frame. */
  cherry: 'M50,104 C32,104 26,88 26,72 C26,58 36,50 50,50 C64,50 74,58 74,72 C74,88 68,104 50,104 Z',
  /** Elongated plum / paste tomato (Roma, San Marzano). */
  plum: 'M50,122 C36,122 30,104 30,82 C30,60 38,48 50,48 C62,48 70,60 70,82 C70,104 64,122 50,122 Z',
  /** Wide, slightly flattened beefsteak with shouldered ribs. */
  beefsteak: 'M50,116 C20,116 12,94 12,74 C12,52 30,44 50,44 C70,44 88,52 88,74 C88,94 80,116 50,116 Z',
  /** Standard round slicer/dwarf. */
  round: 'M50,118 C26,118 18,96 18,74 C18,54 32,44 50,44 C68,44 82,54 82,74 C82,96 74,118 50,118 Z',
};

interface TomatoProps {
  variety?: TomatoGlyph;
  size?: number;
  tilt?: number;
  flip?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Tomato({
  variety = 'steinunn',
  size = 80,
  tilt = 0,
  flip = false,
  style,
  className,
}: TomatoProps) {
  const preset = PRESETS[variety] ?? PRESETS.steinunn;
  const body = BODIES[preset.shape] ?? BODIES.heart;
  const showRibs = preset.shape === 'heart' || preset.shape === 'beefsteak';
  const uid = useId().replace(/:/g, '');
  const gradId = `tomato-grad-${uid}`;

  return (
    <div
      className={className}
      style={{
        display: 'inline-block',
        transform: `rotate(${tilt}deg) ${flip ? 'scaleX(-1)' : ''}`,
        transformOrigin: 'center',
        ...style,
      }}
    >
      <svg
        width={size}
        height={size * 1.4}
        viewBox="0 0 100 140"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <radialGradient id={gradId} cx="0.38" cy="0.34" r="0.85">
            <stop offset="0%" stopColor={preset.highlight} />
            <stop offset="45%" stopColor={preset.body} />
            <stop offset="100%" stopColor={preset.shadow} />
          </radialGradient>
        </defs>

        {/* Drop shadow */}
        <g transform="translate(2, 3)" opacity={0.25}>
          <path d={body} fill="#000" />
        </g>

        {/* Body */}
        <path d={body} fill={`url(#${gradId})`} />

        {/* Lobe ribs — the Steinunn's crinkle and the beefsteak's shoulders */}
        {showRibs && (
          <g fill="none" stroke={preset.shadow} strokeWidth={1.5} strokeLinecap="round" opacity={0.35}>
            <path d="M50,54 C50,78 50,96 50,110" />
            <path d="M40,58 C36,80 42,96 50,110" />
            <path d="M60,58 C64,80 58,96 50,110" />
          </g>
        )}

        {/* Specular highlight */}
        <ellipse cx="38" cy="64" rx="11" ry="14" fill={preset.highlight} opacity={0.45} transform="rotate(-22 38 64)" />

        {/* Calyx (green star) + stem */}
        <Calyx />
      </svg>
    </div>
  );
}

function Calyx() {
  const cx = 50;
  const cy = 47;
  const sepal = '#4d8a47';
  const sepalDark = '#3d6f3a';
  return (
    <g>
      {/* short stem */}
      <path d={`M${cx - 1},${cy - 3} C${cx - 2},${cy - 14} ${cx},${cy - 18} ${cx + 2},${cy - 16} L${cx + 3},${cy - 3} Z`} fill={sepalDark} />
      {/* five sepals radiating from the top */}
      <g fill={sepal}>
        <path d={`M${cx},${cy} C${cx - 4},${cy - 8} ${cx - 12},${cy - 6} ${cx - 16},${cy + 1} C${cx - 9},${cy + 3} ${cx - 3},${cy + 2} ${cx},${cy} Z`} />
        <path d={`M${cx},${cy} C${cx + 4},${cy - 8} ${cx + 12},${cy - 6} ${cx + 16},${cy + 1} C${cx + 9},${cy + 3} ${cx + 3},${cy + 2} ${cx},${cy} Z`} />
        <path d={`M${cx},${cy} C${cx - 6},${cy - 3} ${cx - 9},${cy + 3} ${cx - 7},${cy + 9} C${cx - 3},${cy + 5} ${cx - 1},${cy + 2} ${cx},${cy} Z`} />
        <path d={`M${cx},${cy} C${cx + 6},${cy - 3} ${cx + 9},${cy + 3} ${cx + 7},${cy + 9} C${cx + 3},${cy + 5} ${cx + 1},${cy + 2} ${cx},${cy} Z`} />
        <path d={`M${cx},${cy - 1} C${cx - 2},${cy - 7} ${cx + 2},${cy - 7} ${cx},${cy + 4} Z`} />
      </g>
    </g>
  );
}
