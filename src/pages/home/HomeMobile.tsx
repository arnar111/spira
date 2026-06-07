import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Pill } from '@/components/ui/Pill';
import { StatCard } from '@/components/ui/StatCard';
import { PhaseBar } from '@/components/ui/PhaseBar';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PlantGlyph } from '@/components/PlantGlyph';
import type { Plant } from '@/lib/db';
import { categoryLabel } from './helpers';
import { EmptyGrowsCard } from './EmptyGrowsCard';
import type { DerivedGrow, ViewProps } from './useHomeData';

export function HomeMobile({ active, plants, archivedCount }: ViewProps) {
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
