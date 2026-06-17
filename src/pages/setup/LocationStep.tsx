import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { suggestForLocation } from '@/lib/varieties';
import { LOCATIONS, type LocationCategory, type LocationKey } from '@/lib/locations';
import { StepWrap, StepHeader } from './components';

export function LocationStep({
  value,
  onChange,
}: {
  value: LocationKey;
  onChange: (k: LocationKey) => void;
}) {
  return (
    <StepWrap>
      <StepHeader
        eyebrow="Velkomin/n"
        title="Hvar viltu rækta?"
        hint="Spíra leggur til pipra sem henta þeirri staðsetningu."
      />
      <div className="grid gap-3">
        {LOCATIONS.map((loc) => (
          <LocationCard
            key={loc.key}
            loc={loc}
            selected={value === loc.key}
            onClick={() => onChange(loc.key)}
          />
        ))}
      </div>
    </StepWrap>
  );
}

function LocationCard({
  loc,
  selected,
  onClick,
}: {
  loc: LocationCategory;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = loc.icon;
  const count = suggestForLocation(loc.key).length;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-4 rounded-2xl p-4 transition-all border',
        selected
          ? 'bg-moss-800/60 border-moss-400 shadow-lg shadow-moss-900/30'
          : 'bg-moss-900/40 border-moss-800/40 hover:border-moss-600 hover:bg-moss-900/60',
      )}
    >
      <div
        className={cn(
          'shrink-0 rounded-xl p-3 transition-colors',
          selected ? 'bg-moss-600 text-cream-50' : 'bg-moss-800/60 text-moss-300',
        )}
      >
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="heading text-lg font-semibold text-cream-50">{loc.label}</span>
          <span className="text-[10px] uppercase tracking-wider text-moss-300 bg-moss-800/50 px-2 py-0.5 rounded-full">
            {count} afbrigði
          </span>
        </div>
        <p className="text-sm text-cream-300/70 mt-0.5">{loc.description}</p>
      </div>
      {selected && <Check className="text-moss-300" size={20} />}
    </button>
  );
}
