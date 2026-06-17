import type { ReactNode } from 'react';
import type { LogType, Plant } from '@/lib/db';
import { logTypeMeta } from './shared';

/** Síur fyrir skráningalistann (1.3): tegund, planta og tímabil. */
export function LogFilters({
  presentTypes,
  plants,
  typeFilter,
  onType,
  plantFilter,
  onPlant,
  range,
  onRange,
}: {
  presentTypes: LogType[];
  plants: Plant[];
  typeFilter: LogType | 'all';
  onType: (t: LogType | 'all') => void;
  plantFilter: string;
  onPlant: (p: string) => void;
  range: 7 | 30 | 0;
  onRange: (r: 7 | 30 | 0) => void;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <LogChip active={typeFilter === 'all'} onClick={() => onType('all')}>
          Allt
        </LogChip>
        {presentTypes.map((t) => {
          const { label, icon: Icon } = logTypeMeta(t);
          return (
            <LogChip key={t} active={typeFilter === t} onClick={() => onType(t)}>
              <Icon size={11} />
              {label}
            </LogChip>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {plants.length > 0 && (
          <select
            value={plantFilter}
            onChange={(e) => onPlant(e.target.value)}
            aria-label="Sía skráningar eftir plöntu"
            className="rounded-lg bg-moss-950/60 border border-moss-800 px-2.5 py-1.5 text-xs text-cream-100 outline-none focus:border-moss-400"
          >
            <option value="all">Allar plöntur</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname || p.variety}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-1.5">
          {([
            { v: 7, label: '7 dagar' },
            { v: 30, label: '30 dagar' },
            { v: 0, label: 'Allt' },
          ] as const).map((r) => (
            <LogChip key={r.v} active={range === r.v} onClick={() => onRange(r.v)}>
              {r.label}
            </LogChip>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LogChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
        active
          ? 'bg-moss-600 border-moss-400 text-cream-50'
          : 'bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600'
      }`}
    >
      {children}
    </button>
  );
}
