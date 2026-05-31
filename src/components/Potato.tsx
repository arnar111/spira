import { useId, type CSSProperties } from 'react';

/**
 * Potato glyph — companion to <Chili>, <Tomato> and <Strawberry>. Renders a
 * lumpy tuber with a few "eyes". Mirrors their API so <PlantGlyph> can swap it
 * into the same slot. The variety key selects the skin colour.
 */
export type PotatoGlyph = 'yellow' | 'red' | 'white' | 'purple';

interface PPreset {
  label: string;
  body: string;
  shadow: string;
  highlight: string;
}

const PRESETS: Record<PotatoGlyph, PPreset> = {
  yellow: { label: 'Gulkjötuð', body: '#d9b96a', shadow: '#a9863f', highlight: '#ecd79a' },
  red: { label: 'Rauð', body: '#b25a44', shadow: '#7d3625', highlight: '#d08a72' },
  white: { label: 'Hvít', body: '#e2d2b0', shadow: '#b3a07c', highlight: '#f2e8d0' },
  purple: { label: 'Fjólublá', body: '#6a4a6b', shadow: '#43293f', highlight: '#9a7a99' },
};

/** Lumpy, slightly irregular tuber centred low in the 100×140 frame. */
const TUBER =
  'M22,82 C19,64 34,55 53,56 C71,57 85,61 87,76 C89,91 79,104 56,105 C35,106 25,98 22,82 Z';

/** Eye dimples (x, y) on the tuber surface. */
const EYES: Array<[number, number]> = [
  [40, 70],
  [58, 64],
  [70, 82],
  [48, 90],
];

interface PotatoProps {
  variety?: PotatoGlyph;
  size?: number;
  tilt?: number;
  flip?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Potato({
  variety = 'yellow',
  size = 80,
  tilt = 0,
  flip = false,
  style,
  className,
}: PotatoProps) {
  const preset = PRESETS[variety] ?? PRESETS.yellow;
  const uid = useId().replace(/:/g, '');
  const gradId = `potato-grad-${uid}`;

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
          <radialGradient id={gradId} cx="0.4" cy="0.36" r="0.85">
            <stop offset="0%" stopColor={preset.highlight} />
            <stop offset="55%" stopColor={preset.body} />
            <stop offset="100%" stopColor={preset.shadow} />
          </radialGradient>
        </defs>

        {/* Drop shadow */}
        <g transform="translate(2, 3)" opacity={0.22}>
          <path d={TUBER} fill="#000" />
        </g>

        {/* Body */}
        <path d={TUBER} fill={`url(#${gradId})`} />

        {/* Eyes (dimples) */}
        <g>
          {EYES.map(([x, y], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={2.4} ry={1.8} fill={preset.shadow} opacity={0.55} />
              <path
                d={`M${x - 3},${y - 3} L${x + 3},${y - 4}`}
                stroke={preset.shadow}
                strokeWidth={1}
                strokeLinecap="round"
                opacity={0.4}
              />
            </g>
          ))}
        </g>

        {/* Specular highlight */}
        <ellipse cx="44" cy="70" rx="13" ry="8" fill={preset.highlight} opacity={0.4} transform="rotate(-12 44 70)" />
      </svg>
    </div>
  );
}
