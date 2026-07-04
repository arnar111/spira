import {
  bandStatus,
  envTargetForPhase,
  formatBand,
  statusLabel,
  type Band,
  type BandStatus,
} from '@/lib/envTargets';
import type { GrowPhase, PlantCategory } from '@/lib/db';

const STATUS_COLOR: Record<BandStatus, string> = {
  in: 'var(--moss-300)',
  low: 'var(--cap-400)',
  high: 'var(--cap-400)',
};

function Row({
  label,
  value,
  unit,
  band,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  band: Band;
}) {
  if (value === undefined) return null;
  const status = bandStatus(value, band);
  const color = STATUS_COLOR[status];
  return (
    <div className="flex items-center justify-between gap-2 text-[11.5px]">
      <span className="text-cream-300/75">
        {label}{' '}
        <span className="sp-mono text-cream-100">
          {Number(value.toFixed(1))}
          {unit}
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="sp-mono text-[10px] text-cream-400/55">
          {formatBand(band, unit)}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ color, border: `1px solid ${color}`, background: 'rgba(18,31,20,.5)' }}
        >
          {statusLabel(status)}
        </span>
      </span>
    </div>
  );
}

/**
 * Núverandi hita/raka-lestur borinn saman við fasa-bundin markgildi (3.3).
 * „innan marka" í moss, utan marks í terracotta. Sýnir aðeins þau gildi sem til
 * eru. Skilar null ef hvorki hiti né raki er gefið.
 */
export function EnvBand({
  phase,
  category,
  tempC,
  humidityPct,
}: {
  phase: GrowPhase;
  /** Flokkur ráðandi plöntu — kryddjurtir/lauf fá sín eigin bönd (5.x). */
  category?: PlantCategory;
  tempC?: number;
  humidityPct?: number;
}) {
  if (tempC === undefined && humidityPct === undefined) return null;
  const target = envTargetForPhase(phase, category);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-cream-400/60">
        Markgildi fasa
      </div>
      <Row label="Hiti" value={tempC} unit="°C" band={target.tempC} />
      <Row label="Raki" value={humidityPct} unit="%" band={target.humidityPct} />
      <div className="text-[10px] text-cream-400/55 leading-snug">{target.note}</div>
    </div>
  );
}
