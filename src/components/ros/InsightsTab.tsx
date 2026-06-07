import { Sparkles } from 'lucide-react';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { computeInsights } from '@/lib/ros/engine';
import type { Grow, Plant, LogEntry, HarvestEntry } from '@/lib/db';
import type { RosInsight } from '@/lib/ros/types';
import { KIND_ICON, SEVERITY_STYLE, dueLabel } from '@/components/ros/rosWindowState';

/* — RÁÐ — */

export function InsightsTab({
  grow,
  plants,
  logs,
  harvests,
}: {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
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
      {insights.map((ins) => (
        <InsightCard key={ins.id} insight={ins} />
      ))}
    </div>
  );
}

function InsightCard({ insight }: { insight: RosInsight }) {
  const sev = SEVERITY_STYLE[insight.severity];
  const Icon = KIND_ICON[insight.kind] ?? Sparkles;
  const due = dueLabel(insight.dueInDays);

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
      </div>
    </div>
  );
}
