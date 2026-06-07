import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { GrowRow } from '@/components/GrowRow';
import { db } from '@/lib/db';

export function Grows() {
  const navigate = useNavigate();
  const grows = useLiveQuery(() => db.grows.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());

  const sorted = useMemo(
    () =>
      (grows ?? [])
        .slice()
        .sort((a, b) => Number(a.archived) - Number(b.archived) || b.startDate - a.startDate),
    [grows],
  );

  if (!grows || !plants) return null;

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

      <div className="flex flex-col gap-3">
        {sorted.length === 0 && (
          <div className="text-cream-300/60 text-sm border border-dashed border-moss-800/40 rounded-2xl p-6 text-center">
            Engar ræktanir enn. Smelltu „Ný" til að byrja.
          </div>
        )}
        {sorted.map((g) => (
          <GrowRow key={g.id} grow={g} plants={plants.filter((p) => p.growId === g.id)} />
        ))}
      </div>
    </motion.div>
  );
}
