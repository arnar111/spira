import { useMemo } from 'react';
import { Check, Filter, Flame } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PlantGlyph } from '@/components/PlantGlyph';
import {
  COLOR_HEX,
  COLOR_LABEL,
  MOTHER_SPECIES,
  formatShu,
  isHerb,
  isLeafy,
  isPepper,
  isPotato,
  isStrawberry,
  isTomato,
  suggestForLocation,
  type PepperColor,
  type Variety,
} from '@/lib/varieties';
import { getLocation } from '@/lib/locations';
import {
  SHU_TIERS,
  filterVarieties,
  availableMothers as mothersOf,
  availableColors as colorsOf,
} from '@/lib/varietyFilter';
import { StepWrap, StepHeader, FilterRow, Chip } from './components';
import type { WizardState } from './useSetupState';

export function VarietiesStep({
  state,
  set,
}: {
  state: WizardState;
  set: (patch: Partial<WizardState>) => void;
}) {
  const loc = getLocation(state.locationKey);
  const suggested = useMemo(() => suggestForLocation(state.locationKey), [state.locationKey]);

  const filtered = useMemo(
    () =>
      filterVarieties(suggested, {
        filterMother: state.filterMother,
        filterColor: state.filterColor,
        shuTier: state.shuTier,
      }),
    [suggested, state.filterMother, state.filterColor, state.shuTier],
  );

  const availableMothers = useMemo(() => mothersOf(suggested), [suggested]);
  const availableColors = useMemo(() => colorsOf(suggested), [suggested]);

  function toggle(id: string) {
    set({
      varietyIds: state.varietyIds.includes(id)
        ? state.varietyIds.filter((v) => v !== id)
        : [...state.varietyIds, id],
    });
  }

  return (
    <StepWrap>
      <StepHeader
        eyebrow="Plöntur"
        title="Veldu afbrigði"
        hint={`Spíra mælir með ${suggested.length} piprum fyrir ${loc.label.toLowerCase()}.`}
      />

      <div className="space-y-3">
        <FilterRow label="Móðurtegund" icon={Filter}>
          <Chip
            active={state.filterMother === 'all'}
            onClick={() => set({ filterMother: 'all' })}
          >
            Allar
          </Chip>
          {MOTHER_SPECIES.filter((m) => availableMothers.includes(m)).map((m) => (
            <Chip
              key={m}
              active={state.filterMother === m}
              onClick={() => set({ filterMother: m })}
            >
              {m}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Litur">
          <Chip
            active={state.filterColor === 'all'}
            onClick={() => set({ filterColor: 'all' })}
          >
            Allir
          </Chip>
          {(Object.keys(COLOR_LABEL) as PepperColor[])
            .filter((c) => availableColors.includes(c))
            .map((c) => (
              <Chip
                key={c}
                active={state.filterColor === c}
                onClick={() => set({ filterColor: c })}
                swatch={COLOR_HEX[c]}
              >
                {COLOR_LABEL[c]}
              </Chip>
            ))}
        </FilterRow>
        <FilterRow label="SHU">
          {SHU_TIERS.map((t) => (
            <Chip
              key={t.id}
              active={state.shuTier === t.id}
              onClick={() => set({ shuTier: t.id })}
            >
              {t.label}
            </Chip>
          ))}
        </FilterRow>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="text-sm text-cream-300/60 text-center py-6 border border-dashed border-moss-800/40 rounded-2xl">
            Engin afbrigði passa við þessar síur. Slakaðu á smá.
          </div>
        )}
        {filtered.map((v) => (
          <VarietyRow
            key={v.id}
            v={v}
            selected={state.varietyIds.includes(v.id)}
            onClick={() => toggle(v.id)}
          />
        ))}
      </div>
    </StepWrap>
  );
}

function VarietyRow({
  v,
  selected,
  onClick,
}: {
  v: Variety;
  selected: boolean;
  onClick: () => void;
}) {
  const swatch: PepperColor = isPepper(v)
    ? v.color
    : isPotato(v)
      ? v.skinColor
      : isTomato(v) || isStrawberry(v)
        ? v.fruitColor
        : 'green';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 rounded-2xl p-3.5 transition-all border',
        selected
          ? 'bg-moss-800/60 border-moss-400 shadow-lg shadow-moss-900/30'
          : 'bg-moss-900/40 border-moss-800/40 hover:border-moss-600 hover:bg-moss-900/60',
      )}
    >
      <div
        className={cn(
          'shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
          selected ? 'bg-moss-400 border-moss-400' : 'border-moss-600 bg-transparent',
        )}
      >
        {selected && <Check size={14} className="text-moss-950" />}
      </div>
      <div className="shrink-0">
        <PlantGlyph variety={v} size={42} tilt={-4} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="heading text-base font-semibold text-cream-50">
            {v.commonName}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(231,217,168,.12)',
              color: 'var(--cream-300)',
              border: '1px solid rgba(231,217,168,.18)',
            }}
          >
            {isPepper(v)
              ? v.motherSpecies
              : isStrawberry(v)
                ? 'Jarðarber'
                : isPotato(v)
                  ? 'Kartafla'
                  : isHerb(v)
                    ? 'Kryddjurt'
                    : isLeafy(v)
                      ? 'Salat'
                      : 'Tómatur'}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(18,31,20,.55)',
              border: '1px solid rgba(64,104,67,.5)',
              color: 'var(--cream-100)',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: 999,
                background: COLOR_HEX[swatch],
              }}
            />
            {COLOR_LABEL[swatch]}
          </span>
          {isPepper(v) ? (
            v.shu > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-capsicum-400 bg-capsicum-600/20 px-2 py-0.5 rounded-full">
                <Flame size={10} />
                {formatShu(v.shu)} SHU
              </span>
            )
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(84,130,85,.18)',
                color: 'var(--moss-300)',
                border: '1px solid rgba(84,130,85,.4)',
              }}
            >
              {isStrawberry(v)
                ? 'Jarðarber'
                : isPotato(v)
                  ? v.use
                  : isHerb(v) || isLeafy(v)
                    ? v.harvestFrequency
                    : v.growthHabit === 'determinate'
                      ? 'Ákveðinn'
                      : 'Óákveðinn'}
            </span>
          )}
        </div>
        {v.flavor && (
          <p className="text-xs text-cream-300/70 mt-1 truncate">{v.flavor}</p>
        )}
      </div>
    </button>
  );
}
