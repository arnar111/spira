import { AnimatePresence, motion } from 'framer-motion';
import { PenLine, Sparkles } from 'lucide-react';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { computeInsights } from '@/lib/ros/engine';
import type { Grow, Plant, LogEntry, LogType, HarvestEntry } from '@/lib/db';
import type { RosInsight } from '@/lib/ros/types';
import {
  KIND_ICON,
  KIND_TO_LOG,
  SEVERITY_STYLE,
  dueLabel,
} from '@/components/ros/rosWindowState';

/* — RÁÐ — */

export function InsightsTab({
  grow,
  plants,
  logs,
  harvests,
  onQuickLog,
}: {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
  /** Flýtiskráning (5.x): „Skrá"-hnappur á ráðum sem eiga sér skráningartegund. */
  onQuickLog?: (type: LogType, plantId?: string) => void;
}) {
  const now = Date.now();
  const month = new Date(now).getMonth() + 1;
  const insights = computeInsights({ grow, plants, logs, harvests, now, month });

  if (insights.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div
          className="text-sm text-cream-300/70 rounded-2xl p-6 text-center"
          style={{
            background: 'rgba(18,31,20,.4)',
            border: '1px dashed rgba(64,104,67,.45)',
          }}
        >
          <div className="flex justify-center mb-2">
            <RosAvatar size={34} />
          </div>
          Allt lítur vel út hjá þér núna. Engin aðkallandi ráð — haltu áfram
          góðu verki og kíktu aftur síðar.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
      {/* Kort sem klárast (t.d. eftir flýtiskráningu) líða út í stað þess að
          hverfa — popLayout lætur hin renna upp í plássið. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {insights.map((ins) => (
          <motion.div
            key={ins.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
            transition={{ duration: 0.25 }}
          >
            <InsightCard insight={ins} onQuickLog={onQuickLog} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function InsightCard({
  insight,
  onQuickLog,
}: {
  insight: RosInsight;
  onQuickLog?: (type: LogType, plantId?: string) => void;
}) {
  const sev = SEVERITY_STYLE[insight.severity];
  const Icon = KIND_ICON[insight.kind] ?? Sparkles;
  const due = dueLabel(insight.dueInDays);
  const logType = KIND_TO_LOG[insight.kind];
  const canQuickLog = !!onQuickLog && !!logType && insight.severity !== 'info';

  return (
    <div
      className="rounded-2xl p-3 flex gap-3"
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
          {due && (
            <span
              className="text-[10px] uppercase tracking-wider sp-mono ml-auto"
              style={{ color: sev.iconColor }}
            >
              {due}
            </span>
          )}
        </div>
        <p className="text-[12px] text-cream-300/80 mt-1 leading-relaxed">
          {insight.detail}
        </p>
        {canQuickLog && (
          <button
            type="button"
            onClick={() => onQuickLog?.(logType!, insight.plantId)}
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
