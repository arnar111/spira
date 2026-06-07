import { lazy, Suspense, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Archive,
  Droplet,
  Flame,
  Leaf,
  Pencil,
  Plus,
  Scissors,
  Sparkles,
  StickyNote,
  Thermometer,
  Trash2,
} from 'lucide-react';
import { Pill } from '@/components/ui/Pill';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PhaseBar } from '@/components/ui/PhaseBar';
import { SeasonCard } from '@/components/SeasonCard';
import { VeritableCard } from '@/components/VeritableCard';
import { growIsOutdoor } from '@/lib/season';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlantGlyph } from '@/components/PlantGlyph';
import {
  LogComposer,
  LogDataChips,
  LogThumbnail,
} from '@/components/LogComposer';
import { AddPlantDialog } from '@/components/AddPlantDialog';
import { RosAvatar } from '@/components/ros/RosAvatar';

// Rós-glugginn dregur inn markdown-vélina (react-markdown) — hlöðum hann
// aðeins þegar notandi opnar Rós, svo aðalbúntið haldist létt.
const RosWindow = lazy(() =>
  import('@/components/ros/RosWindow').then((m) => ({ default: m.RosWindow })),
);
import {
  db,
  newId,
  type GrowPhase,
  type LogEntry,
  type LogType,
  type Plant,
} from '@/lib/db';
import { deletePhoto, usePhotoUrl } from '@/lib/photos';
import { announce } from '@/lib/announce';
import {
  daysSince,
  getPhaseForDay,
  growStageDay,
  timelineForCategory,
} from '@/lib/phases';
import {
  COLOR_HEX,
  COLOR_LABEL,
  formatShu,
  isPepper,
  isPotato,
  isStrawberry,
  isTomato,
  varietyByName,
} from '@/lib/varieties';
import { LOCATIONS } from '@/lib/locations';

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

/** Merki (tákn + heiti) fyrir logtegund; fellur aftur á tegundarstrenginn. */
function logTypeMeta(type: LogType): { label: string; icon: typeof Droplet } {
  return LOG_TYPES.find((t) => t.id === type) ?? { label: type, icon: StickyNote };
}

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
  const [rosOpen, setRosOpen] = useState(false);
  const [rosEverOpened, setRosEverOpened] = useState(false);
  const [openAddPlant, setOpenAddPlant] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  // Breyta/eyða skráningu (1.4).
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [deletingLog, setDeletingLog] = useState<LogEntry | null>(null);
  // Síun á skráningum (1.3) — allt reiknað í minni úr þegar hlöðnum logs.
  const [logTypeFilter, setLogTypeFilter] = useState<LogType | 'all'>('all');
  const [logPlantFilter, setLogPlantFilter] = useState<string>('all');
  const [logRange, setLogRange] = useState<7 | 30 | 0>(0);

  // Tegundir sem koma fyrir í þessari ræktun, í birtingarröð LOG_TYPES.
  const presentTypes = useMemo(() => {
    const set = new Set((logs ?? []).map((l) => l.type));
    const ordered = LOG_TYPES.filter((t) => set.has(t.id)).map((t) => t.id);
    // Tegundir sem LOG_TYPES þekkir ekki (t.d. phase_change) fara aftast.
    const extra = [...set].filter((t) => !ordered.includes(t as LogType));
    return [...ordered, ...extra] as LogType[];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const cutoff = logRange ? Date.now() - logRange * 24 * 60 * 60 * 1000 : 0;
    return (logs ?? []).filter((l) => {
      if (logTypeFilter !== 'all' && l.type !== logTypeFilter) return false;
      if (logPlantFilter !== 'all' && l.plantId !== logPlantFilter) return false;
      if (cutoff && l.timestamp < cutoff) return false;
      return true;
    });
  }, [logs, logTypeFilter, logPlantFilter, logRange]);

  if (!grow || !plants || !logs) return null;

  const day = daysSince(grow.startDate);
  const timeline = timelineForCategory(grow.category);
  const stageDay = growStageDay(grow.startDate, plants, timeline);
  const phase = getPhaseForDay(stageDay, timeline.phases);
  const loc = LOCATIONS.find((l) => l.key === grow.locationKey);
  const heroVariety = plants[0]?.variety ?? 'Habanero Helios';
  const totalHarvest = (harvests ?? []).reduce((s, h) => s + (h.weightG ?? 0), 0);

  async function archiveGrow() {
    if (!grow) return;
    await db.grows.update(grow.id, { archived: true, endDate: Date.now(), updatedAt: Date.now() });
    announce('Ræktun lokað');
    navigate('/grows');
  }

  async function deleteLog(log: LogEntry) {
    // Eyddu tengdri mynd ef engin önnur skráning vísar í hana. photoId er ekki
    // index-aður, svo við skönnum logs töfluna (filter) frekar en .where.
    if (log.photoId) {
      const others = await db.logs
        .filter((l) => l.id !== log.id && l.photoId === log.photoId)
        .count();
      if (others === 0) await deletePhoto(log.photoId).catch(() => undefined);
    }
    await db.logs.delete(log.id);
    announce('Skráningu eytt');
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
        <PhaseBar phases={timeline.phases} currentDay={stageDay} totalDays={timeline.totalDays} />
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
        <button
          type="button"
          onClick={() => {
            setRosEverOpened(true);
            setRosOpen(true);
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-cream-50 transition-colors"
          style={{
            background: 'rgba(194,106,77,.22)',
            border: '1px solid rgba(194,106,77,.5)',
          }}
        >
          <RosAvatar size={18} />
          Spyrja Rós
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <Stat label="Dagur" value={String(day)} />
        <Stat label="Plöntur" value={String(plants.length)} />
        <Stat label="Uppskera" value={`${totalHarvest.toFixed(0)}g`} />
      </div>

      {growIsOutdoor(grow) && (
        <div className="mt-4">
          <SeasonCard />
        </div>
      )}

      {grow.locationKey === 'veritable' && (
        <div className="mt-4">
          <VeritableCard growId={grow.id} startDate={grow.startDate} plants={plants} />
        </div>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="sp-display text-cream-50" style={{ fontSize: 20, fontWeight: 500 }}>
            Plöntur
          </h2>
          <Button size="sm" variant="primary" onClick={() => setOpenAddPlant(true)}>
            <Plus size={14} /> Bæta við
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {plants.map((p) => (
            <PlantRow key={p.id} plant={p} day={day} />
          ))}
          {plants.length === 0 && (
            <div className="text-sm text-cream-300/60 border border-dashed border-moss-800/40 rounded-2xl p-5 text-center">
              Engar plöntur í þessari ræktun enn. Smelltu „Bæta við".
            </div>
          )}
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

        {logs.length > 0 && (
          <LogFilters
            presentTypes={presentTypes}
            plants={plants}
            typeFilter={logTypeFilter}
            onType={setLogTypeFilter}
            plantFilter={logPlantFilter}
            onPlant={setLogPlantFilter}
            range={logRange}
            onRange={setLogRange}
          />
        )}

        <div className="flex flex-col gap-2">
          {filteredLogs.slice(0, 50).map((l) => (
            <LogRow
              key={l.id}
              log={l}
              plants={plants}
              onEdit={setEditingLog}
              onDelete={setDeletingLog}
            />
          ))}
          {logs.length === 0 ? (
            <div className="text-sm text-cream-300/60 border border-dashed border-moss-800/40 rounded-2xl p-5 text-center">
              Engar skráningar enn. Smelltu „Skrá" til að bæta við.
            </div>
          ) : (
            filteredLogs.length === 0 && (
              <div className="text-sm text-cream-300/60 border border-dashed border-moss-800/40 rounded-2xl p-5 text-center">
                Engar skráningar passa við síurnar.
              </div>
            )
          )}
        </div>
      </section>

      {!grow.archived && (
        <button
          onClick={() => setConfirmArchive(true)}
          className="mt-8 flex items-center justify-center gap-1.5 text-cream-300/60 text-sm hover:text-cream-100 transition-colors w-full py-3 rounded-xl border border-dashed border-moss-800/40"
        >
          <Archive size={14} />
          Loka ræktun
        </button>
      )}

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={archiveGrow}
        title="Loka ræktun"
        body={`Viltu loka ræktuninni „${grow.name}"? Hún færist í safnið og þú getur opnað hana aftur þaðan.`}
        confirmLabel="Loka ræktun"
        destructive
      />

      <LogComposer
        growId={grow.id}
        plants={plants}
        open={openLog}
        onClose={() => setOpenLog(false)}
      />

      {editingLog && (
        <LogComposer
          growId={grow.id}
          plants={plants}
          open={editingLog !== null}
          existing={editingLog}
          onClose={() => setEditingLog(null)}
        />
      )}

      <ConfirmDialog
        open={deletingLog !== null}
        onClose={() => setDeletingLog(null)}
        onConfirm={() => {
          if (deletingLog) void deleteLog(deletingLog);
        }}
        title="Eyða skráningu"
        body="Viltu eyða þessari skráningu? Þetta er ekki hægt að afturkalla."
        confirmLabel="Eyða skráningu"
        destructive
      />

      <AddPlantDialog
        grow={grow}
        open={openAddPlant}
        onClose={() => setOpenAddPlant(false)}
      />

      {rosEverOpened && (
        <Suspense fallback={null}>
          <RosWindow grow={grow} open={rosOpen} onClose={() => setRosOpen(false)} />
        </Suspense>
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
    : isTomato(variety) || isStrawberry(variety)
      ? variety.fruitColor
      : isPotato(variety)
        ? variety.skinColor
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
          {isStrawberry(variety) && (
            <span className="text-[9px] uppercase tracking-wider text-capsicum-400">
              {variety.fruitWeightG}g ber
            </span>
          )}
          {isPotato(variety) && (
            <span className="text-[9px] uppercase tracking-wider text-moss-300">
              {variety.use}
            </span>
          )}
        </div>
        <div className="text-[10px] text-cream-400/60 mt-0.5">
          {plant.variety} · D{day}
        </div>
        <select
          value={plant.currentPhase}
          onChange={(e) => setPhase(e.target.value as GrowPhase)}
          aria-label={`Fasi fyrir ${plant.nickname || plant.variety}`}
          className="mt-1 min-h-[40px] bg-moss-950/60 border border-moss-800 rounded-lg px-2.5 py-2 text-sm text-cream-100 outline-none focus:border-moss-400"
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

function LogFilters({
  presentTypes,
  plants,
  typeFilter,
  onType,
  plantFilter,
  onPlant,
  range,
  onRange,
}: {
  presentTypes: LogType[];
  plants: Plant[];
  typeFilter: LogType | 'all';
  onType: (t: LogType | 'all') => void;
  plantFilter: string;
  onPlant: (p: string) => void;
  range: 7 | 30 | 0;
  onRange: (r: 7 | 30 | 0) => void;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <LogChip active={typeFilter === 'all'} onClick={() => onType('all')}>
          Allt
        </LogChip>
        {presentTypes.map((t) => {
          const { label, icon: Icon } = logTypeMeta(t);
          return (
            <LogChip key={t} active={typeFilter === t} onClick={() => onType(t)}>
              <Icon size={11} />
              {label}
            </LogChip>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {plants.length > 0 && (
          <select
            value={plantFilter}
            onChange={(e) => onPlant(e.target.value)}
            aria-label="Sía skráningar eftir plöntu"
            className="rounded-lg bg-moss-950/60 border border-moss-800 px-2.5 py-1.5 text-xs text-cream-100 outline-none focus:border-moss-400"
          >
            <option value="all">Allar plöntur</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname || p.variety}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-1.5">
          {([
            { v: 7, label: '7 dagar' },
            { v: 30, label: '30 dagar' },
            { v: 0, label: 'Allt' },
          ] as const).map((r) => (
            <LogChip key={r.v} active={range === r.v} onClick={() => onRange(r.v)}>
              {r.label}
            </LogChip>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
        active
          ? 'bg-moss-500 border-moss-400 text-cream-50'
          : 'bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600'
      }`}
    >
      {children}
    </button>
  );
}

function LogRow({
  log,
  plants,
  onEdit,
  onDelete,
}: {
  log: LogEntry;
  plants: Plant[];
  onEdit: (log: LogEntry) => void;
  onDelete: (log: LogEntry) => void;
}) {
  const meta = LOG_TYPES.find((t) => t.id === log.type);
  const Icon = meta?.icon ?? StickyNote;
  const plant = plants.find((p) => p.id === log.plantId);
  const date = new Date(log.timestamp);
  const [viewerOpen, setViewerOpen] = useState(false);
  // Sjálfvirkar fasaskráningar eru ekki ritstýranlegar (búnar til af kerfinu).
  const editable = log.type !== 'phase_change';
  return (
    <div className="group flex items-start gap-3 rounded-xl p-2.5 border bg-moss-900/30 border-moss-800/30">
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
          <div className="flex items-center gap-0.5">
            {editable && (
              <button
                type="button"
                onClick={() => onEdit(log)}
                aria-label="Breyta skráningu"
                className="text-cream-400/50 hover:text-cream-100 transition-colors p-1 rounded-md"
              >
                <Pencil size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(log)}
              aria-label="Eyða skráningu"
              className="text-cream-400/50 hover:text-terra-300 transition-colors p-1 rounded-md"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        <LogDataChips
          type={log.type}
          data={log.data as Record<string, unknown> | undefined}
        />
        {log.note && <div className="text-[12px] text-cream-300/75 mt-0.5">{log.note}</div>}
        {log.photoId && (
          <>
            <LogThumbnail photoId={log.photoId} onOpen={() => setViewerOpen(true)} />
            <PhotoViewer
              photoId={log.photoId}
              open={viewerOpen}
              onClose={() => setViewerOpen(false)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function PhotoViewer({
  photoId,
  open,
  onClose,
}: {
  photoId: string;
  open: boolean;
  onClose: () => void;
}) {
  const url = usePhotoUrl(open ? photoId : undefined);
  return (
    <Modal open={open} onClose={onClose}>
      <div className="rounded-xl overflow-hidden bg-moss-950/60 border border-moss-800/50">
        {url ? (
          <img src={url} alt="Skráð mynd" className="w-full h-auto object-contain" />
        ) : (
          <div className="aspect-square w-full" />
        )}
      </div>
    </Modal>
  );
}

