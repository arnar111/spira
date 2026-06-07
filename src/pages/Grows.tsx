import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SearchInput, NoResults } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';
import { GrowRow } from '@/components/GrowRow';
import { GrowsSkeleton } from '@/components/PageSkeletons';
import { useDelayedFlag } from '@/lib/useDelayedFlag';
import { db } from '@/lib/db';

export function Grows() {
  const navigate = useNavigate();
  const grows = useLiveQuery(() => db.grows.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('is');
    return (grows ?? [])
      .slice()
      .sort((a, b) => Number(a.archived) - Number(b.archived) || b.startDate - a.startDate)
      .filter((g) => {
        if (!q) return true;
        return `${g.name} ${g.location}`.toLocaleLowerCase('is').includes(q);
      });
  }, [grows, query]);

  const loading = !grows || !plants;
  const showSkeleton = useDelayedFlag(loading);
  if (loading) return showSkeleton ? <GrowsSkeleton /> : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-5 sm:px-7 py-6"
    >
      <header className="flex items-end justify-between mb-5">
        <div>
          <Eyebrow color="var(--terra-300)">Allar ræktanir</Eyebrow>
          <h1 className="sp-h1" style={{ marginTop: 6 }}>
            Ræktanir
          </h1>
        </div>
        <Button size="sm" onClick={() => navigate('/setup')}>
          <Plus size={14} /> Ný
        </Button>
      </header>

      {grows.length > 0 && (
        <div className="mb-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Leita að ræktun eða staðsetningu"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sorted.length === 0 &&
          (grows.length === 0 ? (
            <div className="text-cream-300/60 text-sm border border-dashed border-moss-800/40 rounded-2xl p-6 text-center">
              Engar ræktanir enn. Smelltu „Ný" til að byrja.
            </div>
          ) : (
            <NoResults message="Engar ræktanir passa við leitina." />
          ))}
        {sorted.map((g) => (
          <GrowRow key={g.id} grow={g} plants={plants.filter((p) => p.growId === g.id)} />
        ))}
      </div>
    </motion.div>
  );
}
