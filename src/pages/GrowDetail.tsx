import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Archive,
  Camera,
  ChevronRight,
  Droplet,
  Flame,
  Leaf,
  Plus,
  Scissors,
  Sparkles,
  StickyNote,
  Thermometer,
} from 'lucide-react';
import { Pill } from '@/components/ui/Pill';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PhaseBar } from '@/components/ui/PhaseBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlantGlyph } from '@/components/PlantGlyph';
import { DiagnoseDialog } from '@/components/DiagnoseDialog';
import {
  db,
  newId,
  type GrowPhase,
  type LogEntry,
  type LogType,
  type Plant,
} from '@/lib/db';
import {
  PHASES,
  TOTAL_CYCLE_DAYS,
  daysSince,
  getPhaseForDay,
} from '@/lib/phases';
import {
  COLOR_HEX,
  COLOR_LABEL,
  formatShu,
  isPepper,
  isTomato,
  varietyByName,
} from '@/lib/varieties';
import { LOCATIONS } from '@/lib/locations';
import { cn } from '@/lib/cn';

const PHASE_OPTIONS: { id: GrowPhase; label: string }[] = [
  { id: 'planning', label: 'Áætlun' },
  { id: 'germinating', label: 'Spírun' },
  { id: 'seedling', label: 'Plöntu' },
  { id: 'vegetative', label: 'Veg' },
  { id: 'flowering', label: 'Blómgun' },
  { id: 'fruiting', label: 'Aldin' },
  { id: 'ripening', label: 'Þroskast' },
  { id: 'harvest', label: 'Uppskera' },
];

const LOG_TYPES: { id: LogType; label: string; icon: typeof Droplet }[] = [
  { id: 'water', label: 'Vökva', icon: Droplet },
  { id: 'feed', label: 'Næring', icon: Leaf },
  { id: 'note', label: 'Nóta', icon: StickyNote },
  { id: 'prune', label: 'Klippt', icon: Scissors },
  { id: 'top', label: 'Toppað', icon: Sparkles },
  { id: 'pollinate', label: 'Frjóvgun', icon: Flame },
  { id: 'environment', label: 'Umhverfi', icon: Thermometer },
];

export function GrowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const grow = useLiveQuery(() => (id ? db.grows.get(id) : undefined), [id]);
  const plants = useLiveQuery(
    () => (id ? db.plants.where('growId').equals(id).toArray() : []),
    [id],
  );
  const logs = useLiveQuery(
    () => (id ? db.logs.where('growId').equals(id).reverse().sortBy('timestamp') : []),
    [id],
  );
  const harvests = useLiveQuery(
    () => (id ? db.harvests.where('growId').equals(id).toArray() : []),
    [id],
  );

  const [openLog, setOpenLog] = useState(false);
  const [openDiagnose, setOpenDiagnose] = useState(false);

  if (!grow || !plants || !logs) return null;

  const day = daysSince(grow.startDate);
  const phase = getPhaseForDay(day);
  const loc = LOCATIONS.find((l) => l.key === grow.locationKey);
  const heroVariety = plants[0]?.variety ?? 'Habanero Helios';
  const totalHarvest = (harvests ?? []).reduce((s, h) => s + (h.weightG ?? 0), 0);

  async function archiveGrow() {
    if (!grow) return;
    if (!confirm(`Loka ræktun "${grow.name}"?`)) return;
    await db.grows.update(grow.id, { archived: true, endDate: Date.now(), updatedAt: Date.now() });
    navigate('/grows');
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-5 sm:px-7 py-6"
    >
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-cream-300 hover:text-cream-100 transition-colors text-sm mb-3"
      >
        <ArrowLeft size={16} />
        Til baka
      </button>

      <div
        style={{
          position: 'relative',
          borderRadius: 22,
          overflow: 'hidden',
          background: 'rgba(36,56,39,.55)',
          border: '1px solid rgba(64,104,67,.45)',
          backdropFilter: 'blur(20px) saturate(160%)',
          padding: 18,
          paddingRight: 120,
        }}
      >
        <div style={{ position: 'absolute', right: -8, top: -4 }}>
          <PlantGlyph name={heroVariety} size={130} tilt={8} />
        </div>
        <div className="flex gap-1.5 mb-2">
          {loc && <Pill tone="moss" size="sm">{loc.label}</Pill>}
          <Pill tone="cap" size="sm">D{day}</Pill>
          {grow.archived && <Pill tone="dark" size="sm">Lokað</Pill>}
        </div>
        <Eyebrow>{grow.location}</Eyebrow>
        <div
          className="sp-display"
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: 'var(--cream-50)',
            lineHeight: 1.1,
            marginTop: 4,
            marginBottom: 10,
          }}
        >
          {grow.name}
        </div>
        <PhaseBar phases={PHASES} currentDay={day} totalDays={TOTAL_CYCLE_DAYS} />
        <div
          className="sp-mono"
          style={{
            fontSize: 10,
            marginTop: 8,
            color: 'rgba(231,217,168,.55)',
            letterSpacing: '0.12em',
          }}
        >
          {phase.label.toUpperCase()} · {plants.length} PLÖNTUR
          {grow.spaceWidthCm && grow.spaceDepthCm
            ? ` · ${grow.spaceWidthCm}×${grow.spaceDepthCm} CM`
            : ''}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <Stat label="Dagur" value={String(day)} />
        <Stat label="Plöntur" value={String(plants.length)} />
        <Stat label="Uppskera" value={`${totalHarvest.toFixed(0)}g`} />
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="sp-display text-cream-50" style={{ fontSize: 20, fontWeight: 500 }}>
            Plöntur
          </h2>
          {plants.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setOpenDiagnose(true)}>
              <Camera size={13} /> Greina mynd
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {plants.map((p) => (
            <PlantRow key={p.id} plant={p} day={day} />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="sp-display text-cream-50" style={{ fontSize: 20, fontWeight: 500 }}>
            Skráningar
          </h2>
          <Button size="sm" variant="primary" onClick={() => setOpenLog(true)}>
            <Plus size={14} /> Skrá
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {(logs ?? []).slice(0, 30).map((l) => (
            <LogRow key={l.id} log={l} plants={plants} />
          ))}
          {(logs ?? []).length === 0 && (
            <div className="text-sm text-cream-300/60 border border-dashed border-moss-800/40 rounded-2xl p-5 text-center">
              Engar skráningar enn. Smelltu „Skrá" til að bæta við.
            </div>
          )}
        </div>
      </section>

      {!grow.archived && (
        <button
          onClick={archiveGrow}
          className="mt-8 flex items-center justify-center gap-1.5 text-cream-300/60 text-sm hover:text-cream-100 transition-colors w-full py-3 rounded-xl border border-dashed border-moss-800/40"
        >
          <Archive size={14} />
          Loka ræktun
        </button>
      )}

      {openLog && grow && (
        <LogDialog
          growId={grow.id}
          plants={plants}
          onClose={() => setOpenLog(false)}
        />
      )}

      {openDiagnose && grow && (
        <DiagnoseDialog
          grow={grow}
          plants={plants}
          onClose={() => setOpenDiagnose(false)}
        />
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card tone="strong" padding={12} radius={14}>
      <Eyebrow>{label}</Eyebrow>
      <div className="sp-display text-cream-50" style={{ fontSize: 22, fontWeight: 500 }}>
        {value}
      </div>
    </Card>
  );
}

function PlantRow({ plant, day }: { plant: Plant; day: number }) {
  const variety = varietyByName(plant.variety);
  const phase = PHASE_OPTIONS.find((p) => p.id === plant.currentPhase);

  async function setPhase(p: GrowPhase) {
    await db.plants.update(plant.id, { currentPhase: p, updatedAt: Date.now() });
    await db.logs.add({
      id: newId(),
      growId: plant.growId,
      plantId: plant.id,
      timestamp: Date.now(),
      type: 'phase_change',
      note: `Færðist í ${PHASE_OPTIONS.find((x) => x.id === p)?.label ?? p}`,
    });
  }

  const swatch = isPepper(variety)
    ? variety.color
    : isTomato(variety)
      ? variety.fruitColor
      : undefined;
  return (
    <div className="flex items-center gap-3 rounded-2xl p-3 border bg-moss-900/40 border-moss-800/40">
      <PlantGlyph variety={variety} name={plant.variety} size={44} tilt={-4} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-cream-50 font-medium text-sm">
            {plant.nickname || plant.variety}
          </span>
          {swatch && (
            <span
              className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(18,31,20,.55)',
                border: '1px solid rgba(64,104,67,.5)',
                color: 'var(--cream-100)',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: COLOR_HEX[swatch],
                }}
              />
              {COLOR_LABEL[swatch]}
            </span>
          )}
          {isPepper(variety) && variety.shu > 0 && (
            <span className="text-[9px] uppercase tracking-wider text-capsicum-400">
              {formatShu(variety.shu)} SHU
            </span>
          )}
          {isTomato(variety) && (
            <span className="text-[9px] uppercase tracking-wider text-terra-300">
              {variety.fruitWeightG}g · {variety.fruitShape.toLowerCase()}
            </span>
          )}
        </div>
        <div className="text-[10px] text-cream-400/60 mt-0.5">
          {plant.variety} · D{day}
        </div>
        <select
          value={plant.currentPhase}
          onChange={(e) => setPhase(e.target.value as GrowPhase)}
          className="mt-1 bg-moss-950/60 border border-moss-800 rounded-md px-2 py-0.5 text-[11px] text-cream-100 outline-none focus:border-moss-400"
        >
          {PHASE_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <span className="text-[10px] text-cream-300/60 uppercase tracking-wider">
        {phase?.label ?? plant.currentPhase}
      </span>
    </div>
  );
}

function LogRow({ log, plants }: { log: LogEntry; plants: Plant[] }) {
  const meta = LOG_TYPES.find((t) => t.id === log.type);
  const Icon = meta?.icon ?? StickyNote;
  const plant = plants.find((p) => p.id === log.plantId);
  const date = new Date(log.timestamp);
  return (
    <div className="flex items-start gap-3 rounded-xl p-2.5 border bg-moss-900/30 border-moss-800/30">
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(231,217,168,.08)', color: 'var(--cream-300)' }}
      >
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-cream-100 text-sm font-medium">
            {meta?.label ?? log.type}
          </span>
          {plant && (
            <span className="text-[10px] text-cream-400/70">
              {plant.nickname || plant.variety}
            </span>
          )}
          <span className="text-[10px] text-cream-400/60 ml-auto sp-mono">
            {date.toLocaleDateString('is-IS', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        {log.note && <div className="text-[12px] text-cream-300/75 mt-0.5">{log.note}</div>}
      </div>
    </div>
  );
}

function LogDialog({
  growId,
  plants,
  onClose,
}: {
  growId: string;
  plants: Plant[];
  onClose: () => void;
}) {
  const [type, setType] = useState<LogType>('water');
  const [note, setNote] = useState('');
  const [plantId, setPlantId] = useState<string>('all');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    await db.logs.add({
      id: newId(),
      growId,
      plantId: plantId === 'all' ? undefined : plantId,
      timestamp: Date.now(),
      type,
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
        <Eyebrow>Ný skráning</Eyebrow>
        <h3
          className="sp-display"
          style={{
            fontSize: 22,
            color: 'var(--cream-50)',
            fontWeight: 500,
            marginTop: 4,
            marginBottom: 14,
          }}
        >
          Skrá viðburð
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {LOG_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
                  type === t.id
                    ? 'bg-moss-500 border-moss-400 text-cream-50'
                    : 'bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600',
                )}
              >
                <Icon size={12} />
                {t.label}
              </button>
            );
          })}
        </div>

        <label className="text-xs text-cream-300/80 mb-1.5 block">Planta</label>
        <select
          value={plantId}
          onChange={(e) => setPlantId(e.target.value)}
          className="w-full mb-3 rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400"
        >
          <option value="all">Öll ræktunin</option>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.variety}
            </option>
          ))}
        </select>

        <label className="text-xs text-cream-300/80 mb-1.5 block">Athugasemd</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="t.d. 200ml vatn, EC 1.4, blöð heilbrigð"
          className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2 text-sm text-cream-100 outline-none focus:border-moss-400"
        />

        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Hætta við
          </Button>
          <Button size="sm" disabled={busy} onClick={submit}>
            Vista
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
