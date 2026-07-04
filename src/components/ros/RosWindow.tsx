import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { RosPanel, type RosPanelTab } from '@/components/ros/RosPanel';
import { DiagnosisTab } from '@/components/ros/DiagnosisWizard';
import { InsightsTab } from '@/components/ros/InsightsTab';
import { HealthTab } from '@/components/ros/HealthTab';
import { ChatTab } from '@/components/ros/ChatTab';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { type Grow, type LogType } from '@/lib/db';

interface RosWindowProps {
  grow: Grow;
  open: boolean;
  onClose: () => void;
  /** Flipi sem á að vera virkur við opnun (merki, t.d. „Spjall"). Fyrir djúptengingu. */
  initialTab?: string;
  /** Forskrifaður texti í spjall-inntakið (t.d. „Spurning vikunnar" af /ros). */
  initialChatDraft?: string;
  /** Flýtiskráning af ráði (símaflipinn „Ráð") — kallarinn lokar glugganum og opnar skráningu. */
  onQuickLog?: (type: LogType, plantId?: string, data?: Record<string, string>) => void;
}

/**
 * Þunn Modal-umgjörð yfir RosPanel (4.4/cat1 skipting). Endurnýtanlegi
 * kjarninn (lifandi gögn + flipar) býr í RosPanel; hér er bara haus með
 * RosAvatar + nafni og lokunarhnappi.
 *
 * Flipasett popout-gluggans fer eftir skjástærð:
 * - Borðtölva (≥1024px): Spjall, Heilsa, Greining — „Ráð" býr í innfellda
 *   fletinum á GrowDetail, svo hér byrjar spjallið (hnappurinn segir „spyrja").
 * - Sími (<1024px): Ráð, Heilsa, Greining, Spjall — enginn innfelldur flötur.
 */
export function RosWindow({
  grow,
  open,
  onClose,
  initialTab,
  initialChatDraft,
  onQuickLog,
}: RosWindowProps): JSX.Element {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const tabs = useMemo<RosPanelTab[]>(() => {
    const chat: RosPanelTab = {
      label: 'Spjall',
      render: (ctx) => <ChatTab {...ctx} initialDraft={initialChatDraft} />,
    };
    const health: RosPanelTab = { label: 'Heilsa', render: (ctx) => <HealthTab {...ctx} /> };
    const diagnosis: RosPanelTab = {
      label: 'Greining',
      render: (ctx) => <DiagnosisTab {...ctx} />,
    };
    if (isDesktop) {
      return [chat, health, diagnosis];
    }
    return [
      { label: 'Ráð', render: (ctx) => <InsightsTab {...ctx} /> },
      health,
      diagnosis,
      chat,
    ];
  }, [isDesktop, initialChatDraft]);

  return (
    <Modal open={open} onClose={onClose} fullHeight bodyScroll={false} size="lg">
      <RosPanel
        grow={grow}
        tabs={tabs}
        initialTab={initialTab}
        onQuickLog={onQuickLog}
        header={
          <header className="shrink-0 flex items-center gap-3 mb-3">
            <RosAvatar size={40} />
            <div className="min-w-0">
              <Eyebrow color="var(--terra-300)">Rós · vinkona ræktandans</Eyebrow>
              <h3
                className="sp-display truncate"
                style={{
                  fontSize: 20,
                  color: 'var(--cream-50)',
                  fontWeight: 500,
                  lineHeight: 1.1,
                }}
              >
                {grow.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Loka"
              className="ml-auto shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-cream-300 hover:text-cream-50 transition-colors"
              style={{ background: 'rgba(18,31,20,.5)', border: '1px solid rgba(64,104,67,.4)' }}
            >
              <X size={16} />
            </button>
          </header>
        }
      />
    </Modal>
  );
}
