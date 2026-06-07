import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { DiagnosisTab } from '@/components/ros/DiagnosisWizard';
import { InsightsTab } from '@/components/ros/InsightsTab';
import { HealthTab } from '@/components/ros/HealthTab';
import { ChatTab } from '@/components/ros/ChatTab';
import { db, type Grow } from '@/lib/db';

interface RosWindowProps {
  grow: Grow;
  open: boolean;
  onClose: () => void;
}

/**
 * Skel/umsjón Rósar-gluggans (4.4 skipting). Flipa-innihaldið býr í sér
 * einingum: InsightsTab (Ráð), HealthTab (Heilsa), DiagnosisTab (Greining),
 * ChatTab (Spjall). Sameiginleg tákn/litir/textar í rosWindowState.ts og
 * markdown-birting í RosMarkdown.tsx. Lifandi Dexie-gögnin eru sótt hér og
 * gefin niður í flipana svo þeir deili sömu áskrift.
 */
export function RosWindow({ grow, open, onClose }: RosWindowProps): JSX.Element {
  const [tab, setTab] = useState(0);

  // Lifandi gögn beint úr gagnagrunni — „Ráð" (og samhengi spjallsins) uppfærast
  // um leið og log er skráð. RosWindow helst tengdur þótt glugginn sé lokaður,
  // svo Dexie-áskriftin er alltaf virk og engin endurhleðsla þarf.
  const plants =
    useLiveQuery(() => db.plants.where('growId').equals(grow.id).toArray(), [grow.id]) ?? [];
  const logs =
    useLiveQuery(
      () => db.logs.where('growId').equals(grow.id).reverse().sortBy('timestamp'),
      [grow.id],
    ) ?? [];
  const harvests =
    useLiveQuery(() => db.harvests.where('growId').equals(grow.id).toArray(), [grow.id]) ?? [];

  return (
    <Modal open={open} onClose={onClose} fullHeight size="lg">
      <div className="flex flex-col min-h-0 h-full">
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

        <div className="shrink-0 mb-3">
          <Tabs
            tabs={['Ráð', 'Heilsa', 'Greining', 'Spjall']}
            active={tab}
            onChange={setTab}
          />
        </div>

        <div className="min-h-0 flex-1 flex flex-col">
          {tab === 0 && (
            <InsightsTab grow={grow} plants={plants} logs={logs} harvests={harvests} />
          )}
          {tab === 1 && (
            <HealthTab grow={grow} plants={plants} logs={logs} harvests={harvests} />
          )}
          {tab === 2 && (
            <DiagnosisTab grow={grow} plants={plants} logs={logs} harvests={harvests} />
          )}
          {tab === 3 && (
            <ChatTab grow={grow} plants={plants} logs={logs} harvests={harvests} />
          )}
        </div>
      </div>
    </Modal>
  );
}
