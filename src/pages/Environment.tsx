import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Plus, Thermometer } from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Sparkline } from '@/components/ui/Sparkline';
import { Button } from '@/components/ui/Button';
import { DaylightCard } from '@/components/DaylightCard';
import { SeasonCard } from '@/components/SeasonCard';
import { db, newId } from '@/lib/db';
import { growIsOutdoor } from '@/lib/season';
import { cn } from '@/lib/cn';

export function Environment() {
  const env = useLiveQuery(() => db.environment.toArray());
  const allGrows = useLiveQuery(() => db.grows.toArray());
  const [openGrowId, setOpenGrowId] = useState<string | null>(null);

  if (!allGrows || !env) return null;
  const active = allGrows.filter((g) => !g.archived);
  const anyOutdoor = active.some((g) => growIsOutdoor(g));
  const anyIndoor = active.length === 0 || active.some((g) => !growIsOutdoor(g));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-5 sm:px-7 py-6"
    >
      <header className="mb-5">
        <Eyebrow color="var(--terra-300)">Umhverfis-skrá</Eyebrow>
        <h1
          className="sp-display"
          style={{
            fontSize: 30,
            fontWeight: 500,
            color: 'var(--cream-50)',
            lineHeight: 1.05,
            marginTop: 6,
          }}
        >
          Hiti & raki
        </h1>
      </header>

      <div className="flex flex-col gap-3">
        {anyIndoor && <DaylightCard />}
        {anyOutdoor && <SeasonCard />}
        {active.length === 0 && (
          <div className="text-sm text-cream-300/60 text-center py-8 border border-dashed border-moss-800/40 rounded-2xl">
            Engar virkar ræktanir.
          </div>
        )}
        {active.map((g) => {
          const samples = env
            .filter((e) => e.growId === g.id)
            .sort((a, b) => a.timestamp - b.timestamp);
          const last = samples[samples.length - 1];
          const avgTemp =
            samples.length > 0
              ? samples.reduce((s, x) => s + (x.tempC ?? 0), 0) / samples.length
              : 0;
          const avgHum =
            samples.length > 0
              ? samples.reduce((s, x) => s + (x.humidityPct ?? 0), 0) / samples.length
              : 0;
          const tempPoints = samples.map((s) => s.tempC ?? 0);
          const humPoints = samples.map((s) => s.humidityPct ?? 0);
          return (
            <Card key={g.id} tone="strong" radius={18} padding={16}>
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <Eyebrow>{g.location}</Eyebrow>
                  <div
                    className="sp-display"
                    style={{ fontSize: 18, color: 'var(--cream-50)', fontWeight: 500 }}
                  >
                    {g.name}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setOpenGrowId(g.id)}>
                  <Plus size={12} /> Lesa
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="HITI" value={last?.tempC?.toFixed(1) ?? '—'} unit="°C" tone="cream" />
                <Stat label="RAKI" value={last?.humidityPct?.toFixed(0) ?? '—'} unit="%" tone="moss" />
                <Stat
                  label="LJÓS"
                  value={String(g.lightOnHours ?? 18)}
                  unit="klst"
                  tone="terra"
                />
              </div>
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-cream-400/60 mb-1">
                  Hiti — 14 dagar (meðal {avgTemp.toFixed(1)}°C)
                </div>
                <Sparkline
                  points={tempPoints.length > 0 ? tempPoints : [0, 0, 0]}
                  width={320}
                  height={32}
                  color="var(--terra-400)"
                />
              </div>
              <div className="mt-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-cream-400/60 mb-1">
                  Raki — 14 dagar (meðal {avgHum.toFixed(0)}%)
                </div>
                <Sparkline
                  points={humPoints.length > 0 ? humPoints : [0, 0, 0]}
                  width={320}
                  height={32}
                  color="var(--moss-300)"
                />
              </div>
            </Card>
          );
        })}
      </div>

      {openGrowId && (
        <EnvDialog
          growId={openGrowId}
          onClose={() => setOpenGrowId(null)}
        />
      )}
    </motion.div>
  );
}

function EnvDialog({ growId, onClose }: { growId: string; onClose: () => void }) {
  const [temp, setTemp] = useState('24');
  const [hum, setHum] = useState('60');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    await db.environment.add({
      id: newId(),
      growId,
      timestamp: Date.now(),
      tempC: parseFloat(temp),
      humidityPct: parseFloat(hum),
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
        className={cn('w-full max-w-md rounded-2xl p-5')}
        style={{
          background: 'rgba(36,56,39,.96)',
          border: '1px solid rgba(64,104,67,.55)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Eyebrow>Ný umhverfis-lestur</Eyebrow>
        <h3
          className="sp-display"
          style={{ fontSize: 22, color: 'var(--cream-50)', fontWeight: 500, marginTop: 4 }}
        >
          <Thermometer size={18} className="inline-block mr-1" />
          Skrá hita og raka
        </h3>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="text-xs text-cream-300/80 block mb-1.5">Hiti</label>
            <div className="relative">
              <input
                inputMode="decimal"
                value={temp}
                onChange={(e) => setTemp(e.target.value.replace(',', '.'))}
                className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 pr-9 text-sm text-cream-100 outline-none focus:border-moss-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400/60 text-xs">
                °C
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs text-cream-300/80 block mb-1.5">Raki</label>
            <div className="relative">
              <input
                inputMode="decimal"
                value={hum}
                onChange={(e) => setHum(e.target.value.replace(',', '.'))}
                className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 pr-9 text-sm text-cream-100 outline-none focus:border-moss-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400/60 text-xs">
                %
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Hætta við
          </Button>
          <Button size="sm" disabled={busy} onClick={submit}>
            Vista
          </Button>
        </div>
      </div>
    </div>
  );
}
