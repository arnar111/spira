import { lazy, Suspense, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Archive, Plus } from 'lucide-react';
import { Pill } from '@/components/ui/Pill';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PhaseBar } from '@/components/ui/PhaseBar';
import { SeasonCard } from '@/components/SeasonCard';
import { VeritableCard } from '@/components/VeritableCard';
import { GrowMetricsSection } from '@/components/charts/GrowMetricsSection';
import { GrowHarvestSection } from '@/components/charts/GrowHarvestSection';
import { EnvBand } from '@/components/charts/EnvBand';
import { PhotoGallery } from '@/components/gallery/PhotoGallery';
import { growIsOutdoor } from '@/lib/season';
import { Card } from '@/components/ui/Card';
import { HeroCard } from '@/components/ui/HeroCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlantGlyph } from '@/components/PlantGlyph';
import { GrowDetailSkeleton } from '@/components/PageSkeletons';
import { useDelayedFlag } from '@/lib/useDelayedFlag';
import { LogComposer } from '@/components/LogComposer';
import { AddPlantDialog } from '@/components/AddPlantDialog';
import { RosAvatar } from '@/components/ros/RosAvatar';

// Rós-glugginn dregur inn markdown-vélina (react-markdown) — hlöðum hann
// aðeins þegar notandi opnar Rós, svo aðalbúntið haldist létt.
const RosWindow = lazy(() =>
  import('@/components/ros/RosWindow').then((m) => ({ default: m.RosWindow })),
);
import { db, type LogEntry, type LogType, type Plant } from '@/lib/db';
import { deletePhoto } from '@/lib/photos';
import { announce } from '@/lib/announce';
import {
  daysSince,
  getPhaseForDay,
  growStageDay,
  timelineForCategory,
} from '@/lib/phases';
import { LOCATIONS } from '@/lib/locations';
import { LOG_TYPES, pickRepresentativePhase } from './growdetail/shared';
import { PlantRow } from './growdetail/PlantRow';
import { LogFilters } from './growdetail/LogFilters';
import { LogRow } from './growdetail/LogRow';
import { PlantCareGuide } from './growdetail/PlantCareGuide';
import { PerPlantGallery } from './growdetail/PerPlantGallery';

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
  const latestEnv = useLiveQuery(async () => {
    if (!id) return undefined;
    const rows = await db.environment.where('growId').equals(id).reverse().sortBy('timestamp');
    return rows[0];
  }, [id]);

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
  const [photosPlant, setPhotosPlant] = useState<Plant | null>(null);
  const [carePlant, setCarePlant] = useState<Plant | null>(null);

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

  const loading = !grow || !plants || !logs;
  const showSkeleton = useDelayedFlag(loading);
  if (loading) return showSkeleton ? <GrowDetailSkeleton /> : null;

  const day = daysSince(grow.startDate);
  const timeline = timelineForCategory(grow.category);
  const stageDay = growStageDay(grow.startDate, plants, timeline);
  const phase = getPhaseForDay(stageDay, timeline.phases);
  const loc = LOCATIONS.find((l) => l.key === grow.locationKey);
  const heroVariety = plants[0]?.variety ?? 'Habanero Helios';
  const totalHarvest = (harvests ?? []).reduce((s, h) => s + (h.weightG ?? 0), 0);
  // Fulltrúa-fasi fyrir umhverfis-markgildi: lengst kominn virkur fasi.
  const representativePhase = pickRepresentativePhase(plants);

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
      if (others === 0)
        await deletePhoto(log.photoId).catch((err) =>
          console.warn('[spira] gat ekki eytt mynd skráningar', err),
        );
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

      <HeroCard glyph={<PlantGlyph name={heroVariety} size={130} tilt={8} />}>
        <div className="flex gap-1.5 mb-2">
          {loc && <Pill tone="moss" size="sm">{loc.label}</Pill>}
          <Pill tone="cap" size="sm">D{day}</Pill>
          {grow.archived && <Pill tone="dark" size="sm">Lokað</Pill>}
        </div>
        <Eyebrow>{grow.location}</Eyebrow>
        <div className="sp-h2" style={{ marginTop: 4, marginBottom: 10 }}>
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
      </HeroCard>

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

      {!growIsOutdoor(grow) &&
        latestEnv &&
        (latestEnv.tempC !== undefined || latestEnv.humidityPct !== undefined) && (
          <Card tone="strong" radius={18} padding={16} className="mt-4">
            <EnvBand
              phase={representativePhase}
              tempC={latestEnv.tempC}
              humidityPct={latestEnv.humidityPct}
            />
          </Card>
        )}

      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="sp-h3">Plöntur</h2>
          <Button size="sm" variant="primary" onClick={() => setOpenAddPlant(true)}>
            <Plus size={14} /> Bæta við
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {plants.map((p) => (
            <PlantRow
              key={p.id}
              plant={p}
              day={day}
              onOpenPhotos={setPhotosPlant}
              onOpenCare={setCarePlant}
            />
          ))}
          {plants.length === 0 && (
            <div className="text-sm text-cream-300/60 border border-dashed border-moss-800/40 rounded-2xl p-5 text-center">
              Engar plöntur í þessari ræktun enn. Smelltu „Bæta við".
            </div>
          )}
        </div>
      </section>

      <GrowMetricsSection growId={grow.id} logs={logs} className="mt-6" />

      <GrowHarvestSection
        plants={plants}
        harvests={harvests ?? []}
        now={Date.now()}
        className="mt-6"
      />

      <PhotoGallery
        growId={grow.id}
        plants={plants}
        logs={logs}
        className="mt-6"
      />

      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="sp-h3">Skráningar</h2>
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

      <Modal
        open={photosPlant !== null}
        onClose={() => setPhotosPlant(null)}
        title={photosPlant ? `Myndir — ${photosPlant.nickname || photosPlant.variety}` : 'Myndir'}
        size="lg"
        fullHeight
      >
        {photosPlant && (
          <PerPlantGallery growId={grow.id} plant={photosPlant} plants={plants} logs={logs} />
        )}
      </Modal>

      <Modal
        open={carePlant !== null}
        onClose={() => setCarePlant(null)}
        title={carePlant ? `Umhirða — ${carePlant.nickname || carePlant.variety}` : 'Umhirða'}
        size="lg"
        fullHeight
      >
        {carePlant && <PlantCareGuide plant={carePlant} />}
      </Modal>

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
      <div className="sp-stat text-cream-50" style={{ fontSize: 22 }}>
        {value}
      </div>
    </Card>
  );
}
