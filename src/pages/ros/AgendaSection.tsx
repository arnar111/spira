import {
  Bug,
  CalendarDays,
  Container,
  Droplet,
  FlaskConical,
  Flower,
  Flower2,
  Leaf,
  Lightbulb,
  Mountain,
  Package,
  Scissors,
  Snowflake,
  Sparkles,
  SprayCan,
  Sprout,
  Thermometer,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { RosAvatar } from '@/components/ros/RosAvatar';
import type { RosInsightKind, RosSeverity } from '@/lib/ros/types';
import { SectionTitle } from './parts';
import type { TaggedInsight } from './useRosOverviewData';

const KIND_ICON: Record<RosInsightKind, LucideIcon> = {
  water: Droplet,
  feed: Leaf,
  prune: Scissors,
  top: Sparkles,
  pollinate: Flower,
  deblossom: Flower2,
  runner: Sprout,
  hill: Mountain,
  harvest: Leaf,
  light: Lightbulb,
  frost: Snowflake,
  season: CalendarDays,
  mulch: Leaf,
  env: Thermometer,
  envBand: Thermometer,
  ph: FlaskConical,
  pest: Bug,
  // — Véritable SMART (vatnsrækt) —
  tank: Container,
  clean: SprayCan,
  wick: Waves,
  thin: Scissors,
  lingot: Package,
  info: Sparkles,
};

/** Litaslá vinstri brúnar/táknu eftir forgangi (sama hugmynd og í RosWindow). */
const SEVERITY_STYLE: Record<
  RosSeverity,
  { edge: string; iconBg: string; iconColor: string }
> = {
  due: {
    edge: 'var(--cap-500)',
    iconBg: 'rgba(226,62,29,.16)',
    iconColor: 'var(--cap-400)',
  },
  soon: {
    edge: 'var(--cream-400)',
    iconBg: 'rgba(224,194,121,.16)',
    iconColor: 'var(--cream-300)',
  },
  info: {
    edge: 'var(--moss-400)',
    iconBg: 'rgba(115,159,115,.16)',
    iconColor: 'var(--moss-300)',
  },
};

export function AgendaSection({
  dueAndSoon,
  infoCount,
  onOpen,
}: {
  dueAndSoon: TaggedInsight[];
  infoCount: number;
  onOpen: (growId: string) => void;
}) {
  return (
    <section className="mb-8">
      <SectionTitle>Dagskrá dagsins</SectionTitle>
      {dueAndSoon.length === 0 ? (
        <AllGoodCard infoCount={infoCount} />
      ) : (
        <div className="flex flex-col gap-2">
          {dueAndSoon.map((t) => (
            <AgendaRow
              key={`${t.growId}:${t.insight.id}`}
              tagged={t}
              onOpen={() => onOpen(t.growId)}
            />
          ))}
          {infoCount > 0 && (
            <p className="text-[11px] text-cream-300/55 mt-1 px-0.5">
              {infoCount} ráð til viðbótar í einstökum ræktunum.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function AgendaRow({
  tagged,
  onOpen,
}: {
  tagged: TaggedInsight;
  onOpen: () => void;
}) {
  const { insight, growName } = tagged;
  const sev = SEVERITY_STYLE[insight.severity];
  const Icon = KIND_ICON[insight.kind] ?? Sparkles;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl p-3 flex gap-3 transition-colors active:scale-[.995]"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
        borderLeft: `3px solid ${sev.edge}`,
      }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: sev.iconBg, color: sev.iconColor }}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-cream-50 text-sm font-medium">{insight.title}</span>
          <span
            className="text-[10px] sp-mono px-1.5 py-0.5 rounded-full ml-auto shrink-0"
            style={{
              background: 'rgba(18,31,20,.55)',
              color: 'rgba(231,217,168,.7)',
              border: '1px solid rgba(64,104,67,.4)',
            }}
          >
            {growName}
          </span>
        </div>
        <p className="text-[12px] text-cream-300/80 mt-1 leading-relaxed">
          {insight.detail}
        </p>
      </div>
    </button>
  );
}

function AllGoodCard({ infoCount }: { infoCount: number }) {
  return (
    <div
      className="text-sm text-cream-300/75 rounded-2xl p-6 text-center"
      style={{
        background: 'rgba(18,31,20,.4)',
        border: '1px dashed rgba(64,104,67,.45)',
      }}
    >
      <div className="flex justify-center mb-2">
        <RosAvatar size={34} />
      </div>
      Allt í góðu hjá þér núna — ekkert aðkallandi á dagskrá. Haltu áfram góðu
      verki og kíktu aftur síðar.
      {infoCount > 0 && (
        <div className="text-[11px] text-cream-300/55 mt-2">
          {infoCount} {infoCount === 1 ? 'almennt ráð' : 'almenn ráð'} bíða í
          einstökum ræktunum.
        </div>
      )}
    </div>
  );
}
