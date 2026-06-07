import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Archive, RotateCcw } from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';
import { Chili } from '@/components/Chili';
import { db } from '@/lib/db';
import { LOCATIONS } from '@/lib/locations';
import { chiliForVarietyName } from '@/lib/varieties';

export function History() {
  const grows = useLiveQuery(() => db.grows.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());
  const harvests = useLiveQuery(() => db.harvests.toArray());

  if (!grows || !plants || !harvests) return null;

  const archived = grows.filter((g) => g.archived);

  async function reopen(id: string) {
    if (!confirm('Opna ræktun aftur?')) return;
    await db.grows.update(id, { archived: false, endDate: undefined, updatedAt: Date.now() });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-5 sm:px-7 py-6"
    >
      <header className="mb-5">
        <Eyebrow color="var(--terra-300)">Safn</Eyebrow>
        <h1 className="sp-h1" style={{ marginTop: 6 }}>
          <Archive size={22} className="inline-block mr-1" />
          Lokaðar ræktanir
        </h1>
      </header>

      <div className="flex flex-col gap-3">
        {archived.length === 0 && (
          <div className="text-sm text-cream-300/60 text-center py-8 border border-dashed border-moss-800/40 rounded-2xl">
            Engar lokaðar ræktanir.
          </div>
        )}
        {archived.map((g) => {
          const gp = plants.filter((p) => p.growId === g.id);
          const gh = harvests.filter((h) => h.growId === g.id);
          const total = gh.reduce((s, h) => s + h.weightG, 0);
          const loc = LOCATIONS.find((l) => l.key === g.locationKey);
          const days =
            g.endDate && g.startDate
              ? Math.round((g.endDate - g.startDate) / (24 * 60 * 60 * 1000))
              : 0;
          return (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-2xl p-3 border bg-moss-900/40 border-moss-800/40"
            >
              <Chili variety={chiliForVarietyName(gp[0]?.variety)} size={50} tilt={6} />
              <div className="flex-1 min-w-0">
                <Link
                  to={`/grow/${g.id}`}
                  className="text-cream-50 font-medium text-sm hover:text-cream-100"
                >
                  {g.name}
                </Link>
                <div className="text-[11px] text-cream-300/60 mt-0.5">
                  {gp.length} plöntur · {days} dagar · {total.toFixed(0)}g uppskera
                </div>
                <div className="flex gap-1 mt-1.5">
                  {loc && <Pill tone="dark" size="sm">{loc.label}</Pill>}
                  <Pill tone="terra" size="sm">{total.toFixed(0)}g</Pill>
                </div>
              </div>
              <button
                type="button"
                onClick={() => reopen(g.id)}
                className="flex items-center gap-1 text-[11px] text-cream-300 hover:text-cream-100 px-2 py-1 rounded-md border border-moss-800"
                title="Opna aftur"
              >
                <RotateCcw size={11} /> Opna
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
