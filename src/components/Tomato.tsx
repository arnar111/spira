import { useId, type CSSProperties } from 'react';

/**
 * Tomato glyph — companion to <Chili>. Renders Steinunn's heart-shaped
 * (oxheart) fruit with a hint of its crinkly "rugose" lobes and a green
 * calyx. Mirrors the Chili API so <PlantGlyph> can swap them in the same slot.
 */
export type TomatoGlyph = 'steinunn' | 'steinunn_green';

interface TPreset {
  label: string;
  body: string;
  shadow: string;
  highlight: string;
}

const PRESETS: Record<TomatoGlyph, TPreset> = {
  steinunn: { label: 'Steinunn', body: '#d83a2a', shadow: '#8e1f12', highlight: '#f57a5f' },
  steinunn_green: { label: 'Steinunn (óþroskað)', body: '#6f9a4f', shadow: '#3f5e2c', highlight: '#a7c77f' },
};

/** Oxheart / heart-shaped body: wide shoulders, soft cleft on top, point at bottom. */
const HEART =
  'M50,52 C46,44 38,40 30,44 C20,49 18,60 22,70 C27,82 38,96 50,116 C62,96 73,82 78,70 C82,60 80,49 70,44 C62,40 54,44 50,52 Z';

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
          <path d={HEART} fill="#000" />
        </g>

        {/* Body */}
        <path d={HEART} fill={`url(#${gradId})`} />

        {/* Rugose / lobe ribs — the Steinunn's crinkly trait */}
        <g fill="none" stroke={preset.shadow} strokeWidth={1.5} strokeLinecap="round" opacity={0.4}>
          <path d="M50,54 C50,78 50,96 50,112" />
          <path d="M40,58 C36,80 42,98 50,112" />
          <path d="M60,58 C64,80 58,98 50,112" />
        </g>

        {/* Specular highlight */}
        <ellipse cx="38" cy="62" rx="11" ry="14" fill={preset.highlight} opacity={0.45} transform="rotate(-22 38 62)" />

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
