import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Plus, Search, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Stat } from '@/components/ui/Stat';
import { StatCard } from '@/components/ui/StatCard';
import { Sparkline } from '@/components/ui/Sparkline';
import { PhaseBar } from '@/components/ui/PhaseBar';
import { Tabs } from '@/components/ui/Tabs';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PlantGlyph } from '@/components/PlantGlyph';
import { Button } from '@/components/ui/Button';
import { db, type Grow, type Plant } from '@/lib/db';
import { useDelayedFlag } from '@/lib/useDelayedFlag';
import { HomeSkeleton } from '@/components/PageSkeletons';
import {
  cycleProgress,
  daysSince,
  getPhaseForDay,
  growStageDay,
  timelineForCategory,
  type CropTimeline,
} from '@/lib/phases';

interface DerivedGrow extends Grow {
  day: number;
  stageDay: number;
  progress: number;
  phaseObj: CropTimeline['phases'][number];
  timeline: CropTimeline;
}

function deriveGrow(g: Grow, plants: Plant[]): DerivedGrow {
  const day = daysSince(g.startDate);
  const gp = plants.filter((p) => p.growId === g.id);
  const timeline = timelineForCategory(g.category);
  const stageDay = growStageDay(g.startDate, gp, timeline);
  return {
    ...g,
    day,
    stageDay,
    progress: cycleProgress(stageDay, timeline.totalDays),
    phaseObj: getPhaseForDay(stageDay, timeline.phases),
    timeline,
  };
}

export function Home() {
  const grows = useLiveQuery(() => db.grows.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());

  const loading = grows === undefined || plants === undefined;
  const showSkeleton = useDelayedFlag(loading);
  if (loading) return showSkeleton ? <HomeSkeleton /> : null;

  const active = grows.filter((g) => !g.archived).map((g) => deriveGrow(g, plants));
  const archivedCount = grows.filter((g) => g.archived).length;

  return (
    <>
      <MobileHome active={active} plants={plants} archivedCount={archivedCount} />
      <DesktopHome active={active} plants={plants} archivedCount={archivedCount} />
    </>
  );
}

interface ViewProps {
  active: DerivedGrow[];
  plants: Plant[];
  archivedCount: number;
}

function MobileHome({ active, plants, archivedCount }: ViewProps) {
  const navigate = useNavigate();
  const today = new Date();
  // Ekkert useMemo — `today` er nýtt í hverri umferð svo memo héldi aldrei,
  // og útreikningurinn er hvort eð er ódýr.
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
  );

  const monthName = today
    .toLocaleDateString('is-IS', { month: 'short' })
    .replace('.', '');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="md:hidden"
      style={{ color: 'var(--cream-100)' }}
    >
      <div style={{ padding: '20px 22px 14px' }}>
        <div className="flex items-start justify-between">
          <div>
            <Eyebrow color="var(--terra-300)" style={{ marginBottom: 8 }}>
              · {monthName} · D{dayOfYear}
            </Eyebrow>
            <div
              className="sp-display"
              style={{
                fontSize: 38,
                fontWeight: 400,
                lineHeight: 1,
                color: 'var(--cream-50)',
              }}
            >
              Góðan dag,
              <br />
              <span className="sp-italic" style={{ color: 'var(--terra-300)' }}>
                Arnar
              </span>
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: 'linear-gradient(135deg, var(--terra-500), var(--cap-500))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cream-50)',
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
            }}
          >
            A
          </div>
        </div>

        {active.length > 0 && (
          <Link
            to={`/grow/${active[0].id}`}
            style={{
              marginTop: 14,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(226,62,29,.12)',
              border: '1px solid rgba(226,62,29,.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
            }}
          >
            <div
              className="sp-pulse"
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'var(--cap-400)',
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--cream-100)' }}>
              {active[0].name}{' '}
              <span style={{ color: 'var(--cream-300)' }}>
                · dagur {active[0].day} · {active[0].phaseObj.label.toLowerCase()}
              </span>
            </span>
            <ChevronRight size={16} color="var(--cream-300)" style={{ marginLeft: 'auto' }} />
          </Link>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '0 22px 16px',
        }}
      >
        <StatCard label="Plöntur" value={String(plants.length)} tone="cream" />
        <StatCard label="Ræktanir" value={String(active.length)} tone="moss" />
        <StatCard
          label="Dagur"
          value={active.length > 0 ? String(Math.max(...active.map((g) => g.day))) : '—'}
          tone="cap"
        />
      </div>

      <div
        style={{
          padding: '0 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <div className="sp-h3">Ræktanir</div>
        <span
          className="sp-mono"
          style={{ fontSize: 10, color: 'var(--cream-400)', letterSpacing: '0.16em' }}
        >
          {active.length} VIRK{active.length === 1 ? '' : 'AR'}
          {archivedCount > 0 ? ` · ${archivedCount} LOKIÐ` : ''}
        </span>
      </div>

      <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {active.length === 0 && <EmptyGrowsCard onCreate={() => navigate('/setup')} />}
        {active.map((g) => {
          const growPlants = plants.filter((p) => p.growId === g.id);
          return <GrowGlassCard key={g.id} grow={g} plants={growPlants} />;
        })}
      </div>

      <div style={{ height: 24 }} />
    </motion.div>
  );
}

function GrowGlassCard({ grow, plants }: { grow: DerivedGrow; plants: Plant[] }) {
  const heroVariety =
    plants[0]?.variety ?? (grow.category === 'pepper' ? 'Habanero Helios' : '');
  const dim =
    grow.spaceWidthCm && grow.spaceDepthCm
      ? `${grow.spaceWidthCm}×${grow.spaceDepthCm}${grow.spaceHeightCm ? `×${grow.spaceHeightCm}` : ''} cm`
      : null;

  return (
    <Link
      to={`/grow/${grow.id}`}
      style={{
        position: 'relative',
        borderRadius: 22,
        overflow: 'hidden',
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.45)',
        backdropFilter: 'blur(20px) saturate(160%)',
        boxShadow:
          '0 1px 0 rgba(253,251,246,.04) inset, 0 8px 24px rgba(0,0,0,.18)',
        padding: 16,
        paddingRight: 104,
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
      }}
    >
      <div
        className="sp-chili-shadow"
        style={{ position: 'absolute', right: -8, top: -4 }}
      >
        <PlantGlyph name={heroVariety} size={110} tilt={8} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <Pill tone="cap" size="sm">
          {categoryLabel(grow.category)}
        </Pill>
        <Pill tone="moss" size="sm">
          D{grow.day}
        </Pill>
      </div>
      <div className="sp-h3" style={{ marginBottom: 4 }}>
        {grow.name}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(231,217,168,.55)', marginBottom: 12 }}>
        {grow.location} · {plants.length} plöntur{dim ? ` · ${dim}` : ''}
      </div>

      <PhaseBar phases={grow.timeline.phases} currentDay={grow.stageDay} totalDays={grow.timeline.totalDays} showLabels={false} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 10,
        }}
      >
        <span
          className="sp-mono"
          style={{
            fontSize: 10,
            color: 'rgba(231,217,168,.55)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {grow.phaseObj.label}
        </span>
        <span style={{ fontSize: 11, color: grow.phaseObj.color, fontWeight: 600 }}>
          {Math.round(grow.progress * 100)}%
        </span>
      </div>
    </Link>
  );
}

function EmptyGrowsCard({ onCreate }: { onCreate: () => void }) {
  return (
    <Card tone="outline" radius={18} padding={20}>
      <div style={{ textAlign: 'center' }}>
        <div
          className="sp-display"
          style={{ fontSize: 18, color: 'var(--cream-100)', marginBottom: 6 }}
        >
          Engar virkar ræktanir
        </div>
        <div style={{ fontSize: 12, color: 'rgba(231,217,168,.6)', marginBottom: 14 }}>
          Settu upp fyrstu ræktun til að byrja.
        </div>
        <Button size="sm" variant="primary" onClick={onCreate}>
          <Plus size={14} /> Ný ræktun
        </Button>
      </div>
    </Card>
  );
}

function DesktopHome({ active, plants, archivedCount }: ViewProps) {
  const navigate = useNavigate();
  const today = new Date();
  const weekday = today.toLocaleDateString('is-IS', { weekday: 'long' });
  const dateLabel = today.toLocaleDateString('is-IS', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const plantCount = plants.length;
  const inFruit = active
    .map((g) => g.phaseObj.name)
    .filter((p) => p === 'fruit' || p === 'harvest').length;
  const inVeg = active
    .map((g) => g.phaseObj.name)
    .filter((p) => p === 'veg').length;

  const plantsLabel = plantCount === 1 ? 'ein planta' : `${plantCount} plöntur`;
  const growsLabel =
    active.length === 0
      ? 'Engar ræktanir'
      : active.length === 1
        ? 'Ein ræktun'
        : active.length === 2
          ? 'Tvær ræktanir'
          : active.length === 3
            ? 'Þrjár ræktanir'
            : `${active.length} ræktanir`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="hidden md:flex flex-col"
      style={{
        padding: '22px 28px',
        gap: 18,
        color: 'var(--cream-100)',
        minHeight: '100vh',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Eyebrow color="var(--terra-300)">
            {weekday} · {dateLabel}
          </Eyebrow>
          <div
            className="sp-display"
            style={{
              fontSize: 34,
              fontWeight: 400,
              color: 'var(--cream-50)',
              lineHeight: 1,
              marginTop: 6,
              letterSpacing: '-0.015em',
            }}
          >
            {growsLabel},{' '}
            <span className="sp-italic" style={{ color: 'var(--terra-300)' }}>
              {plantsLabel}.
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/varieties')}>
            <Search size={14} />
            Leita
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/setup')}>
            <Plus size={14} />
            Ný ræktun
          </Button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KPICard label="Plöntur alls" value={String(plantCount)} sub={`${active.length} virkar ræktanir`} tone="cream" />
        <KPICard label="Í aldin" value={String(inFruit)} sub="aldin- og uppskerufasi" tone="cap" />
        <KPICard label="Í veg" value={String(inVeg)} sub="vegetative vöxtur" tone="moss" />
        <KPICard label="Safn" value={String(archivedCount)} sub="lokaðar ræktanir" tone="terra" />
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: 18,
          flex: 1,
          minHeight: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <div className="sp-h3">Virkar ræktanir</div>
            <Tabs tabs={['Allar', 'Pipur', 'Krydd']} active={0} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.length === 0 ? (
              <EmptyGrowsCard onCreate={() => navigate('/setup')} />
            ) : (
              active.map((g) => {
                const growPlants = plants.filter((p) => p.growId === g.id);
                return <DesktopGrowRow key={g.id} grow={g} plants={growPlants} />;
              })
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          <Card tone="strong" padding={18} radius={18}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 14,
              }}
            >
              <Eyebrow>Umhverfi · BIÐ</Eyebrow>
              <span
                style={{
                  display: 'inline-flex',
                  gap: 6,
                  alignItems: 'center',
                  fontSize: 11,
                  color: 'var(--cream-400)',
                }}
              >
                tengja skynjara (Fasi 3)
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14,
                opacity: 0.55,
              }}
            >
              <Stat label="HITI" value="—" unit="°C" tone="cream" />
              <Stat label="RAKI" value="—" unit="%" tone="moss" />
              <Stat label="VPD" value="—" unit="kPa" tone="terra" />
            </div>
            <div style={{ marginTop: 14, opacity: 0.3 }}>
              <Sparkline points={[1, 1, 1, 1, 1]} width={300} height={36} color="var(--terra-400)" />
            </div>
          </Card>

          <Card tone="glass" padding={16} radius={18} style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <Eyebrow>Næstu skref</Eyebrow>
              <span
                className="sp-mono"
                style={{
                  fontSize: 10,
                  color: 'var(--cream-400)',
                  letterSpacing: '0.12em',
                }}
              >
                FASAR 2–4 BRÁTT
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <NextStepRow
                eyebrow="Fasi 2"
                title="Daglegt log + mynda-tímalína"
                description="Skrá vökvun, næringu, photo per plant."
              />
              <NextStepRow
                eyebrow="Fasi 3"
                title="Umhverfi + greiningar"
                description="Hiti/raki/VPD log, áminningar."
              />
              <NextStepRow
                eyebrow="Fasi 4"
                title="Uppskera + sósu-ledger"
                description="Þyngd per pod, ár-til-árs."
              />
            </div>
          </Card>
        </div>
      </section>
    </motion.div>
  );
}

function KPICard({
  label,
  value,
  unit,
  sub,
  spark,
  tone = 'cream',
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  spark?: number[];
  tone?: 'cream' | 'moss' | 'cap' | 'terra';
}) {
  const map: Record<string, string> = {
    cream: 'var(--cream-50)',
    moss: 'var(--moss-200)',
    cap: 'var(--cap-400)',
    terra: 'var(--terra-300)',
  };
  return (
    <Card
      tone="strong"
      radius={14}
      padding={14}
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <Eyebrow>{label}</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="sp-stat" style={{ fontSize: 30, color: map[tone], lineHeight: 1.05 }}>
          {value}
        </span>
        {unit && (
          <span
            className="sp-mono"
            style={{ fontSize: 11, color: 'var(--cream-400)' }}
          >
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 10.5, color: 'rgba(231,217,168,.55)' }}>{sub}</div>
      )}
      {spark && (
        <div style={{ marginTop: 2 }}>
          <Sparkline points={spark} width={200} height={24} color={map[tone]} />
        </div>
      )}
    </Card>
  );
}

function DesktopGrowRow({ grow, plants }: { grow: DerivedGrow; plants: Plant[] }) {
  const heroVariety =
    plants[0]?.variety ?? (grow.category === 'pepper' ? 'Habanero Helios' : '');
  const startDate = new Date(grow.startDate);
  return (
    <Link
      to={`/grow/${grow.id}`}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'rgba(36,56,39,.5)',
        border: '1px solid rgba(64,104,67,.4)',
        backdropFilter: 'blur(20px) saturate(160%)',
        boxShadow: '0 1px 0 rgba(253,251,246,.04) inset, 0 6px 18px rgba(0,0,0,.18)',
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        minHeight: 0,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        className="sp-chili-shadow"
        style={{ flexShrink: 0, marginLeft: -4 }}
      >
        <PlantGlyph name={heroVariety} size={68} tilt={-6} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <Pill tone="cap" size="sm">
            {categoryLabel(grow.category)}
          </Pill>
          <Pill tone="moss" size="sm">
            {grow.phaseObj.label}
          </Pill>
        </div>
        <div
          className="sp-display"
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: 'var(--cream-50)',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
          }}
        >
          {grow.name}
        </div>
        <div style={{ fontSize: 10.5, color: 'rgba(231,217,168,.55)', marginTop: 2 }}>
          {grow.location} · {plants.length} plöntur · hóf{' '}
          {startDate.toLocaleDateString('is-IS', { day: 'numeric', month: 'short' })}
        </div>
      </div>
      <div
        style={{
          flex: 1.2,
          minWidth: 0,
          paddingLeft: 12,
          borderLeft: '1px solid rgba(64,104,67,.3)',
        }}
      >
        <PhaseBar
          phases={grow.timeline.phases}
          currentDay={grow.stageDay}
          totalDays={grow.timeline.totalDays}
        />
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 64 }}>
        <div
          className="sp-mono"
          style={{
            fontSize: 9,
            color: 'rgba(231,217,168,.55)',
            letterSpacing: '0.16em',
          }}
        >
          DAGUR
        </div>
        <div className="sp-stat" style={{ fontSize: 26, color: grow.phaseObj.color }}>
          {grow.day}
        </div>
      </div>
      <ChevronRight size={16} color="var(--cream-300)" />
    </Link>
  );
}

function NextStepRow({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'rgba(18,31,20,.4)',
        border: '1px solid rgba(64,104,67,.25)',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'rgba(231,217,168,.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--cream-300)',
        }}
      >
        <Sparkles size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sp-mono" style={{ fontSize: 9, color: 'var(--terra-300)', letterSpacing: '0.16em' }}>
          {eyebrow.toUpperCase()}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--cream-100)', marginTop: 1 }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'rgba(231,217,168,.55)', marginTop: 1 }}>
          {description}
        </div>
      </div>
    </div>
  );
}

function categoryLabel(c: Grow['category']): string {
  switch (c) {
    case 'pepper':
      return 'Pipur';
    case 'tomato':
      return 'Tómatar';
    case 'herb':
      return 'Krydd';
    case 'leafy':
      return 'Salat';
    case 'fruit':
      return 'Ávextir';
    case 'houseplant':
      return 'Pottaplanta';
    default:
      return 'Annað';
  }
}
