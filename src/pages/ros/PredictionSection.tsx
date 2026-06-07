import { Activity, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { plantLabel } from '@/lib/ros/engine';
import type { Plant } from '@/lib/db';
import { dayWord } from '@/lib/dates';
import type { GrowHarvestOutlook } from '@/lib/ros/predict';
import { SectionTitle, MutedCard } from './parts';

export function PredictionSection({
  predictions,
}: {
  predictions: GrowHarvestOutlook[];
}) {
  return (
    <section className="mb-8">
      <SectionTitle>Uppskeruspá</SectionTitle>
      {predictions.length === 0 ? (
        <MutedCard>
          Engin uppskeruspá enn — Rós áætlar glugga um leið og plöntur komast á
          blóma- eða aldinfasa.
        </MutedCard>
      ) : (
        <div className="flex flex-col gap-2">
          {predictions.map(({ prediction, plant }) => (
            <PredictionRow
              key={plant.id}
              plant={plant}
              daysUntilStart={prediction.daysUntilStart}
              progress={prediction.progress}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PredictionRow({
  plant,
  daysUntilStart,
  progress,
}: {
  plant: Plant;
  daysUntilStart: number;
  progress: number;
}) {
  const navigate = useNavigate();
  const pct = Math.max(0, Math.min(1, progress));
  const windowLabel =
    daysUntilStart <= 0
      ? 'opinn núna'
      : `gluggi opnast eftir ${daysUntilStart} ${dayWord(daysUntilStart)}`;

  return (
    <button
      type="button"
      onClick={() => navigate(`/grow/${plant.growId}`)}
      className="w-full text-left rounded-2xl p-3 transition-colors hover:bg-moss-800/40"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(115,159,115,.16)', color: 'var(--moss-300)' }}
        >
          <Activity size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-cream-50 text-sm font-medium truncate">
            {plantLabel(plant)}
          </div>
          <div className="text-[11px] text-cream-300/70 truncate">
            {plant.variety}
          </div>
        </div>
        <span
          className="shrink-0 text-[11px] sp-mono"
          style={{
            color:
              daysUntilStart <= 0 ? 'var(--moss-300)' : 'rgba(231,217,168,.75)',
          }}
        >
          {windowLabel}
        </span>
        <ChevronRight size={14} className="shrink-0 text-cream-300/40" />
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 6, background: 'rgba(18,31,20,.6)' }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            background: 'var(--moss-400)',
            borderRadius: 999,
          }}
        />
      </div>
    </button>
  );
}
