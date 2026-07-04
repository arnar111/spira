import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PenLine, Sparkles } from 'lucide-react';
import { KIND_ICON, KIND_TO_LOG, SEVERITY_STYLE } from '@/components/ros/rosWindowState';
import type { HomeAgendaItem } from './useHomeData';

/**
 * „Í dag" (5.x) — aðkallandi verk dagsins beint á heimaskjánum. Áður bjó
 * dagskráin aðeins á /ros; nú svarar forsíðan strax „hvað þarf ég að gera?".
 * Hver lína opnar ræktunina; „Skrá"-hnappurinn stekkur beint í forvalinn
 * skráningarglugga gegnum ?skra-djúptenginguna.
 */
export function HomeAgenda({ agenda }: { agenda: HomeAgendaItem[] }): JSX.Element | null {
  const navigate = useNavigate();
  if (agenda.length === 0) return null;

  return (
    <div>
      <div
        className="flex items-baseline justify-between"
        style={{ marginBottom: 10 }}
      >
        <div className="sp-h3">Í dag</div>
        <span
          className="sp-mono"
          style={{ fontSize: 10, color: 'var(--cream-400)', letterSpacing: '0.16em' }}
        >
          {agenda.length} {agenda.length === 1 ? 'VERK' : 'VERK'}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {agenda.map(({ growId, growName, insight }) => {
            const sev = SEVERITY_STYLE[insight.severity];
            const Icon = KIND_ICON[insight.kind] ?? Sparkles;
            const logType = KIND_TO_LOG[insight.kind];
            return (
              <motion.div
                key={`${growId}:${insight.id}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5"
                style={{
                  background: 'rgba(36,56,39,.55)',
                  border: '1px solid rgba(64,104,67,.4)',
                  borderLeft: `3px solid ${sev.edge}`,
                }}
              >
                <div
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: sev.iconBg, color: sev.iconColor }}
                >
                  <Icon size={15} />
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/grow/${growId}`)}
                  className="min-w-0 flex-1 text-left active:scale-[.995] transition-transform"
                >
                  <div className="text-[13px] font-medium text-cream-50 truncate">
                    {insight.title}
                  </div>
                  <div className="text-[10.5px] text-cream-300/60 truncate">{growName}</div>
                </button>
                {logType && (
                  <button
                    type="button"
                    aria-label={`Skrá — ${insight.title}`}
                    onClick={() =>
                      navigate(
                        `/grow/${growId}?skra=${logType}${
                          insight.plantId ? `&planta=${insight.plantId}` : ''
                        }`,
                      )
                    }
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-moss-700 bg-moss-800/60 px-2.5 py-1.5 text-[11px] font-medium text-cream-100 transition-all duration-150 hover:border-moss-500 active:scale-95"
                  >
                    <PenLine size={11} />
                    Skrá
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
