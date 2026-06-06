import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Droplet,
  Filter,
  Flame,
  Leaf,
  Lightbulb,
  MapPin,
  Package,
  Sprout,
  Thermometer,
} from 'lucide-react';
import { GrowingPlant } from '@/components/GrowingPlant';
import { PlantGlyph } from '@/components/PlantGlyph';
import { SeasonCard } from '@/components/SeasonCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import {
  db,
  newId,
  setOnboardingComplete,
  type GrowPhase,
  type PlantCategory,
} from '@/lib/db';
import {
  BUILT_IN_VARIETIES,
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
  type MotherSpecies,
  type PepperColor,
  type Variety,
} from '@/lib/varieties';
import { LOCATIONS, type LocationCategory, type LocationKey } from '@/lib/locations';
import { syncManager } from '@/lib/sync';

interface SetupWizardProps {
  onComplete: () => void;
}

interface WizardState {
  locationKey: LocationKey;
  growName: string;
  location: string;
  spaceWidthCm: string;
  spaceDepthCm: string;
  spaceHeightCm: string;
  targetTempC: string;
  fixture: string;
  varietyIds: string[];
  filterMother: MotherSpecies | 'all';
  filterColor: PepperColor | 'all';
  shuTier: ShuTier;
}

type ShuTier = 'all' | 'mild' | 'medium' | 'hot' | 'super';

const TOTAL_STEPS = 4;

const SHU_TIERS: { id: ShuTier; label: string; min: number; max: number }[] = [
  { id: 'all', label: 'Allir', min: 0, max: Infinity },
  { id: 'mild', label: '< 5k SHU', min: 0, max: 4999 },
  { id: 'medium', label: '5k–100k', min: 5000, max: 99999 },
  { id: 'hot', label: '100k–500k', min: 100000, max: 499999 },
  { id: 'super', label: '500k+', min: 500000, max: Infinity },
];

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<WizardState>(() => {
    const defaults = LOCATIONS.find((l) => l.key === 'shower')!.defaults;
    return {
      locationKey: 'shower',
      growName: defaults.growName,
      location: 'Sturtuklefi',
      spaceWidthCm: String(defaults.spaceWidthCm),
      spaceDepthCm: String(defaults.spaceDepthCm),
      spaceHeightCm: String(defaults.spaceHeightCm),
      targetTempC: String(defaults.targetTempC),
      fixture: defaults.fixture,
      varietyIds: [],
      filterMother: 'all',
      filterColor: 'all',
      shuTier: 'all',
    };
  });

  const set = (patch: Partial<WizardState>) =>
    setState((s) => ({ ...s, ...patch }));

  // Útiræktun (garður): sleppum LED-skrefinu og sýnum árstíðayfirlit í staðinn.
  const outdoor =
    LOCATIONS.find((l) => l.key === state.locationKey)?.environment === 'outdoor';
  // Véritable: innbyggt LED — sleppum lampaskrefinu og sýnum upplýsingaskref í staðinn.
  const veritable = state.locationKey === 'veritable';

  function pickLocation(key: LocationKey) {
    const cat = LOCATIONS.find((l) => l.key === key)!;
    const d = cat.defaults;
    setState((s) => ({
      ...s,
      locationKey: key,
      growName: d.growName,
      location: cat.label,
      spaceWidthCm: String(d.spaceWidthCm),
      spaceDepthCm: String(d.spaceDepthCm),
      spaceHeightCm: String(d.spaceHeightCm),
      targetTempC: String(d.targetTempC),
      fixture: d.fixture,
      // Reset variety selection if location changed so suggestions are fresh
      varietyIds: [],
    }));
  }

  const canAdvance = useMemo(() => {
    if (step === 0) return !!state.locationKey;
    if (step === 1) return state.growName.trim().length > 0 && state.location.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return state.varietyIds.length > 0;
    return false;
  }, [step, state]);

  async function handleFinish() {
    setSubmitting(true);
    try {
      const now = Date.now();
      const growId = newId();
      const selected = state.varietyIds
        .map((id) => BUILT_IN_VARIETIES.find((v) => v.id === id))
        .filter((v): v is Variety => !!v);
      // Ef öll valin afbrigði eru í sama flokki, merkjum ræktunina þeim flokki;
      // annars (blönduð ræktun) fellur hún aftur í 'pepper'.
      const cats = new Set(selected.map((v) => v.category));
      const growCategory: PlantCategory =
        selected.length > 0 && cats.size === 1 ? selected[0].category : 'pepper';
      await db.grows.add({
        id: growId,
        name: state.growName.trim(),
        category: growCategory,
        location: state.location.trim(),
        locationKey: state.locationKey,
        environment:
          LOCATIONS.find((l) => l.key === state.locationKey)?.environment ?? 'indoor',
        startDate: now,
        fixture: state.fixture.trim() || undefined,
        spaceWidthCm: parseNum(state.spaceWidthCm),
        spaceDepthCm: parseNum(state.spaceDepthCm),
        spaceHeightCm: parseNum(state.spaceHeightCm),
        targetTempC: parseNum(state.targetTempC),
        // Véritable AdaptLight keyrir fast 16/8 prógramm.
        lightOnHours: veritable ? 16 : 18,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });

      for (const varietyId of state.varietyIds) {
        const variety = BUILT_IN_VARIETIES.find((v) => v.id === varietyId);
        if (!variety) continue;
        await db.plants.add({
          id: newId(),
          growId,
          varietyId,
          variety: variety.commonName,
          category: variety.category,
          startedFrom: 'seed',
          sowDate: now,
          currentPhase: 'planning' as GrowPhase,
          archived: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      await setOnboardingComplete(true);
      await syncManager.flush();
      onComplete();
      navigate('/home', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  const stage: 0 | 1 | 2 | 3 = Math.min(step, 3) as 0 | 1 | 2 | 3;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col lg:grid lg:grid-cols-[1fr_minmax(0,560px)_1fr]"
    >
      <div className="hidden lg:flex items-center justify-end pr-8 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-moss-500/15 blur-3xl" />
        </div>
        <motion.div
          key={`plant-${stage}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <GrowingPlant size={340} stage={stage} />
        </motion.div>
      </div>

      <div className="flex flex-col px-5 sm:px-8 pb-6 lg:pb-12 min-h-screen pt-safe-wizard">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => (step === 0 ? navigate('/') : setStep(step - 1))}
            className="flex items-center gap-1.5 text-cream-300 hover:text-cream-100 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Til baka
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === step ? 28 : 8,
                  backgroundColor:
                    i < step
                      ? 'rgb(84 130 85)'
                      : i === step
                        ? 'rgb(159 191 157)'
                        : 'rgb(52 83 55 / 0.4)',
                }}
                transition={{ duration: 0.4 }}
                className="h-1.5 rounded-full"
              />
            ))}
          </div>
        </div>

        <div className="flex lg:hidden justify-center mb-2">
          <motion.div
            key={`plant-mobile-${stage}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <GrowingPlant size={160} stage={stage} />
          </motion.div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepLocation
                key="step-0"
                value={state.locationKey}
                onChange={pickLocation}
              />
            )}
            {step === 1 && (
              <StepSpace key="step-1" state={state} set={set} outdoor={outdoor} />
            )}
            {step === 2 &&
              (outdoor ? (
                <StepSeason key="step-2" />
              ) : veritable ? (
                <StepVeritable key="step-2" />
              ) : (
                <StepLight key="step-2" state={state} set={set} />
              ))}
            {step === 3 && (
              <StepVarieties
                key="step-3"
                state={state}
                set={set}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-cream-400/60">
            Skref {step + 1} af {TOTAL_STEPS}
          </p>
          <Button
            size="lg"
            disabled={!canAdvance || submitting}
            onClick={() => {
              if (step < TOTAL_STEPS - 1) setStep(step + 1);
              else handleFinish();
            }}
          >
            {step < TOTAL_STEPS - 1 ? (
              <>
                Áfram
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                {submitting ? 'Vista…' : 'Búa til ræktun'}
                <Check size={18} />
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="hidden lg:block" />
    </motion.div>
  );
}

function parseNum(v: string): number | undefined {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {children}
    </motion.div>
  );
}

function StepHeader({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-moss-300 mb-2">{eyebrow}</p>
      <h2 className="heading text-3xl sm:text-4xl font-semibold text-cream-50 mb-2">{title}</h2>
      {hint && <p className="text-cream-300/70 leading-relaxed">{hint}</p>}
    </div>
  );
}

function StepLocation({
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
          selected ? 'bg-moss-500 text-cream-50' : 'bg-moss-800/60 text-moss-300',
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

function StepSpace({
  state,
  set,
  outdoor = false,
}: {
  state: WizardState;
  set: (patch: Partial<WizardState>) => void;
  outdoor?: boolean;
}) {
  return (
    <StepWrap>
      <StepHeader
        eyebrow={outdoor ? 'Beðið þitt' : 'Rýmið þitt'}
        title="Smáatriðin"
        hint="Stillingarnar fylgdu úr staðsetningu — breyttu því sem á við."
      />
      <Card className="space-y-5">
        <Field label="Heiti ræktunar" icon={Sprout}>
          <input
            value={state.growName}
            onChange={(e) => set({ growName: e.target.value })}
            placeholder={outdoor ? 't.d. Kartöflugarður' : 't.d. Sturtu-piparar'}
            className={inputCls}
          />
        </Field>
        <Field label="Staðsetning" icon={MapPin}>
          <input
            value={state.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder={outdoor ? 't.d. Garður, matjurtabeð' : 't.d. Sturtuklefi, baðherbergi'}
            className={inputCls}
          />
        </Field>
        <div>
          <label className="text-sm text-cream-200 font-medium mb-2 block">
            {outdoor ? 'Stærð beðs' : 'Stærð rýmis'}
          </label>
          <div className={cn('grid gap-2', outdoor ? 'grid-cols-2' : 'grid-cols-3')}>
            <NumberInput
              value={state.spaceWidthCm}
              onChange={(v) => set({ spaceWidthCm: v })}
              label="Breidd"
              suffix="cm"
            />
            <NumberInput
              value={state.spaceDepthCm}
              onChange={(v) => set({ spaceDepthCm: v })}
              label={outdoor ? 'Lengd' : 'Dýpt'}
              suffix="cm"
            />
            {!outdoor && (
              <NumberInput
                value={state.spaceHeightCm}
                onChange={(v) => set({ spaceHeightCm: v })}
                label="Hæð"
                suffix="cm"
              />
            )}
          </div>
        </div>
        {!outdoor && (
          <Field label="Markhitastig" icon={Thermometer}>
            <NumberInput
              value={state.targetTempC}
              onChange={(v) => set({ targetTempC: v })}
              suffix="°C"
            />
          </Field>
        )}
      </Card>
    </StepWrap>
  );
}

function StepSeason() {
  return (
    <StepWrap>
      <StepHeader
        eyebrow="Árstíð"
        title="Vaxtartíminn úti"
        hint="Útiræktun stýrist af árstíð og frosti — engin gróðurljós þarf."
      />
      <SeasonCard />
      <p className="text-[11.5px] text-cream-300/70 leading-snug mt-3">
        Kartöflur: forspíraðu inni í mars, settu niður seint í maí þegar frosthætta er liðin, og
        taktu upp í september fyrir fyrsta frost. Rós minnir þig á hreykingu og uppskeru þegar þar
        að kemur.
      </p>
    </StepWrap>
  );
}

function StepVeritable() {
  const facts: { icon: typeof Lightbulb; title: string; body: string }[] = [
    {
      icon: Lightbulb,
      title: 'Innbyggt AdaptLight LED',
      body: 'Fast 16/8 prógramm sem kviknar og slokknar sjálfkrafa — engin aukaljós þarf, jafnvel um hávetur.',
    },
    {
      icon: Droplet,
      title: 'Hárpípu-sjálfvökvun',
      body: '2 lítra tankur með kveikjum sem draga vatn upp í ræturnar. Fylltu á 7–14 daga fresti eftir plöntuálagi.',
    },
    {
      icon: Package,
      title: 'Lingot-hylki',
      body: 'Lífbrjótanleg hylki með fræjum og innbyggðri næringu sem dugar í u.þ.b. 12 vikur — skiptu þá um Lingot.',
    },
  ];
  return (
    <StepWrap>
      <StepHeader
        eyebrow="Véritable"
        title="Nánast viðhaldsfrítt"
        hint="Véritable SMART sér um ljós og vökvun sjálft — þú þarft bara að fylla á tank og skipta um Lingot."
      />
      <Card className="space-y-4">
        {facts.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl p-2.5 bg-moss-800/60 text-moss-300">
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <div className="heading text-base font-semibold text-cream-50">{f.title}</div>
                <p className="text-sm text-cream-300/70 leading-snug mt-0.5">{f.body}</p>
              </div>
            </div>
          );
        })}
      </Card>
      <p className="text-[11.5px] text-cream-300/70 leading-snug">
        Rós minnir þig á áfyllingu, tankhreinsun og kveikjaskoðun þegar þar að kemur.
      </p>
    </StepWrap>
  );
}

function StepLight({
  state,
  set,
}: {
  state: WizardState;
  set: (patch: Partial<WizardState>) => void;
}) {
  return (
    <StepWrap>
      <StepHeader
        eyebrow="Ljós"
        title="Hvaða lampa ertu með?"
        hint="Valkvætt — þú getur bætt við síðar."
      />
      <Card className="space-y-5">
        <Field label="Lampi" icon={Lightbulb}>
          <input
            value={state.fixture}
            onChange={(e) => set({ fixture: e.target.value })}
            placeholder="t.d. Lumii SwitchBlade 150W"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {LIGHT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => set({ fixture: preset })}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm text-left transition-all',
                state.fixture === preset
                  ? 'bg-moss-800/60 border-moss-400 text-cream-50'
                  : 'bg-moss-900/30 border-moss-800/40 text-cream-300 hover:border-moss-600',
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </Card>
    </StepWrap>
  );
}

const LIGHT_PRESETS = [
  'Dagsbirta + plöntuljós',
  'Lumii SwitchBlade 150W',
  'Mars Hydro TSW2000 300W',
  'Lumatek Attis Pro 200W',
  'Annað / engin LED',
];

function StepVarieties({
  state,
  set,
}: {
  state: WizardState;
  set: (patch: Partial<WizardState>) => void;
}) {
  const loc = LOCATIONS.find((l) => l.key === state.locationKey)!;
  const suggested = useMemo(() => suggestForLocation(state.locationKey), [state.locationKey]);

  const filtered = useMemo(() => {
    const noPepperFilter =
      state.filterMother === 'all' && state.filterColor === 'all' && state.shuTier === 'all';
    return suggested.filter((v) => {
      if (!isPepper(v)) return noPepperFilter;
      if (state.filterMother !== 'all' && v.motherSpecies !== state.filterMother) return false;
      if (state.filterColor !== 'all' && v.color !== state.filterColor) return false;
      const tier = SHU_TIERS.find((t) => t.id === state.shuTier)!;
      if (!(v.shu >= tier.min && v.shu <= tier.max)) return false;
      return true;
    });
  }, [suggested, state.filterMother, state.filterColor, state.shuTier]);

  const availableMothers = useMemo(
    () => Array.from(new Set(suggested.filter(isPepper).map((v) => v.motherSpecies))),
    [suggested],
  );
  const availableColors = useMemo(
    () => Array.from(new Set(suggested.filter(isPepper).map((v) => v.color))),
    [suggested],
  );

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

function FilterRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof Leaf;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-cream-400/70 mb-1.5">
        {Icon && <Icon size={11} />}
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
        active
          ? 'bg-moss-500 border-moss-400 text-cream-50'
          : 'bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600',
      )}
    >
      {swatch && (
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: swatch,
            border: '1px solid rgba(255,255,255,.18)',
          }}
        />
      )}
      {children}
    </button>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof Sprout;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm text-cream-200 font-medium mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-moss-300" />}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl bg-moss-950/60 border border-moss-800 px-4 py-2.5 text-cream-50 placeholder:text-cream-400/40 focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-400/20 transition-colors';

function NumberInput({
  value,
  onChange,
  label,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      {label && (
        <span className="absolute -top-2 left-3 text-[10px] uppercase tracking-wider text-cream-400/70 bg-moss-900 px-1.5">
          {label}
        </span>
      )}
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(',', '.'))}
        className={cn(inputCls, suffix && 'pr-10')}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400/60 text-sm pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
