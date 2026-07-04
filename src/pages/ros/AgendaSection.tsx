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
  Move,
  Package,
  Scissors,
  ShieldAlert,
  Snowflake,
  Sparkles,
  SprayCan,
  Sprout,
  Thermometer,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { PenLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { KIND_TO_LOG, KIND_TO_LOG_DATA } from '@/components/ros/rosWindowState';
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
  ec: FlaskConical,
  transplant: Move,
  pest: Bug,
  disease: ShieldAlert,
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
  onQuickLog,
}: {
  dueAndSoon: TaggedInsight[];
  infoCount: number;
  onOpen: (growId: string) => void;
  /** Flýtiskráning (5.x): „Skrá"-hnappur á lið → skráningargluggi ræktunar forvalinn.
   * `task` forvelur viðhaldsverkið (Véritable) þegar það á við. */
  onQuickLog?: (growId: string, type: string, plantId?: string, task?: string) => void;
}) {
  return (
    <section className="mb-8">
      <SectionTitle>Dagskrá dagsins</SectionTitle>
      {dueAndSoon.length === 0 ? (
        <AllGoodCard infoCount={infoCount} />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {dueAndSoon.map((t) => (
              <motion.div
                key={`${t.growId}:${t.insight.id}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                transition={{ duration: 0.25 }}
              >
                <AgendaRow
                  tagged={t}
                  onOpen={() => onOpen(t.growId)}
                  onQuickLog={onQuickLog}
                />
              </motion.div>
            ))}
          </AnimatePresence>
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
  onQuickLog,
}: {
  tagged: TaggedInsight;
  onOpen: () => void;
  onQuickLog?: (growId: string, type: string, plantId?: string, task?: string) => void;
}) {
  const { insight, growName } = tagged;
  const sev = SEVERITY_STYLE[insight.severity];
  const Icon = KIND_ICON[insight.kind] ?? Sparkles;
  const logType = KIND_TO_LOG[insight.kind];

  return (
    <div
      className="w-full rounded-2xl p-3 flex gap-3"
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
        {/* Meginflöturinn er áfram hnappur sem opnar ræktunina … */}
        <button
          type="button"
          onClick={onOpen}
          className="block w-full text-left transition-colors active:scale-[.995]"
        >
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
        </button>
        {/* … en liðnum má ljúka beint héðan með einni snertingu. */}
        {onQuickLog && logType && (
          <button
            type="button"
            onClick={() =>
              onQuickLog(
                tagged.growId,
                logType,
                insight.plantId,
                KIND_TO_LOG_DATA[insight.kind]?.task,
              )
            }
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-moss-700 bg-moss-800/60 px-2.5 py-1 text-[11px] font-medium text-cream-100 transition-all duration-150 hover:border-moss-500 active:scale-95"
          >
            <PenLine size={11} />
            Skrá núna
          </button>
        )}
      </div>
    </div>
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
