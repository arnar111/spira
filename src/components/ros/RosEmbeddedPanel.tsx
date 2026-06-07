import { useMemo } from 'react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { RosPanel, type RosPanelTab } from '@/components/ros/RosPanel';
import { InsightsTab } from '@/components/ros/InsightsTab';
import { YieldTab } from '@/components/ros/YieldTab';
import { TimelineTab } from '@/components/ros/TimelineTab';
import { WeekTab } from '@/components/ros/WeekTab';
import { type Grow } from '@/lib/db';

/**
 * Innfelldi Rós-flöturinn í kyrrstæða dálkinum á GrowDetail (borðtölva).
 * Flipasett: Ráð, Uppskera, Ferill, Vika. Spjall/Heilsa/Greining búa í
 * popout-glugganum (RosWindow). Hlaðinn sér (React.lazy) svo react-markdown
 * o.fl. haldist utan við aðalbúntið — eins og RosWindow.
 */
export function RosEmbeddedPanel({ grow }: { grow: Grow }): JSX.Element {
  const tabs = useMemo<RosPanelTab[]>(
    () => [
      { label: 'Ráð', render: (ctx) => <InsightsTab {...ctx} /> },
      { label: 'Uppskera', render: (ctx) => <YieldTab {...ctx} /> },
      { label: 'Ferill', render: (ctx) => <TimelineTab {...ctx} /> },
      { label: 'Vika', render: (ctx) => <WeekTab {...ctx} /> },
    ],
    [],
  );

  return (
    <RosPanel
      grow={grow}
      tabs={tabs}
      header={
        <header className="shrink-0 flex items-center gap-2.5 mb-3">
          <RosAvatar size={32} />
          <Eyebrow color="var(--terra-300)">Rós · vinkona ræktandans</Eyebrow>
        </header>
      }
    />
  );
}
