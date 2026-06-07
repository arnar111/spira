import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { Pill } from '@/components/ui/Pill';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PlantGlyph } from '@/components/PlantGlyph';
import { db, type Plant } from '@/lib/db';
import { daysSince, getPhaseForDay, timelineForCategory } from '@/lib/phases';
import {
  COLOR_HEX,
  COLOR_LABEL,
  MOTHER_SPECIES,
  formatShu,
  isPepper,
  isPotato,
  isStrawberry,
  isTomato,
  varietyByName,
  type MotherSpecies,
  type PepperColor,
  type Variety,
} from '@/lib/varieties';
import { cn } from '@/lib/cn';

export function Plants() {
  const navigate = useNavigate();
  const plants = useLiveQuery(() => db.plants.toArray());
  const grows = useLiveQuery(() => db.grows.toArray());

  const [typeFilter, setTypeFilter] = useState<'all' | 'pepper' | 'tomato'>('all');
  const [filterMother, setFilterMother] = useState<MotherSpecies | 'all'>('all');
  const [filterColor, setFilterColor] = useState<PepperColor | 'all'>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');

  const rows = useMemo(() => {
    if (!plants || !grows) return [];
    const growMap = new Map(grows.map((g) => [g.id, g]));
    return plants
      .filter((p) => !p.archived)
      .map((p) => {
        const grow = growMap.get(p.growId);
        const variety = varietyByName(p.variety);
        const day = grow ? daysSince(grow.startDate) : 0;
        return { plant: p, grow, variety, day };
      })
      .filter((r) => {
        const cat = r.variety?.category ?? r.plant.category;
        if (typeFilter !== 'all' && cat !== typeFilter) return false;
        if (filterMother !== 'all' && !(isPepper(r.variety) && r.variety.motherSpecies === filterMother))
          return false;
        if (filterColor !== 'all' && !(isPepper(r.variety) && r.variety.color === filterColor))
          return false;
        if (phaseFilter !== 'all' && r.plant.currentPhase !== phaseFilter) return false;
        return true;
      });
  }, [plants, grows, typeFilter, filterMother, filterColor, phaseFilter]);

  const hasTomatoes = useMemo(
    () => !!plants?.some((p) => (varietyByName(p.variety)?.category ?? p.category) === 'tomato'),
    [plants],
  );

  const availableMothers = useMemo(() => {
    const set = new Set<MotherSpecies>();
    plants?.forEach((p) => {
      const v = varietyByName(p.variety);
      if (isPepper(v)) set.add(v.motherSpecies);
    });
    return set;
  }, [plants]);

  const availableColors = useMemo(() => {
    const set = new Set<PepperColor>();
    plants?.forEach((p) => {
      const v = varietyByName(p.variety);
      if (isPepper(v)) set.add(v.color);
    });
    return set;
  }, [plants]);

  if (!plants || !grows) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-5 sm:px-7 py-6"
    >
      <header className="mb-5">
        <Eyebrow color="var(--terra-300)">Allar plöntur</Eyebrow>
        <h1 className="sp-h1" style={{ marginTop: 6 }}>
          Plöntur · {rows.length}
        </h1>
      </header>

      {hasTomatoes && (
        <FilterRow icon={<Filter size={11} />} label="Tegund">
          <Chip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
            Allar
          </Chip>
          <Chip active={typeFilter === 'pepper'} onClick={() => setTypeFilter('pepper')}>
            Pipar
          </Chip>
          <Chip active={typeFilter === 'tomato'} onClick={() => setTypeFilter('tomato')}>
            Tómatar
          </Chip>
        </FilterRow>
      )}
      <FilterRow icon={hasTomatoes ? undefined : <Filter size={11} />} label="Móðurtegund">
        <Chip active={filterMother === 'all'} onClick={() => setFilterMother('all')}>
          Allar
        </Chip>
        {MOTHER_SPECIES.filter((m) => availableMothers.has(m)).map((m) => (
          <Chip
            key={m}
            active={filterMother === m}
            onClick={() => setFilterMother(m)}
          >
            {m}
          </Chip>
        ))}
      </FilterRow>
      <FilterRow label="Litur">
        <Chip active={filterColor === 'all'} onClick={() => setFilterColor('all')}>
          Allir
        </Chip>
        {(Object.keys(COLOR_LABEL) as PepperColor[])
          .filter((c) => availableColors.has(c))
          .map((c) => (
            <Chip
              key={c}
              swatch={COLOR_HEX[c]}
              active={filterColor === c}
              onClick={() => setFilterColor(c)}
            >
              {COLOR_LABEL[c]}
            </Chip>
          ))}
      </FilterRow>
      <FilterRow label="Fasi">
        <Chip active={phaseFilter === 'all'} onClick={() => setPhaseFilter('all')}>
          Allir
        </Chip>
        {[
          { id: 'germinating', label: 'Spírun' },
          { id: 'seedling', label: 'Plöntu' },
          { id: 'vegetative', label: 'Veg' },
          { id: 'flowering', label: 'Blómgun' },
          { id: 'fruiting', label: 'Aldin' },
        ].map((p) => (
          <Chip key={p.id} active={phaseFilter === p.id} onClick={() => setPhaseFilter(p.id)}>
            {p.label}
          </Chip>
        ))}
      </FilterRow>

      <div className="flex flex-col gap-2 mt-4">
        {rows.length === 0 && (
          <div className="text-cream-300/60 text-sm border border-dashed border-moss-800/40 rounded-2xl p-6 text-center">
            Engar plöntur passa við síurnar.
          </div>
        )}
        {rows.map(({ plant, grow, variety, day }) => (
          <PlantCard
            key={plant.id}
            plant={plant}
            growName={grow?.name ?? ''}
            day={day}
            variety={variety}
            onClick={() => grow && navigate(`/grow/${grow.id}`)}
          />
        ))}
      </div>
    </motion.div>
  );
}

function PlantCard({
  plant,
  growName,
  day,
  variety,
  onClick,
}: {
  plant: Plant;
  growName: string;
  day: number;
  variety: Variety | undefined;
  onClick: () => void;
}) {
  const phase = getPhaseForDay(day, timelineForCategory(plant.category).phases);
  const swatch: PepperColor | undefined = isPepper(variety)
    ? variety.color
    : isTomato(variety) || isStrawberry(variety)
      ? variety.fruitColor
      : isPotato(variety)
        ? variety.skinColor
        : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left flex items-center gap-3 rounded-2xl p-3.5 transition-all border bg-moss-900/40 border-moss-800/40 hover:bg-moss-900/60 hover:border-moss-600"
    >
      <PlantGlyph variety={variety} name={plant.variety} size={48} tilt={-4} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="heading text-base font-semibold text-cream-50">
            {plant.nickname || plant.variety}
          </span>
          {plant.nickname && (
            <span className="text-[11px] text-cream-300/60">{plant.variety}</span>
          )}
        </div>
        <div className="text-[11px] text-cream-300/60 mt-0.5">
          {growName} · D{day} · {phase.label.toLowerCase()}
        </div>
        {variety && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {swatch && (
              <span
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(18,31,20,.55)',
                  border: '1px solid rgba(64,104,67,.5)',
                  color: 'var(--cream-100)',
                }}
              >
                <span
                  style={{ width: 8, height: 8, borderRadius: 999, background: COLOR_HEX[swatch] }}
                />
                {COLOR_LABEL[swatch]}
              </span>
            )}
            {isPepper(variety) ? (
              <>
                <Pill tone="cream" size="sm">{variety.motherSpecies}</Pill>
                {variety.shu > 0 && (
                  <Pill tone="cap" size="sm">{formatShu(variety.shu)} SHU</Pill>
                )}
              </>
            ) : isTomato(variety) ? (
              <>
                <Pill tone="terra" size="sm">Tómatur</Pill>
                <Pill tone="moss" size="sm">
                  {variety.fruitShape} {variety.fruitWeightG}g
                </Pill>
              </>
            ) : isStrawberry(variety) ? (
              <>
                <Pill tone="cap" size="sm">Jarðarber</Pill>
                <Pill tone="moss" size="sm">{variety.fruitWeightG}g ber</Pill>
              </>
            ) : isPotato(variety) ? (
              <>
                <Pill tone="moss" size="sm">Kartafla</Pill>
                <Pill tone="cream" size="sm">{variety.use}</Pill>
              </>
            ) : null}
          </div>
        )}
      </div>
    </button>
  );
}

function FilterRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-cream-400/70 mb-1.5">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
        active
          ? 'bg-moss-500 border-moss-400 text-cream-50'
          : 'bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600',
      )}
    >
      {swatch && (
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: swatch,
            border: '1px solid rgba(255,255,255,.18)',
          }}
        />
      )}
      {children}
    </button>
  );
}
