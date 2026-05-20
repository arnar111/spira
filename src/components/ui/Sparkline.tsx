interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  dotLast?: boolean;
}

export function Sparkline({
  points,
  width = 120,
  height = 32,
  color = 'var(--moss-300)',
  fill = true,
  dotLast = true,
}: SparklineProps) {
  if (!points.length) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1 || 1);
  const ys = points.map((p) => height - 4 - ((p - min) / range) * (height - 8));
  const path = points.map((_, i) => `${i ? 'L' : 'M'} ${i * stepX} ${ys[i]}`).join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {fill && <path d={area} fill={color} opacity={0.18} />}
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
          cy={ys[ys.length - 1]}
          r={3}
          fill={color}
          stroke="var(--moss-950)"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}
