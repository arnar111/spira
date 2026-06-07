import { useId } from 'react';

/** Tilvísunarlína (meðal/lágmark/hámark) sem hægt er að birta yfir línuritinu. */
type ReferenceLine = 'avg' | 'min' | 'max';

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Fylling undir línu (nú með token-litaðri halla). Sjálfgefið true. */
  fill?: boolean;
  /** Punktur á síðasta gildi. Sjálfgefið true. */
  dotLast?: boolean;
  // — Nýtt í 2.4 (allt valfrjálst, gömul köll óbreytt) —
  /** Mýking ferilsins (Catmull-Rom → Bézier). Sjálfgefið false (bein lína). */
  smooth?: boolean;
  /** Birta lágmark/hámark/meðal sem dauft strik. */
  reference?: ReferenceLine;
  /** Sýna gildi síðasta punkts sem merki við punktinn. */
  lastLabel?: boolean;
  /** Snið á síðasta-gildis-merkinu (t.d. (v) => `${v.toFixed(1)}°`). */
  formatValue?: (v: number) => string;
  /** Dagsetningarmerki á x-ás: [fyrsta, síðasta]. Birtist undir línuritinu. */
  xLabels?: [string, string];
  /** Texti þegar engin gögn eru (sjálfgefið „Engin gögn"). */
  emptyText?: string;
}

/** Catmull-Rom → kúbískur Bézier ferill um punktana (SVG, ekkert chart-lib). */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function Sparkline({
  points,
  width = 120,
  height = 32,
  color = 'var(--moss-300)',
  fill = true,
  dotLast = true,
  smooth = false,
  reference,
  lastLabel = false,
  formatValue = (v) => String(Math.round(v)),
  xLabels,
  emptyText = 'Engin gögn',
}: SparklineProps) {
  const gradId = useId();

  if (!points.length) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(231,217,168,.4)',
        }}
      >
        {emptyText}
      </div>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const avg = points.reduce((s, p) => s + p, 0) / points.length;
  const stepX = width / (points.length - 1 || 1);
  const toY = (v: number) => height - 4 - ((v - min) / range) * (height - 8);
  const coords = points.map((p, i) => ({ x: i * stepX, y: toY(p) }));

  const path = smooth
    ? smoothPath(coords)
    : coords.map((c, i) => `${i ? 'L' : 'M'} ${c.x} ${c.y}`).join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  const refValue =
    reference === 'avg' ? avg : reference === 'min' ? min : reference === 'max' ? max : null;
  const refY = refValue !== null ? toY(refValue) : null;

  const lastY = coords[coords.length - 1].y;

  return (
    <div style={{ width }}>
      <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
        {fill && (
          <>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradId})`} />
          </>
        )}
        {refY !== null && (
          <line
            x1={0}
            y1={refY}
            x2={width}
            y2={refY}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.35}
          />
        )}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dotLast && (
          <circle
            cx={width}
            cy={lastY}
            r={3}
            fill={color}
            stroke="var(--moss-950)"
            strokeWidth={1.5}
          />
        )}
        {lastLabel && (
          <text
            x={width}
            y={lastY - 6}
            textAnchor="end"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: color }}
          >
            {formatValue(points[points.length - 1])}
          </text>
        )}
      </svg>
      {xLabels && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 2,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'rgba(231,217,168,.4)',
          }}
        >
          <span>{xLabels[0]}</span>
          <span>{xLabels[1]}</span>
        </div>
      )}
    </div>
  );
}
