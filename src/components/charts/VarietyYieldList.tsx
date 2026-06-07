import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { db } from '@/lib/db';
import { yieldByVariety } from '@/lib/harvestStats';

/**
 * „Uppskera eftir afbrigði" (3.3): raðaður samanburður á uppskeru hvers
 * afbrigðis þvert á ALLAR ræktanir, líka geymdar. Sjálfstætt kort — sækir sín
 * eigin gögn svo Harvest-síðan þurfi aðeins eina línu til að birta það.
 */
export function VarietyYieldList({ className }: { className?: string }) {
  const harvests = useLiveQuery(() => db.harvests.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());

  const ranked = useMemo(
    () => yieldByVariety(harvests ?? [], plants ?? []),
    [harvests, plants],
  );

  if (ranked.length === 0) return null;
  const max = Math.max(...ranked.map((r) => r.totalG), 1);

  return (
    <Card tone="strong" radius={18} padding={16} className={className}>
      <Eyebrow>Uppskera eftir afbrigði</Eyebrow>
      <div className="flex flex-col gap-2 mt-2">
        {ranked.map((r) => (
          <div key={r.key}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-cream-100 text-sm font-medium truncate">{r.label}</span>
              <span className="shrink-0 text-[11px] text-cream-300/65">
                <span className="sp-display text-cream-50" style={{ fontSize: 16 }}>
                  {r.totalG.toFixed(0)}
                </span>
                <span className="sp-mono ml-0.5">g</span>
                <span className="ml-2 text-cream-400/55">
                  {r.totalPods} pods · {r.count} tínslur
                </span>
              </span>
            </div>
            <div
              className="mt-1 rounded-full overflow-hidden"
              style={{ height: 5, background: 'rgba(18,31,20,.5)' }}
            >
              <div
                style={{
                  width: `${(r.totalG / max) * 100}%`,
                  height: '100%',
                  background: 'var(--cap-400)',
                  opacity: 0.85,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
