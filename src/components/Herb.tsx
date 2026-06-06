import { useId, type CSSProperties } from 'react';

/**
 * Herb / leafy-green glyph — companion to <Chili>, <Tomato>, <Strawberry> and
 * <Potato>. Renders a small leafy sprig growing from a central stem. Mirrors
 * their API so <PlantGlyph> can swap it into the same slot. The variety key
 * selects the leaf shape and shade — 'sprig' for aromatic herbs (basil, mint),
 * 'frond' for finer foliage (parsley, cilantro, microgreens) and 'leafy' for
 * broad salad leaves (kale, arugula).
 */
export type HerbGlyph = 'sprig' | 'frond' | 'leafy';

interface HPreset {
  label: string;
  body: string;
  shadow: string;
  highlight: string;
  /** Leaf pairs as [tip-x, tip-y, control-spread] in the 100×140 viewBox. */
  leaves: Array<[number, number, number]>;
}

const PRESETS: Record<HerbGlyph, HPreset> = {
  sprig: {
    label: 'Kryddjurt',
    body: '#4f8a45',
    shadow: '#356030',
    highlight: '#7cb86f',
    leaves: [
      [26, 96, 18],
      [74, 96, 18],
      [30, 74, 16],
      [70, 74, 16],
      [50, 52, 14],
    ],
  },
  frond: {
    label: 'Fínblaða jurt',
    body: '#5a9a4c',
    shadow: '#3c6c34',
    highlight: '#8ac97c',
    leaves: [
      [24, 100, 13],
      [76, 100, 13],
      [28, 82, 12],
      [72, 82, 12],
      [34, 64, 11],
      [66, 64, 11],
      [50, 48, 10],
    ],
  },
  leafy: {
    label: 'Salatblað',
    body: '#5b9a3f',
    shadow: '#3d6a2a',
    highlight: '#8cc46a',
    leaves: [
      [22, 92, 24],
      [78, 92, 24],
      [50, 56, 22],
    ],
  },
};

interface HerbProps {
  variety?: HerbGlyph;
  size?: number;
  tilt?: number;
  flip?: boolean;
  style?: CSSProperties;
  className?: string;
}

/** A single leaf: a rounded almond shape from the stem base up to (tx, ty). */
function leafPath(tx: number, ty: number, spread: number): string {
  const bx = 50;
  const by = 116;
  const mx = (bx + tx) / 2;
  const my = (by + ty) / 2;
  const nx = ty - by;
  const ny = bx - tx;
  const len = Math.hypot(nx, ny) || 1;
  const ox = (nx / len) * spread;
  const oy = (ny / len) * spread;
  return `M${bx},${by} C${mx + ox},${my + oy} ${tx},${ty + 4} ${tx},${ty} C${tx},${ty + 4} ${mx - ox},${my - oy} ${bx},${by} Z`;
}

export function Herb({
  variety = 'sprig',
  size = 80,
  tilt = 0,
  flip = false,
  style,
  className,
}: HerbProps) {
  const preset = PRESETS[variety] ?? PRESETS.sprig;
  const uid = useId().replace(/:/g, '');
  const gradId = `herb-grad-${uid}`;

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
          <linearGradient id={gradId} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={preset.highlight} />
            <stop offset="55%" stopColor={preset.body} />
            <stop offset="100%" stopColor={preset.shadow} />
          </linearGradient>
        </defs>

        {/* Drop shadow */}
        <g transform="translate(2, 3)" opacity={0.2}>
          {preset.leaves.map(([tx, ty, sp], i) => (
            <path key={i} d={leafPath(tx, ty, sp)} fill="#000" />
          ))}
        </g>

        {/* Central stem */}
        <path
          d="M50,118 C49,96 49,74 50,50"
          stroke={preset.shadow}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />

        {/* Leaves */}
        <g fill={`url(#${gradId})`} stroke={preset.shadow} strokeWidth={0.75}>
          {preset.leaves.map(([tx, ty, sp], i) => (
            <path key={i} d={leafPath(tx, ty, sp)} />
          ))}
        </g>

        {/* Midrib highlights */}
        <g stroke={preset.highlight} strokeWidth={1} strokeLinecap="round" opacity={0.55} fill="none">
          {preset.leaves.map(([tx, ty], i) => (
            <path key={i} d={`M50,116 Q${(50 + tx) / 2},${(116 + ty) / 2} ${tx},${ty}`} />
          ))}
        </g>
      </svg>
    </div>
  );
}
