import { Activity, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { scoreColor } from '@/components/ros/rosWindowState';
import { MAX_HEALTH_SCORE } from '@/lib/ros/assessment';
import type { HealthRow } from './useRosOverviewData';
import { SectionTitle, MutedCard } from './parts';

/**
 * Heilsuyfirlit — nýjasta heilsuskor allra virkra plantna þvert á ræktanir,
 * með þróunarör frá fyrra mati. Smella á röð ⇒ opna ræktunina.
 */
export function HealthSection({
  health,
  onOpen,
}: {
  health: HealthRow[];
  onOpen: (growId: string) => void;
}) {
  return (
    <section className="mb-8">
      <SectionTitle>Heilsuyfirlit</SectionTitle>
      {health.length === 0 ? (
        <MutedCard>
          Engin heilsumöt enn. Opnaðu ræktun, ýttu á „Spyrja Rós" og veldu
          Heilsa til að meta plöntu af mynd — skorin birtast hér.
        </MutedCard>
      ) : (
        <div className="flex flex-col gap-2">
          {health.map((row) => (
            <HealthRowCard key={row.plantId} row={row} onOpen={() => onOpen(row.growId)} />
          ))}
        </div>
      )}
    </section>
  );
}

function HealthRowCard({ row, onOpen }: { row: HealthRow; onOpen: () => void }) {
  const edge = scoreColor(row.score);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl p-3 flex items-center gap-3 transition-colors active:scale-[.995]"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
        borderLeft: `3px solid ${edge}`,
      }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(115,159,115,.16)', color: edge }}
      >
        <Activity size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-cream-50 text-sm font-medium truncate">{row.label}</div>
      </div>
      <TrendArrow trend={row.trend} />
      {row.score !== null && (
        <span
          className="shrink-0 text-[11px] sp-mono px-2 py-1 rounded-full font-medium"
          style={{ background: 'rgba(18,31,20,.55)', color: edge, border: `1px solid ${edge}` }}
        >
          {row.score}/{MAX_HEALTH_SCORE}
        </span>
      )}
    </button>
  );
}

function TrendArrow({ trend }: { trend: HealthRow['trend'] }) {
  if (trend === null) return null;
  if (trend === 1)
    return <ArrowUpRight size={15} style={{ color: 'var(--moss-300)' }} aria-label="batnar" />;
  if (trend === -1)
    return <ArrowDownRight size={15} style={{ color: 'var(--cap-400)' }} aria-label="versnar" />;
  return <Minus size={15} style={{ color: 'var(--cream-400)' }} aria-label="óbreytt" />;
}
