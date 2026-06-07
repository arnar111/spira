import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { Pill } from '@/components/ui/Pill';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PhaseBar } from '@/components/ui/PhaseBar';
import { PlantGlyph } from '@/components/PlantGlyph';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import {
  daysSince,
  getPhaseForDay,
  growStageDay,
  timelineForCategory,
} from '@/lib/phases';
import { LOCATIONS } from '@/lib/locations';

export function Grows() {
  const navigate = useNavigate();
  const grows = useLiveQuery(() => db.grows.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());

  const sorted = useMemo(
    () =>
      (grows ?? [])
        .slice()
        .sort((a, b) => Number(a.archived) - Number(b.archived) || b.startDate - a.startDate),
    [grows],
  );

  if (!grows || !plants) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-5 sm:px-7 py-6"
    >
      <header className="flex items-end justify-between mb-5">
        <div>
          <Eyebrow color="var(--terra-300)">Allar ræktanir</Eyebrow>
          <h1 className="sp-h1" style={{ marginTop: 6 }}>
            Ræktanir
          </h1>
        </div>
        <Button size="sm" onClick={() => navigate('/setup')}>
          <Plus size={14} /> Ný
        </Button>
      </header>

      <div className="flex flex-col gap-3">
        {sorted.length === 0 && (
          <div className="text-cream-300/60 text-sm border border-dashed border-moss-800/40 rounded-2xl p-6 text-center">
            Engar ræktanir enn. Smelltu „Ný" til að byrja.
          </div>
        )}
        {sorted.map((g) => {
          const gp = plants.filter((p) => p.growId === g.id);
          const day = daysSince(g.startDate);
          const timeline = timelineForCategory(g.category);
          const stageDay = growStageDay(g.startDate, gp, timeline);
          const phase = getPhaseForDay(stageDay, timeline.phases);
          const variety = gp[0]?.variety ?? '';
          const loc = LOCATIONS.find((l) => l.key === g.locationKey);
          return (
            <Link
              key={g.id}
              to={`/grow/${g.id}`}
              className="block"
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  position: 'relative',
                  borderRadius: 18,
                  overflow: 'hidden',
                  background: 'rgba(36,56,39,.55)',
                  border: '1px solid rgba(64,104,67,.45)',
                  backdropFilter: 'blur(20px) saturate(160%)',
                  padding: 14,
                  paddingRight: 90,
                  cursor: 'pointer',
                  transition: 'background .15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(36,56,39,.7)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(36,56,39,.55)')}
              >
                <div style={{ position: 'absolute', right: -4, top: 0 }}>
                  <PlantGlyph name={variety} size={88} tilt={8} />
                </div>
                <div className="flex gap-1.5 mb-1.5">
                  {loc && <Pill tone="moss" size="sm">{loc.label}</Pill>}
                  <Pill tone="cap" size="sm">D{day}</Pill>
                  {g.archived && <Pill tone="dark" size="sm">Lokið</Pill>}
                </div>
                <div className="sp-h3" style={{ fontSize: 18 }}>
                  {g.name}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(231,217,168,.55)', marginBottom: 10 }}>
                  {g.location} · {gp.length} plöntur · {phase.label.toLowerCase()}
                </div>
                <PhaseBar
                  phases={timeline.phases}
                  currentDay={stageDay}
                  totalDays={timeline.totalDays}
                  showLabels={false}
                />
                <ChevronRight
                  size={16}
                  color="var(--cream-300)"
                  style={{ position: 'absolute', right: 10, bottom: 10 }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
