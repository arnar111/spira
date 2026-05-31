import { useId, type CSSProperties } from 'react';

/**
 * Strawberry glyph — companion to <Chili> and <Tomato>. Renders a ripe berry
 * with seed flecks (achenes) and a leafy green calyx. Mirrors their API so
 * <PlantGlyph> can swap it into the same slot. 'alpine' is the smaller, lighter
 * Fragaria vesca berry.
 */
export type StrawberryGlyph = 'classic' | 'alpine';

interface SPreset {
  label: string;
  body: string;
  shadow: string;
  highlight: string;
}

const PRESETS: Record<StrawberryGlyph, SPreset> = {
  classic: { label: 'Jarðarber', body: '#e23b32', shadow: '#9a1c1c', highlight: '#ff7a64' },
  alpine: { label: 'Skógarjarðarber', body: '#e8554a', shadow: '#a83327', highlight: '#ffa08c' },
};

/** Inverted teardrop: wide rounded shoulders up top, soft point at the bottom. */
const BERRY =
  'M50,50 C34,47 22,57 22,73 C22,93 37,110 50,121 C63,110 78,93 78,73 C78,57 66,47 50,50 Z';

/** Achene (seed) positions in the 100×140 viewBox, staggered like a real berry. */
const SEEDS: Array<[number, number]> = [
  [38, 64], [50, 62], [62, 64],
  [32, 76], [44, 74], [56, 74], [68, 76],
  [38, 88], [50, 86], [62, 88],
  [44, 100], [56, 100],
  [50, 112],
];

interface StrawberryProps {
  variety?: StrawberryGlyph;
  size?: number;
  tilt?: number;
  flip?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Strawberry({
  variety = 'classic',
  size = 80,
  tilt = 0,
  flip = false,
  style,
  className,
}: StrawberryProps) {
  const preset = PRESETS[variety] ?? PRESETS.classic;
  const uid = useId().replace(/:/g, '');
  const gradId = `straw-grad-${uid}`;

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
          <radialGradient id={gradId} cx="0.38" cy="0.32" r="0.9">
            <stop offset="0%" stopColor={preset.highlight} />
            <stop offset="48%" stopColor={preset.body} />
            <stop offset="100%" stopColor={preset.shadow} />
          </radialGradient>
        </defs>

        {/* Drop shadow */}
        <g transform="translate(2, 3)" opacity={0.25}>
          <path d={BERRY} fill="#000" />
        </g>

        {/* Body */}
        <path d={BERRY} fill={`url(#${gradId})`} />

        {/* Seeds (achenes) */}
        <g fill={preset.highlight} opacity={0.85}>
          {SEEDS.map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={1.6} ry={2.6} transform={`rotate(${(x - 50) * 1.1} ${x} ${y})`} />
          ))}
        </g>

        {/* Specular highlight */}
        <ellipse cx="38" cy="64" rx="10" ry="13" fill={preset.highlight} opacity={0.4} transform="rotate(-22 38 64)" />

        {/* Calyx (green leafy crown) + stem */}
        <Calyx />
      </svg>
    </div>
  );
}

function Calyx() {
  const cx = 50;
  const cy = 49;
  const leaf = '#4d8a47';
  const leafDark = '#3d6f3a';
  return (
    <g>
      {/* short stem */}
      <path d={`M${cx - 1},${cy - 4} C${cx - 2},${cy - 16} ${cx},${cy - 20} ${cx + 2},${cy - 18} L${cx + 3},${cy - 4} Z`} fill={leafDark} />
      {/* leafy sepals radiating outward and down over the shoulders */}
      <g fill={leaf}>
        <path d={`M${cx},${cy} C${cx - 5},${cy - 9} ${cx - 15},${cy - 7} ${cx - 20},${cy + 3} C${cx - 12},${cy + 5} ${cx - 4},${cy + 3} ${cx},${cy} Z`} />
        <path d={`M${cx},${cy} C${cx + 5},${cy - 9} ${cx + 15},${cy - 7} ${cx + 20},${cy + 3} C${cx + 12},${cy + 5} ${cx + 4},${cy + 3} ${cx},${cy} Z`} />
        <path d={`M${cx},${cy} C${cx - 7},${cy - 4} ${cx - 11},${cy + 4} ${cx - 9},${cy + 12} C${cx - 4},${cy + 7} ${cx - 1},${cy + 3} ${cx},${cy} Z`} />
        <path d={`M${cx},${cy} C${cx + 7},${cy - 4} ${cx + 11},${cy + 4} ${cx + 9},${cy + 12} C${cx + 4},${cy + 7} ${cx + 1},${cy + 3} ${cx},${cy} Z`} />
        <path d={`M${cx},${cy - 2} C${cx - 3},${cy - 9} ${cx + 3},${cy - 9} ${cx},${cy + 5} Z`} />
      </g>
    </g>
  );
}
