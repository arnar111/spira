import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Sparkline } from '@/components/ui/Sparkline';
import { RangeToggle } from '@/components/ui/RangeToggle';
import { Modal } from '@/components/ui/Modal';
import { withinRange, type RangeDays } from '@/lib/range';
import { Button } from '@/components/ui/Button';
import { DaylightCard } from '@/components/DaylightCard';
import { SeasonCard } from '@/components/SeasonCard';
import { VeritableCard } from '@/components/VeritableCard';
import { GrowsSkeleton } from '@/components/PageSkeletons';
import { useDelayedFlag } from '@/lib/useDelayedFlag';
import { db, newId } from '@/lib/db';
import { announce } from '@/lib/announce';
import { celebrate } from '@/lib/celebrate';
import { growIsOutdoor } from '@/lib/season';

/** Íslenskt heiti á völdum tímaglugga fyrir línurits-merki. */
function rangeLabel(range: RangeDays): string {
  return range === null ? 'allt tímabilið' : `${range} dagar`;
}

/** Meðaltal þeirra mælinga sem raunverulega bera gildið — engin fölsk núll. */
function avgOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function Environment() {
  const env = useLiveQuery(() => db.environment.toArray());
  const allGrows = useLiveQuery(() => db.grows.toArray());
  const allPlants = useLiveQuery(() => db.plants.toArray());
  const [openGrowId, setOpenGrowId] = useState<string | null>(null);
  const [range, setRange] = useState<RangeDays>(14);

  const loading = !allGrows || !env || !allPlants;
  const showSkeleton = useDelayedFlag(loading);
  if (loading) return showSkeleton ? <GrowsSkeleton /> : null;
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
      <header className="flex items-end justify-between mb-5 gap-3">
        <div>
          <Eyebrow color="var(--terra-300)">Umhverfis-skrá</Eyebrow>
          <h1 className="sp-h1" style={{ marginTop: 6 }}>
            Hiti & raki
          </h1>
        </div>
        {active.length > 0 && <RangeToggle value={range} onChange={setRange} />}
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
          const samples = withinRange(
            env.filter((e) => e.growId === g.id).sort((a, b) => a.timestamp - b.timestamp),
            range,
          );
          const last = samples[samples.length - 1];
          // Aðeins mælingar sem BERA gildið — annars dró „tempC ?? 0" línurit
          // og meðaltöl niður í fölsk núll þegar bara annað gildið var skráð.
          const tempPoints = samples
            .map((s) => s.tempC)
            .filter((v): v is number => v !== undefined && v !== null);
          const humPoints = samples
            .map((s) => s.humidityPct)
            .filter((v): v is number => v !== undefined && v !== null);
          const avgTemp = avgOf(tempPoints);
          const avgHum = avgOf(humPoints);
          if (g.locationKey === 'veritable') {
            const growPlants = allPlants.filter((p) => p.growId === g.id);
            return (
              <VeritableCard
                key={g.id}
                growId={g.id}
                startDate={g.startDate}
                plants={growPlants}
              />
            );
          }
          return (
            <Card key={g.id} tone="strong" radius={18} padding={16}>
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <Eyebrow>{g.location}</Eyebrow>
                  <div className="sp-h3" style={{ fontSize: 18 }}>
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
                {/* Ljóstími aðeins ef hann er raunverulega stilltur — ekki fundinn upp. */}
                <Stat
                  label="LJÓS"
                  value={g.lightOnHours != null ? String(g.lightOnHours) : '—'}
                  unit="klst"
                  tone="terra"
                />
              </div>
              {tempPoints.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-cream-400/60 mb-1">
                    Hiti — {rangeLabel(range)}
                    {avgTemp !== null ? ` (meðal ${avgTemp.toFixed(1)}°C)` : ''}
                  </div>
                  <Sparkline
                    points={tempPoints}
                    width={320}
                    height={36}
                    color="var(--terra-400)"
                    smooth
                    reference="avg"
                    lastLabel
                    formatValue={(v) => `${v.toFixed(1)}°`}
                  />
                </div>
              )}
              {humPoints.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-cream-400/60 mb-1">
                    Raki — {rangeLabel(range)}
                    {avgHum !== null ? ` (meðal ${avgHum.toFixed(0)}%)` : ''}
                  </div>
                  <Sparkline
                    points={humPoints}
                    width={320}
                    height={36}
                    color="var(--moss-300)"
                    smooth
                    reference="avg"
                    lastLabel
                    formatValue={(v) => `${v.toFixed(0)}%`}
                  />
                </div>
              )}
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

/**
 * Umhverfis-lestur um ui/Modal (5.x) — áður hrár `fixed inset-0` fleki án
 * fókusgildru/Escape/ARIA, þvert á yfirlags-reglu appsins. Reitirnir byrja
 * tómir svo einnar-snertingar rusl-mælingar (24°/60%) verði ekki til óvart.
 */
function EnvDialog({ growId, onClose }: { growId: string; onClose: () => void }) {
  const [temp, setTemp] = useState('');
  const [hum, setHum] = useState('');
  const [busy, setBusy] = useState(false);

  const tempC = parseFloat(temp);
  const humidityPct = parseFloat(hum);
  const hasTemp = Number.isFinite(tempC);
  const hasHum = Number.isFinite(humidityPct);
  const canSubmit = hasTemp || hasHum;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    await db.environment.add({
      id: newId(),
      growId,
      timestamp: Date.now(),
      tempC: hasTemp ? tempC : undefined,
      humidityPct: hasHum ? humidityPct : undefined,
    });
    setBusy(false);
    announce('Mæling skráð');
    celebrate('environment');
    onClose();
  }

  return (
    <Modal open onClose={onClose} eyebrow="Ný umhverfis-lestur" title="Skrá hita og raka">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-cream-300/80 block mb-1.5">Hiti</label>
          <div className="relative">
            <input
              autoFocus
              inputMode="decimal"
              value={temp}
              placeholder="t.d. 24"
              onChange={(e) => setTemp(e.target.value.replace(',', '.'))}
              className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 pr-9 text-sm text-cream-100 outline-none focus:border-moss-400 placeholder:text-cream-400/40"
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
              placeholder="t.d. 60"
              onChange={(e) => setHum(e.target.value.replace(',', '.'))}
              className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 pr-9 text-sm text-cream-100 outline-none focus:border-moss-400 placeholder:text-cream-400/40"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400/60 text-xs">
              %
            </span>
          </div>
        </div>
      </div>

      {!canSubmit && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--terra-300)' }}>
          Skráðu hita eða raka.
        </p>
      )}

      <div className="mt-5 flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Hætta við
        </Button>
        <Button size="sm" disabled={busy || !canSubmit} onClick={submit}>
          Vista
        </Button>
      </div>
    </Modal>
  );
}
