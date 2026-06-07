import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Plus, Search, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Stat } from '@/components/ui/Stat';
import { Sparkline } from '@/components/ui/Sparkline';
import { PhaseBar } from '@/components/ui/PhaseBar';
import { Tabs } from '@/components/ui/Tabs';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PlantGlyph } from '@/components/PlantGlyph';
import { Button } from '@/components/ui/Button';
import { db, type Plant } from '@/lib/db';
import { shortDate } from '@/lib/dates';
import { categoryLabel, relativeTime } from './helpers';
import { EmptyGrowsCard } from './EmptyGrowsCard';
import type { DerivedGrow, ViewProps } from './useHomeData';

export function HomeDesktop({ active, plants, archivedCount }: ViewProps) {
  const navigate = useNavigate();
  // Nýjasta umhverfismæling aðalræktunarinnar (1.4) — kemur í stað gervikorts.
  const primaryGrow = active[0];
  const primaryGrowId = primaryGrow?.id;
  const latestEnv = useLiveQuery(async () => {
    if (!primaryGrowId) return undefined;
    const rows = await db.environment
      .where('growId')
      .equals(primaryGrowId)
      .reverse()
      .sortBy('timestamp');
    return rows[0];
  }, [primaryGrowId]);
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
              <Eyebrow>Umhverfi</Eyebrow>
              <span
                style={{
                  display: 'inline-flex',
                  gap: 6,
                  alignItems: 'center',
                  fontSize: 11,
                  color: 'var(--cream-400)',
                }}
              >
                {latestEnv
                  ? `${primaryGrow?.name ?? ''} · ${relativeTime(latestEnv.timestamp)}`
                  : 'engin mæling enn'}
              </span>
            </div>
            {latestEnv ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 14,
                }}
              >
                <Stat
                  label="HITI"
                  value={latestEnv.tempC != null ? String(latestEnv.tempC) : '—'}
                  unit="°C"
                  tone="cream"
                />
                <Stat
                  label="RAKI"
                  value={latestEnv.humidityPct != null ? String(latestEnv.humidityPct) : '—'}
                  unit="%"
                  tone="moss"
                />
                <Stat
                  label="LJÓS"
                  value={latestEnv.lightHours != null ? String(latestEnv.lightHours) : '—'}
                  unit="klst"
                  tone="terra"
                />
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--cream-300)', lineHeight: 1.5 }}>
                Skráðu umhverfismælingu (hita, raka, ljóstíma) á ræktun til að sjá
                nýjustu töluna hér.
              </p>
            )}
          </Card>

          <Card tone="glass" padding={16} radius={18} style={{ flex: 1 }}>
            <div style={{ marginBottom: 10 }}>
              <Eyebrow>Flýtileiðir</Eyebrow>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <NextStepRow
                eyebrow="Rós"
                title="Spyrðu Rós ráða"
                description="Fáðu áminningar og svör um ræktunina þína."
                onClick={() => navigate('/ros')}
              />
              <NextStepRow
                eyebrow="Uppskera"
                title="Skráðu tínslu"
                description="Haltu utan um þyngd og fjölda eftir plöntum."
                onClick={() => navigate('/harvest')}
              />
              <NextStepRow
                eyebrow="Afbrigði"
                title="Skoðaðu umhirðu"
                description="Ræktunarleiðbeiningar fyrir hvert afbrigði."
                onClick={() => navigate('/varieties')}
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
          {grow.location} · {plants.length} plöntur · hóf {shortDate(startDate.getTime())}
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
  onClick,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
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
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div className="sp-mono" style={{ fontSize: 9, color: 'var(--terra-300)', letterSpacing: '0.16em' }}>
          {eyebrow.toUpperCase()}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--cream-100)', marginTop: 1 }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'rgba(231,217,168,.55)', marginTop: 1 }}>
          {description}
        </div>
      </div>
      {onClick && <ChevronRight size={14} color="rgba(231,217,168,.4)" />}
    </>
  );
  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(18,31,20,.4)',
    border: '1px solid rgba(64,104,67,.25)',
    width: '100%',
  } as const;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={{ ...style, cursor: 'pointer' }}>
        {inner}
      </button>
    );
  }
  return <div style={style}>{inner}</div>;
}
