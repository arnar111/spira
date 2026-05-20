import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  Leaf,
  Lightbulb,
  MapPin,
  Sprout,
  Thermometer,
} from 'lucide-react';
import { GrowingPlant } from '@/components/GrowingPlant';
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
import { BUILT_IN_VARIETIES } from '@/lib/varieties';

interface SetupWizardProps {
  onComplete: () => void;
}

interface WizardState {
  category: PlantCategory;
  growName: string;
  location: string;
  spaceWidthCm: string;
  spaceDepthCm: string;
  spaceHeightCm: string;
  targetTempC: string;
  fixture: string;
  varietyIds: string[];
}

const TOTAL_STEPS = 4;

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<WizardState>({
    category: 'pepper',
    growName: 'Sturtu-piparar',
    location: 'Sturtuklefi',
    spaceWidthCm: '80',
    spaceDepthCm: '80',
    spaceHeightCm: '190',
    targetTempC: '19',
    fixture: 'Lumii SwitchBlade 150W',
    varietyIds: [],
  });

  const set = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));

  const canAdvance = useMemo(() => {
    if (step === 0) return !!state.category;
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
      await db.grows.add({
        id: growId,
        name: state.growName.trim(),
        category: state.category,
        location: state.location.trim(),
        startDate: now,
        fixture: state.fixture.trim() || undefined,
        spaceWidthCm: parseNum(state.spaceWidthCm),
        spaceDepthCm: parseNum(state.spaceDepthCm),
        spaceHeightCm: parseNum(state.spaceHeightCm),
        targetTempC: parseNum(state.targetTempC),
        lightOnHours: 18,
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
          currentPhase: 'planning' as GrowPhase,
          archived: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      await setOnboardingComplete(true);
      onComplete();
      navigate('/home', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  const stage: 0 | 1 | 2 | 3 = (Math.min(step, 3) as 0 | 1 | 2 | 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col lg:grid lg:grid-cols-[1fr_minmax(0,520px)_1fr]"
    >
      {/* Left visual column (desktop only) */}
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

      {/* Center content */}
      <div className="flex flex-col px-5 sm:px-8 pb-6 lg:pb-12 min-h-screen pt-safe-wizard">
        {/* Progress + back */}
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

        {/* Mobile plant preview */}
        <div className="flex lg:hidden justify-center mb-2">
          <motion.div
            key={`plant-mobile-${stage}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <GrowingPlant size={180} stage={stage} />
          </motion.div>
        </div>

        {/* Steps */}
        <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepCategory
                key="step-0"
                value={state.category}
                onChange={(category) => set({ category })}
              />
            )}
            {step === 1 && (
              <StepSpace
                key="step-1"
                state={state}
                set={set}
              />
            )}
            {step === 2 && (
              <StepLight
                key="step-2"
                state={state}
                set={set}
              />
            )}
            {step === 3 && (
              <StepVarieties
                key="step-3"
                selected={state.varietyIds}
                onToggle={(id) =>
                  set({
                    varietyIds: state.varietyIds.includes(id)
                      ? state.varietyIds.filter((v) => v !== id)
                      : [...state.varietyIds, id],
                  })
                }
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
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

      {/* Right spacer for grid balance */}
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

function StepCategory({
  value,
  onChange,
}: {
  value: PlantCategory;
  onChange: (c: PlantCategory) => void;
}) {
  const options: {
    id: PlantCategory;
    label: string;
    icon: typeof Flame;
    desc: string;
    available: boolean;
  }[] = [
    {
      id: 'pepper',
      label: 'Pipur',
      icon: Flame,
      desc: 'Habanero, Reaper, 7 Pot, Bhut Jolokia og fleira',
      available: true,
    },
    {
      id: 'tomato',
      label: 'Tómatar',
      icon: Sprout,
      desc: 'Microdwarf og dvergafbrigði fyrir innipláss',
      available: false,
    },
    {
      id: 'herb',
      label: 'Krydd',
      icon: Leaf,
      desc: 'Basilika, mynta, kóríander og fleiri',
      available: false,
    },
  ];

  return (
    <StepWrap>
      <StepHeader
        eyebrow="Velkomin/n"
        title="Hvað viltu rækta?"
        hint="Spíra er stillt fyrir piparræktun núna. Fleiri flokkar bætast við."
      />
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={!opt.available}
            onClick={() => onChange(opt.id)}
            className={cn(
              'w-full text-left flex items-center gap-4 rounded-2xl p-4 transition-all',
              'border',
              opt.available
                ? value === opt.id
                  ? 'bg-moss-800/60 border-moss-400 shadow-lg shadow-moss-900/30'
                  : 'bg-moss-900/40 border-moss-800/40 hover:border-moss-600 hover:bg-moss-900/60'
                : 'bg-moss-900/20 border-moss-900/40 opacity-50 cursor-not-allowed',
            )}
          >
            <div
              className={cn(
                'shrink-0 rounded-xl p-3 transition-colors',
                value === opt.id && opt.available
                  ? 'bg-moss-500 text-cream-50'
                  : 'bg-moss-800/60 text-moss-300',
              )}
            >
              <opt.icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="heading text-lg font-semibold text-cream-50">{opt.label}</span>
                {!opt.available && (
                  <span className="text-[10px] uppercase tracking-wider text-terracotta-300 bg-terracotta-900/40 px-2 py-0.5 rounded-full">
                    brátt
                  </span>
                )}
              </div>
              <p className="text-sm text-cream-300/70 mt-0.5">{opt.desc}</p>
            </div>
            {value === opt.id && opt.available && (
              <Check className="text-moss-300" size={20} />
            )}
          </button>
        ))}
      </div>
    </StepWrap>
  );
}

function StepSpace({
  state,
  set,
}: {
  state: WizardState;
  set: (patch: Partial<WizardState>) => void;
}) {
  return (
    <StepWrap>
      <StepHeader
        eyebrow="Rýmið þitt"
        title="Hvar ræktarðu?"
        hint="Þetta hjálpar Spíru að áætla loftrás, ljós og fjölda plantna."
      />
      <Card className="space-y-5">
        <Field label="Heiti ræktunar" icon={Sprout}>
          <input
            value={state.growName}
            onChange={(e) => set({ growName: e.target.value })}
            placeholder="t.d. Sturtu-piparar"
            className={inputCls}
          />
        </Field>
        <Field label="Staðsetning" icon={MapPin}>
          <input
            value={state.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="t.d. Sturtuklefi, baðherbergi"
            className={inputCls}
          />
        </Field>
        <div>
          <label className="text-sm text-cream-200 font-medium mb-2 block">Stærð rýmis</label>
          <div className="grid grid-cols-3 gap-2">
            <NumberInput
              value={state.spaceWidthCm}
              onChange={(v) => set({ spaceWidthCm: v })}
              label="Breidd"
              suffix="cm"
            />
            <NumberInput
              value={state.spaceDepthCm}
              onChange={(v) => set({ spaceDepthCm: v })}
              label="Dýpt"
              suffix="cm"
            />
            <NumberInput
              value={state.spaceHeightCm}
              onChange={(v) => set({ spaceHeightCm: v })}
              label="Hæð"
              suffix="cm"
            />
          </div>
        </div>
        <Field label="Markhitastig" icon={Thermometer}>
          <NumberInput
            value={state.targetTempC}
            onChange={(v) => set({ targetTempC: v })}
            suffix="°C"
          />
        </Field>
      </Card>
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
        hint="Þetta er valkvætt — þú getur skilið eftir tómt og bætt við síðar."
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
  'Lumii SwitchBlade 150W',
  'Mars Hydro TSW2000 300W',
  'Lumatek Attis Pro 200W',
  'Annað / engin LED',
];

function StepVarieties({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const peppers = BUILT_IN_VARIETIES.filter((v) => v.category === 'pepper');
  return (
    <StepWrap>
      <StepHeader
        eyebrow="Plöntur"
        title="Veldu afbrigði"
        hint="Veldu eitt eða fleiri — þú getur bætt við og breytt síðar."
      />
      <div className="space-y-2.5">
        {peppers.map((v) => {
          const isSelected = selected.includes(v.id);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onToggle(v.id)}
              className={cn(
                'w-full text-left flex items-start gap-4 rounded-2xl p-4 transition-all border',
                isSelected
                  ? 'bg-moss-800/60 border-moss-400 shadow-lg shadow-moss-900/30'
                  : 'bg-moss-900/40 border-moss-800/40 hover:border-moss-600 hover:bg-moss-900/60',
              )}
            >
              <div
                className={cn(
                  'shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
                  isSelected
                    ? 'bg-moss-400 border-moss-400'
                    : 'border-moss-600 bg-transparent',
                )}
              >
                {isSelected && <Check size={14} className="text-moss-950" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="heading text-base font-semibold text-cream-50">
                    {v.commonName}
                  </span>
                  {v.shu && (
                    <span className="text-[10px] uppercase tracking-wider text-capsicum-400 bg-capsicum-600/20 px-2 py-0.5 rounded-full">
                      {formatShu(v.shu)} SHU
                    </span>
                  )}
                </div>
                {v.flavor && (
                  <p className="text-sm text-cream-300/70 mt-1">{v.flavor}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </StepWrap>
  );
}

function formatShu(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return `${n}`;
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
