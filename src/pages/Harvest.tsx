import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Plus, Scale } from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Chili } from '@/components/Chili';
import { db, newId, type Plant } from '@/lib/db';
import { chiliForVarietyName, formatShu, varietyByName } from '@/lib/varieties';

export function Harvest() {
  const harvests = useLiveQuery(() => db.harvests.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());
  const grows = useLiveQuery(() => db.grows.toArray());
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const list = harvests ?? [];
    const total = list.reduce((s, h) => s + (h.weightG ?? 0), 0);
    const pods = list.reduce((s, h) => s + (h.podCount ?? 0), 0);
    return { total, pods, count: list.length };
  }, [harvests]);

  const perPlant = useMemo(() => {
    if (!harvests || !plants) return [];
    const map = new Map<string, { plant: Plant; total: number; pods: number; count: number }>();
    for (const h of harvests) {
      const plant = plants.find((p) => p.id === h.plantId);
      if (!plant) continue;
      const prev = map.get(plant.id) ?? { plant, total: 0, pods: 0, count: 0 };
      prev.total += h.weightG ?? 0;
      prev.pods += h.podCount ?? 0;
      prev.count += 1;
      map.set(plant.id, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [harvests, plants]);

  if (!harvests || !plants || !grows) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-5 sm:px-7 py-6"
    >
      <header className="flex items-end justify-between mb-5">
        <div>
          <Eyebrow color="var(--terra-300)">Uppskera</Eyebrow>
          <h1 className="sp-h1" style={{ marginTop: 6 }}>
            <Scale size={22} className="inline-block mr-1" /> {stats.total.toFixed(0)}g
          </h1>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> Skrá
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <Card tone="strong" padding={12} radius={14}>
          <Eyebrow>POD ALLS</Eyebrow>
          <div className="sp-stat text-cream-50" style={{ fontSize: 22 }}>
            {stats.pods}
          </div>
        </Card>
        <Card tone="strong" padding={12} radius={14}>
          <Eyebrow>TÍNSLUR</Eyebrow>
          <div className="sp-stat text-cream-50" style={{ fontSize: 22 }}>
            {stats.count}
          </div>
        </Card>
        <Card tone="strong" padding={12} radius={14}>
          <Eyebrow>MEÐAL/POD</Eyebrow>
          <div className="sp-stat text-cream-50" style={{ fontSize: 22 }}>
            {stats.pods > 0 ? (stats.total / stats.pods).toFixed(1) : '—'}
            <span className="sp-mono text-cream-400" style={{ fontSize: 11 }}>g</span>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        {perPlant.length === 0 && (
          <div className="text-sm text-cream-300/60 text-center py-8 border border-dashed border-moss-800/40 rounded-2xl">
            Engin uppskera enn. Skráðu fyrstu tínslu með „Skrá".
          </div>
        )}
        {perPlant.map(({ plant, total, pods, count }) => {
          const variety = varietyByName(plant.variety);
          return (
            <div
              key={plant.id}
              className="flex items-center gap-3 rounded-2xl p-3 border bg-moss-900/40 border-moss-800/40"
            >
              <Chili variety={chiliForVarietyName(plant.variety)} size={44} tilt={-4} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-cream-50 font-medium text-sm">
                    {plant.nickname || plant.variety}
                  </span>
                  {variety && (
                    <Pill tone="cream" size="sm">
                      {variety.motherSpecies}
                    </Pill>
                  )}
                  {variety && variety.shu! > 0 && (
                    <Pill tone="cap" size="sm">
                      {formatShu(variety.shu!)} SHU
                    </Pill>
                  )}
                </div>
                <div className="text-[11px] text-cream-300/60 mt-0.5">
                  {pods} pods · {count} tínslur
                </div>
              </div>
              <div className="text-right">
                <div className="sp-stat" style={{ fontSize: 22, color: 'var(--cap-400)' }}>
                  {total.toFixed(0)}
                  <span className="sp-mono text-cream-400 ml-1" style={{ fontSize: 11 }}>
                    g
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <HarvestDialog
          plants={plants.filter((p) => !p.archived)}
          onClose={() => setOpen(false)}
        />
      )}
    </motion.div>
  );
}

function HarvestDialog({
  plants,
  onClose,
}: {
  plants: Plant[];
  onClose: () => void;
}) {
  const [plantId, setPlantId] = useState(plants[0]?.id ?? '');
  const [weight, setWeight] = useState('');
  const [pods, setPods] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedPlant = plants.find((p) => p.id === plantId);

  async function submit() {
    if (!selectedPlant || !weight) return;
    setBusy(true);
    await db.harvests.add({
      id: newId(),
      growId: selectedPlant.growId,
      plantId: selectedPlant.id,
      timestamp: Date.now(),
      weightG: parseFloat(weight),
      podCount: pods ? parseInt(pods, 10) : undefined,
      note: note.trim() || undefined,
    });
    setBusy(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5"
        style={{
          background: 'rgba(36,56,39,.96)',
          border: '1px solid rgba(64,104,67,.55)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Eyebrow>Ný uppskera</Eyebrow>
        <h3 className="sp-h3" style={{ marginTop: 4 }}>
          Skrá tínslu
        </h3>

        <label className="text-xs text-cream-300/80 block mt-4 mb-1.5">Planta</label>
        <select
          value={plantId}
          onChange={(e) => setPlantId(e.target.value)}
          className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400"
        >
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.variety}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs text-cream-300/80 block mb-1.5">Þyngd</label>
            <div className="relative">
              <input
                autoFocus
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value.replace(',', '.'))}
                placeholder="0"
                className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 pr-7 text-sm text-cream-100 outline-none focus:border-moss-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400/60 text-xs">
                g
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs text-cream-300/80 block mb-1.5">Pod-talning</label>
            <input
              inputMode="numeric"
              value={pods}
              onChange={(e) => setPods(e.target.value)}
              placeholder="—"
              className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400"
            />
          </div>
        </div>

        <label className="text-xs text-cream-300/80 block mt-3 mb-1.5">Athugasemd</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="t.d. fyrsta tínsla, fersk"
          className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2 text-sm text-cream-100 outline-none focus:border-moss-400"
        />

        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Hætta við
          </Button>
          <Button size="sm" disabled={busy || !weight} onClick={submit}>
            Vista
          </Button>
        </div>
      </div>
    </div>
  );
}
