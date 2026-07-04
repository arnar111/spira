import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Tabs } from '@/components/ui/Tabs';
import {
  db,
  type Grow,
  type Plant,
  type LogEntry,
  type LogType,
  type HarvestEntry,
} from '@/lib/db';

/** Samhengið sem hver Rós-flipi fær: ræktunin og lifandi gögnin hennar. */
export interface RosPanelContext {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
  /**
   * Flýtiskráning af ráði (5.x): opnar skráningargluggann forvalinn á tegund
   * (og plöntu/verki ef ráðið á við). Ósett í samhengjum án skráningarglugga.
   */
  onQuickLog?: (type: LogType, plantId?: string, data?: Record<string, string>) => void;
}

/** Einn flipi: merki á stönginni + fall sem birtir innihaldið úr samhenginu. */
export interface RosPanelTab {
  label: string;
  render: (ctx: RosPanelContext) => JSX.Element;
}

interface RosPanelProps {
  grow: Grow;
  tabs: RosPanelTab[];
  /** Valfrjáls haus fyrir ofan flipa-stöngina (t.d. avatar + nafn). */
  header?: ReactNode;
  /**
   * Flipi sem á að vera virkur við opnun, valinn eftir merki (t.d. „Spjall").
   * Merki frekar en vísitala svo djúptenging virki óháð flipa-röð (sem er
   * ólík á borðtölvu/síma). Hunsað ef merkið finnst ekki.
   */
  initialTab?: string;
  /** Flýtiskráning af ráði — rennur inn í samhengi flipanna (sjá RosPanelContext). */
  onQuickLog?: (type: LogType, plantId?: string, data?: Record<string, string>) => void;
}

/**
 * Endurnýtanlegi kjarni Rósar — án Modal-umgjarðar. Á áskrift að lifandi
 * Dexie-gögnum ræktunarinnar (plöntur/log/uppskera) og heldur utan um virka
 * flipann; birtir flipa-stöngina og virka flipann í sömu `flex min-h-0`
 * skrunbyggingu og áður. Bæði RosWindow (Modal) og innfelldi flöturinn á
 * GrowDetail nota þennan flöt — bara með ólík flipasett.
 */
export function RosPanel({
  grow,
  tabs,
  header,
  initialTab,
  onQuickLog,
}: RosPanelProps): JSX.Element {
  // Byrjunarflipi: vísitala merkisins ef það finnst, annars fyrsti flipinn.
  const [tab, setTab] = useState(() => {
    if (!initialTab) return 0;
    const idx = tabs.findIndex((t) => t.label === initialTab);
    return idx >= 0 ? idx : 0;
  });

  // Lifandi gögn beint úr gagnagrunni — „Ráð" (og samhengi spjallsins) uppfærast
  // um leið og log er skráð, svo Dexie-áskriftin er alltaf virk.
  const plants =
    useLiveQuery(() => db.plants.where('growId').equals(grow.id).toArray(), [grow.id]) ?? [];
  const logs =
    useLiveQuery(
      () => db.logs.where('growId').equals(grow.id).reverse().sortBy('timestamp'),
      [grow.id],
    ) ?? [];
  const harvests =
    useLiveQuery(() => db.harvests.where('growId').equals(grow.id).toArray(), [grow.id]) ?? [];

  const active = Math.min(tab, tabs.length - 1);
  const ctx: RosPanelContext = { grow, plants, logs, harvests, onQuickLog };

  return (
    <div className="flex flex-col min-h-0 h-full">
      {header}

      <div className="shrink-0 mb-3">
        <Tabs tabs={tabs.map((t) => t.label)} active={active} onChange={setTab} fullWidth />
      </div>

      <div className="min-h-0 flex-1 flex flex-col">{tabs[active]?.render(ctx)}</div>
    </div>
  );
}
