import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { GrowingPlant } from '@/components/GrowingPlant';
import { Button } from '@/components/ui/Button';
import { TOTAL_STEPS, useSetupState } from './setup/useSetupState';
import { LocationStep } from './setup/LocationStep';
import { SpaceStep } from './setup/SpaceStep';
import { LightSeasonStep } from './setup/LightSeasonStep';
import { VarietiesStep } from './setup/VarietiesStep';

interface SetupWizardProps {
  onComplete: () => void;
}

/**
 * Þunnt skel sem raðar upp skrefum onboarding-flæðisins (4.4 — skipt í
 * pages/setup/). Allt ástand býr í useSetupState; skrefin eru hrein framsetning.
 */
export function SetupWizard({ onComplete }: SetupWizardProps) {
  const {
    navigate,
    step,
    setStep,
    submitting,
    state,
    set,
    outdoor,
    veritable,
    pickLocation,
    canAdvance,
    handleFinish,
  } = useSetupState(onComplete);

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
              <LocationStep
                key="step-0"
                value={state.locationKey}
                onChange={pickLocation}
              />
            )}
            {step === 1 && (
              <SpaceStep key="step-1" state={state} set={set} outdoor={outdoor} />
            )}
            {step === 2 && (
              <LightSeasonStep
                key="step-2"
                state={state}
                set={set}
                outdoor={outdoor}
                veritable={veritable}
              />
            )}
            {step === 3 && <VarietiesStep key="step-3" state={state} set={set} />}
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
