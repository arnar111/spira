import { motion } from 'framer-motion';
import { ActionTile } from '@/components/ui/ActionTile';
import { LOG_GROUPS, LOG_TYPE_META } from '@/lib/logSchema';
import { listItem, listStagger } from '@/lib/motion';
import type { LogType } from '@/lib/db';
import { logIcon } from './shared';

/**
 * Fyrsta skref skráningar (5.x): hrein tegundavalssíða — allar 13 tegundir í
 * fjórum merktum hópum (Daglegt/Umhirða/Mælingar/Vandamál) með stórum reitum í
 * stað 4 reita + 9 þröngra flaga áður. Valið fer beint í einbeitt form.
 */
export function TypePicker({ onPick }: { onPick: (type: LogType) => void }): JSX.Element {
  return (
    <motion.div variants={listStagger} initial="hidden" animate="show">
      {LOG_GROUPS.map((group) => {
        const types = LOG_TYPE_META.filter((m) => m.group === group.id);
        if (types.length === 0) return null;
        return (
          <motion.div key={group.id} variants={listItem} className="mb-4 last:mb-0">
            <div className="sp-label text-cream-400/70 mb-1.5">{group.label}</div>
            <div className="grid grid-cols-4 gap-1.5">
              {types.map((m) => {
                const Icon = logIcon(m.icon);
                return (
                  <ActionTile
                    key={m.id}
                    icon={<Icon size={18} />}
                    label={m.label}
                    onClick={() => onPick(m.id)}
                  />
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
