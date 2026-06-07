import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Pill } from '@/components/ui/Pill';
import { PhaseBar } from '@/components/ui/PhaseBar';
import { PlantGlyph } from '@/components/PlantGlyph';
import type { Grow, Plant } from '@/lib/db';
import {
  daysSince,
  getPhaseForDay,
  growStageDay,
  timelineForCategory,
} from '@/lib/phases';
import { LOCATIONS } from '@/lib/locations';

interface GrowRowProps {
  grow: Grow;
  /** Plöntur þessarar ræktunar (notað fyrir fasa + glyph). */
  plants: Plant[];
}

/**
 * Listalína fyrir ræktun (áður innfellt í Grows.tsx). Reiknar dag/fasa innra
 * svo bæði Grows og Safn geti notað hana. Útlit fært óbreytt.
 */
export function GrowRow({ grow: g, plants: gp }: GrowRowProps) {
  const day = daysSince(g.startDate);
  const timeline = timelineForCategory(g.category);
  const stageDay = growStageDay(g.startDate, gp, timeline);
  const phase = getPhaseForDay(stageDay, timeline.phases);
  const variety = gp[0]?.variety ?? '';
  const loc = LOCATIONS.find((l) => l.key === g.locationKey);
  return (
    <Link
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
}
