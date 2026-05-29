import { useId, type CSSProperties } from 'react';

export type ChiliVariety =
  | 'bell_red'
  | 'bell_yellow'
  | 'bell_green'
  | 'bell_orange'
  | 'bell_purple'
  | 'bell_chocolate'
  | 'jalapeno'
  | 'jalapeno_red'
  | 'jalapeno_purple'
  | 'serrano'
  | 'cayenne'
  | 'cayenne_golden'
  | 'scotch_bonnet'
  | 'scotch_bonnet_red'
  | 'scotch_bonnet_chocolate'
  | 'habanero_orange'
  | 'habanero_red'
  | 'habanero_chocolate'
  | 'habanero_mustard'
  | 'habanero_peach'
  | 'habanero_white'
  | 'habanero_helios'
  | 'ghost'
  | 'ghost_chocolate'
  | 'ghost_peach'
  | 'ghost_yellow'
  | 'ghost_white'
  | 'primo'
  | 'primo_yellow'
  | 'reaper'
  | 'reaper_yellow'
  | 'reaper_chocolate'
  | 'scorpion'
  | 'scorpion_yellow'
  | 'scorpion_chocolate'
  | 'douglah'
  | 'aji_amarillo'
  | 'aji_limon'
  | 'aji_charapita'
  | 'poblano'
  | 'shishito'
  | 'padron'
  | 'thai'
  | 'thai_yellow'
  | 'lemon_drop'
  | 'tabasco'
  | 'piri_piri'
  | 'rocoto';

type Shape = 'bell' | 'classic' | 'long' | 'lantern' | 'wrinkled' | 'tailed' | 'tiny';
type Tail = 'curl' | 'long';

interface Preset {
  label: string;
  shape: Shape;
  body: string;
  shadow: string;
  highlight: string;
  wrinkles?: number;
  tail?: Tail;
}

const PRESETS: Record<ChiliVariety, Preset> = {
  bell_red: { label: 'Bell', shape: 'bell', body: '#d4391f', shadow: '#9a230f', highlight: '#f48b6a' },
  bell_yellow: { label: 'Bell', shape: 'bell', body: '#f0bf3a', shadow: '#b88a18', highlight: '#ffe89c' },
  bell_green: { label: 'Græn paprika', shape: 'bell', body: '#5a8c2f', shadow: '#345418', highlight: '#a3c768' },
  bell_orange: { label: 'Bell Orange', shape: 'bell', body: '#ef9a3a', shadow: '#a55e0d', highlight: '#ffc679' },
  bell_purple: { label: 'Bell Purple', shape: 'bell', body: '#5a3a6a', shadow: '#2e1a37', highlight: '#9c70b3' },
  bell_chocolate: { label: 'Bell Chocolate', shape: 'bell', body: '#6b4530', shadow: '#3a2418', highlight: '#a47556' },
  jalapeno: { label: 'Jalapeño', shape: 'classic', body: '#3d7a36', shadow: '#234a1f', highlight: '#7fb16a' },
  jalapeno_red: { label: 'Jalapeño Red', shape: 'classic', body: '#c93220', shadow: '#7a160a', highlight: '#ef6448' },
  jalapeno_purple: { label: 'Jalapeño Purple', shape: 'classic', body: '#523060', shadow: '#28132e', highlight: '#8e63a3' },
  serrano: { label: 'Serrano', shape: 'long', body: '#3f8534', shadow: '#234a1f', highlight: '#82b770' },
  cayenne: { label: 'Cayenne', shape: 'long', body: '#d23924', shadow: '#8e1f0e', highlight: '#f57d65' },
  cayenne_golden: { label: 'Cayenne Golden', shape: 'long', body: '#e8b22a', shadow: '#a07408', highlight: '#ffdc7a' },
  scotch_bonnet: { label: 'Scotch Bonnet', shape: 'lantern', body: '#f0a02c', shadow: '#a85f0d', highlight: '#ffd084', wrinkles: 2 },
  scotch_bonnet_red: { label: 'Scotch Bonnet Red', shape: 'lantern', body: '#d63520', shadow: '#8a1908', highlight: '#f57e6a', wrinkles: 2 },
  scotch_bonnet_chocolate: { label: 'Scotch Bonnet Chocolate', shape: 'lantern', body: '#5e3a26', shadow: '#321b0e', highlight: '#9a6a4a', wrinkles: 2 },
  habanero_orange: { label: 'Habanero Orange', shape: 'lantern', body: '#ef7a2c', shadow: '#9f3e0a', highlight: '#ffb069', wrinkles: 3 },
  habanero_red: { label: 'Habanero Red', shape: 'lantern', body: '#d23320', shadow: '#831a0a', highlight: '#f4685a', wrinkles: 3 },
  habanero_chocolate: { label: 'Habanero Chocolate', shape: 'lantern', body: '#5e3a26', shadow: '#321b0e', highlight: '#9a6a4a', wrinkles: 3 },
  habanero_mustard: { label: 'Habanero Mustard', shape: 'lantern', body: '#c89938', shadow: '#7a5a14', highlight: '#ebc26b', wrinkles: 3 },
  habanero_peach: { label: 'Habanero Peach', shape: 'lantern', body: '#f4ad8b', shadow: '#a06549', highlight: '#fcd1ba', wrinkles: 3 },
  habanero_white: { label: 'Habanero White', shape: 'lantern', body: '#f4ecd1', shadow: '#a89876', highlight: '#fdfaf1', wrinkles: 3 },
  habanero_helios: { label: 'Habanero Helios', shape: 'lantern', body: '#e95f1e', shadow: '#923208', highlight: '#ff9a5e', wrinkles: 3 },
  ghost: { label: 'Bhut Jolokia', shape: 'wrinkled', body: '#d63520', shadow: '#8a1908', highlight: '#f57e6a', wrinkles: 5 },
  ghost_chocolate: { label: 'Bhut Chocolate', shape: 'wrinkled', body: '#5e3a26', shadow: '#321b0e', highlight: '#9a6a4a', wrinkles: 5 },
  ghost_peach: { label: 'Bhut Peach', shape: 'wrinkled', body: '#f4ad8b', shadow: '#a06549', highlight: '#fcd1ba', wrinkles: 5 },
  ghost_yellow: { label: 'Bhut Yellow', shape: 'wrinkled', body: '#ebc046', shadow: '#a07a0d', highlight: '#ffdb7c', wrinkles: 5 },
  ghost_white: { label: 'Bhut White', shape: 'wrinkled', body: '#f4ecd1', shadow: '#a89876', highlight: '#fdfaf1', wrinkles: 5 },
  primo: { label: '7 Pot Primo', shape: 'tailed', body: '#c92a16', shadow: '#7a1407', highlight: '#f06548', wrinkles: 4, tail: 'long' },
  primo_yellow: { label: '7 Pot Primo Yellow', shape: 'tailed', body: '#e8b32a', shadow: '#9a7a0a', highlight: '#ffd965', wrinkles: 4, tail: 'long' },
  reaper: { label: 'Carolina Reaper', shape: 'tailed', body: '#c12414', shadow: '#771307', highlight: '#ef5b3c', wrinkles: 6, tail: 'curl' },
  reaper_yellow: { label: 'Reaper Yellow', shape: 'tailed', body: '#e8b32a', shadow: '#9a7a0a', highlight: '#ffd965', wrinkles: 6, tail: 'curl' },
  reaper_chocolate: { label: 'Reaper Chocolate', shape: 'tailed', body: '#5e3a26', shadow: '#321b0e', highlight: '#9a6a4a', wrinkles: 6, tail: 'curl' },
  scorpion: { label: 'Trinidad Scorpion', shape: 'tailed', body: '#d4361f', shadow: '#831a0a', highlight: '#f47b5a', wrinkles: 5, tail: 'long' },
  scorpion_yellow: { label: 'Scorpion Yellow', shape: 'tailed', body: '#e8b32a', shadow: '#9a7a0a', highlight: '#ffd965', wrinkles: 5, tail: 'long' },
  scorpion_chocolate: { label: 'Scorpion Chocolate', shape: 'tailed', body: '#5e3a26', shadow: '#321b0e', highlight: '#9a6a4a', wrinkles: 5, tail: 'long' },
  douglah: { label: '7 Pot Douglah', shape: 'wrinkled', body: '#4a2a18', shadow: '#26140a', highlight: '#7a5238', wrinkles: 6 },
  aji_amarillo: { label: 'Ají Amarillo', shape: 'long', body: '#ec9624', shadow: '#9c5a08', highlight: '#ffbc6a' },
  aji_limon: { label: 'Ají Limón', shape: 'long', body: '#e2c63a', shadow: '#967e10', highlight: '#fce97a' },
  aji_charapita: { label: 'Ají Charapita', shape: 'tiny', body: '#f1c92e', shadow: '#a07810', highlight: '#ffe87a' },
  poblano: { label: 'Poblano', shape: 'classic', body: '#34541f', shadow: '#1c2f10', highlight: '#6f9a4f' },
  shishito: { label: 'Shishito', shape: 'long', body: '#5d913e', shadow: '#345418', highlight: '#9bc476' },
  padron: { label: 'Padrón', shape: 'long', body: '#4a7e30', shadow: '#2b4818', highlight: '#83b066' },
  thai: { label: 'Thai', shape: 'tiny', body: '#d83a23', shadow: '#8e1f0e', highlight: '#f47766' },
  thai_yellow: { label: 'Thai Yellow', shape: 'tiny', body: '#ebc046', shadow: '#a07a0d', highlight: '#ffdb7c' },
  lemon_drop: { label: 'Lemon Drop', shape: 'long', body: '#e8c52a', shadow: '#9a7a0a', highlight: '#ffe87a' },
  tabasco: { label: 'Tabasco', shape: 'tiny', body: '#e0481f', shadow: '#922c0c', highlight: '#f6845f' },
  piri_piri: { label: 'Piri Piri', shape: 'long', body: '#d4361f', shadow: '#831a0a', highlight: '#f47b5a' },
  rocoto: { label: 'Rocoto', shape: 'lantern', body: '#cf2e1c', shadow: '#7e1409', highlight: '#ef5f48', wrinkles: 1 },
};

const SHAPE_BODY: Record<Shape, string> = {
  bell: 'M22,38 C16,44 14,58 16,72 C18,86 20,96 26,104 C32,112 42,116 50,114 C58,116 68,112 74,104 C80,96 82,86 84,72 C86,58 84,44 78,38 C72,33 64,34 60,40 C58,42 54,38 50,38 C46,38 42,42 40,40 C36,34 28,33 22,38 Z',
  classic: 'M50,22 C38,22 30,28 28,40 C26,55 30,72 34,88 C37,100 41,112 46,118 C50,122 56,120 60,112 C64,100 68,84 70,68 C72,52 70,32 60,24 C56,21 53,21 50,22 Z',
  long: 'M50,18 C44,20 42,26 42,36 C40,52 38,72 38,90 C38,104 42,116 48,122 C53,126 56,122 58,114 C60,98 60,80 60,62 C60,44 60,28 56,22 C54,20 52,18 50,18 Z',
  lantern: 'M22,46 C16,54 16,68 20,80 C24,92 32,104 42,108 C50,110 58,110 66,106 C76,102 84,90 86,76 C88,62 84,50 76,44 C70,40 60,42 56,46 C52,42 42,40 36,42 C30,44 26,42 22,46 Z',
  wrinkled: 'M50,20 C40,22 32,28 30,40 C28,52 32,60 30,72 C28,84 32,94 32,104 C32,114 38,124 46,124 C54,124 62,118 64,108 C66,98 64,88 66,76 C68,64 64,56 66,44 C68,32 60,22 50,20 Z',
  tailed: 'M22,42 C16,52 16,66 20,76 C24,86 22,96 30,100 C36,102 36,106 40,110 C44,114 50,116 54,114 C62,112 64,104 68,98 C76,96 78,86 82,78 C88,68 88,54 82,46 C76,38 64,38 58,44 C54,40 46,38 40,40 C34,42 28,38 22,42 Z',
  tiny: 'M50,30 C44,32 44,40 44,52 C44,66 46,82 50,94 C53,100 56,96 56,86 C56,72 56,56 56,44 C56,36 54,30 50,30 Z',
};

const STEM_ANCHORS: Record<Shape, { x: number; y: number; w: number }> = {
  bell: { x: 50, y: 40, w: 26 },
  classic: { x: 50, y: 22, w: 18 },
  long: { x: 50, y: 18, w: 14 },
  lantern: { x: 50, y: 44, w: 28 },
  wrinkled: { x: 50, y: 22, w: 18 },
  tailed: { x: 50, y: 40, w: 26 },
  tiny: { x: 50, y: 30, w: 10 },
};

const WRINKLE_BOUNDS: Partial<
  Record<Shape, {
    top: number;
    bottom: number;
    leftFn: (t: number) => number;
    rightFn: (t: number) => number;
  }>
> = {
  lantern: {
    top: 50,
    bottom: 102,
    leftFn: (t) => 26 + 4 * Math.sin(t * 3.4),
    rightFn: (t) => 76 - 4 * Math.sin(t * 3.1),
  },
  wrinkled: {
    top: 30,
    bottom: 116,
    leftFn: (t) => 34 + 3 * Math.sin(t * 4.0),
    rightFn: (t) => 64 - 3 * Math.sin(t * 3.8),
  },
  tailed: {
    top: 48,
    bottom: 108,
    leftFn: (t) => 24 + 4 * Math.sin(t * 3.6),
    rightFn: (t) => 78 - 4 * Math.sin(t * 3.4),
  },
};

interface ChiliProps {
  variety?: ChiliVariety;
  size?: number;
  tilt?: number;
  flip?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Chili({
  variety = 'jalapeno',
  size = 80,
  tilt = 0,
  flip = false,
  style,
  className,
}: ChiliProps) {
  const preset = PRESETS[variety] ?? PRESETS.jalapeno;
  const bodyPath = SHAPE_BODY[preset.shape];
  const uid = useId().replace(/:/g, '');
  const gradId = `chili-grad-${uid}`;

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
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={preset.highlight} />
            <stop offset="40%" stopColor={preset.body} />
            <stop offset="100%" stopColor={preset.shadow} />
          </linearGradient>
        </defs>

        <g transform="translate(2, 3)" opacity={0.25}>
          <path d={bodyPath} fill="#000" />
          {preset.tail && <Tail tail={preset.tail} color="#000" shadow="#000" />}
        </g>

        {preset.tail && (
          <Tail tail={preset.tail} color={preset.shadow} shadow={preset.shadow} />
        )}

        <path d={bodyPath} fill={`url(#${gradId})`} />

        <path
          d={bodyPath}
          fill={preset.highlight}
          opacity={0.55}
          style={{ mixBlendMode: 'screen' }}
          transform="translate(-3, -4) scale(0.55) translate(40, 30)"
        />

        <Wrinkles shape={preset.shape} count={preset.wrinkles ?? 0} color={preset.shadow} />

        <Stem shape={preset.shape} />
      </svg>
    </div>
  );
}

function Stem({ shape }: { shape: Shape }) {
  const a = STEM_ANCHORS[shape];
  const color = '#3d6f3a';
  const leafColor = '#4d8a47';
  return (
    <g>
      <ellipse cx={a.x} cy={a.y} rx={a.w / 2} ry={4} fill={color} opacity={0.85} />
      <path
        d={`M${a.x - 2},${a.y - 2} C${a.x - 3},${a.y - 14} ${a.x - 1},${a.y - 18} ${a.x + 2},${a.y - 16} L${a.x + 4},${a.y - 2} Z`}
        fill={color}
      />
      <path
        d={`M${a.x - 1},${a.y - 10} C${a.x - 14},${a.y - 14} ${a.x - 18},${a.y - 8} ${a.x - 8},${a.y - 4} Z`}
        fill={leafColor}
      />
      <path
        d={`M${a.x + 2},${a.y - 12} C${a.x + 14},${a.y - 16} ${a.x + 20},${a.y - 8} ${a.x + 10},${a.y - 5} Z`}
        fill={leafColor}
        opacity={0.92}
      />
    </g>
  );
}

function Wrinkles({ shape, count, color }: { shape: Shape; count: number; color: string }) {
  if (!count) return null;
  const bounds = WRINKLE_BOUNDS[shape];
  if (!bounds) return null;
  const lines: JSX.Element[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const y = bounds.top + (bounds.bottom - bounds.top) * t;
    const lx = bounds.leftFn(t);
    const rx = bounds.rightFn(t);
    const dip = 4 + 2 * Math.sin(t * 7);
    lines.push(
      <path
        key={i}
        d={`M${lx + 2},${y} Q${(lx + rx) / 2},${y + dip} ${rx - 2},${y}`}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={0.55}
      />,
    );
  }
  return <g>{lines}</g>;
}

function Tail({ tail, color, shadow }: { tail: Tail; color: string; shadow: string }) {
  if (tail === 'curl') {
    return (
      <g>
        <path
          d="M48,108 C52,118 60,124 64,122 C68,120 66,114 60,112 C56,111 53,109 50,108 Z"
          fill={color}
        />
        <path
          d="M62,116 Q66,118 64,120"
          fill="none"
          stroke={shadow}
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={0.5}
        />
      </g>
    );
  }
  return (
    <path
      d="M48,108 C50,120 56,134 58,138 C60,140 62,138 60,134 C58,128 56,118 54,108 Z"
      fill={color}
    />
  );
}
