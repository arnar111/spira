import { Trophy } from 'lucide-react';
import type { VarietyYield } from '@/lib/harvestStats';
import { SectionTitle, MutedCard } from './parts';

/** Grömm sem strengur — kg (íslenskt kommu-tugabrot) þegar ≥ 1000 g. */
function fmtWeight(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.', ',')} kg`;
  return `${Math.round(g)} g`;
}

/**
 * Afbrigða-stigatafla — RAUN-uppskera (það sem þegar er tínt) þvert á allar
 * ræktanir, raðað eftir heildarþyngd. Efsta afbrigðið fær „besta afbrigðið þitt".
 */
export function VarietyBoardSection({ board }: { board: VarietyYield[] }) {
  return (
    <section className="mb-8">
      <SectionTitle>Afbrigða-stigatafla</SectionTitle>
      {board.length === 0 ? (
        <MutedCard>
          Engin uppskera skráð enn. Skráðu tínslur (með þyngd, og gjarnan fjölda)
          svo Rós geti raðað afbrigðunum þínum eftir raun-uppskeru.
        </MutedCard>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-cream-300/55 px-0.5">
            Raun-uppskera — það sem þú hefur þegar tínt.
          </p>
          {board.map((v, i) => (
            <VarietyRow key={v.key} rank={i + 1} variety={v} best={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

function VarietyRow({
  rank,
  variety,
  best,
}: {
  rank: number;
  variety: VarietyYield;
  best: boolean;
}) {
  const gPerPod = variety.totalPods > 0 ? variety.totalG / variety.totalPods : null;
  return (
    <div
      className="rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: best ? 'rgba(194,106,77,.14)' : 'rgba(36,56,39,.55)',
        border: best ? '1px solid rgba(194,106,77,.32)' : '1px solid rgba(64,104,67,.4)',
      }}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center sp-mono text-sm font-semibold"
        style={{
          background: 'rgba(18,31,20,.55)',
          color: best ? 'var(--terra-300)' : 'var(--cream-300)',
        }}
      >
        {best ? <Trophy size={15} /> : rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-cream-50 text-sm font-medium truncate">{variety.label}</div>
        {best && (
          <div className="text-[11px] sp-mono" style={{ color: 'var(--terra-300)' }}>
            Besta afbrigðið þitt
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="sp-mono text-sm text-cream-50">{fmtWeight(variety.totalG)}</div>
        {gPerPod !== null && (
          <div className="text-[10px] text-cream-300/55 sp-mono">
            {gPerPod.toFixed(0)} g/aldin
          </div>
        )}
      </div>
    </div>
  );
}
