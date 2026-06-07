import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  db,
  newId,
  setOnboardingComplete,
  type GrowPhase,
  type PlantCategory,
} from '@/lib/db';
import { BUILT_IN_VARIETIES, type Variety } from '@/lib/varieties';
import { LOCATIONS, getLocation, type LocationKey } from '@/lib/locations';
import { syncManager } from '@/lib/sync';
import type { MotherSpecies, PepperColor } from '@/lib/varieties';
import type { ShuTier } from '@/lib/varietyFilter';

/**
 * Allt ástand og verklag SetupWizard (4.4 — dregið út óbreytt úr
 * SetupWizard.tsx). Skrefin sjálf eru hrein framsetning sem fá `state`/`set`.
 */

export const TOTAL_STEPS = 4;

export interface WizardState {
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

function parseNum(v: string): number | undefined {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

export function useSetupState(onComplete: () => void) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<WizardState>(() => {
    // getLocation hefur innbyggt fallback (4.3: engin non-null fullyrðing).
    const defaults = getLocation('shower').defaults;
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

  const set = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));

  // Útiræktun (garður): sleppum LED-skrefinu og sýnum árstíðayfirlit í staðinn.
  const outdoor =
    LOCATIONS.find((l) => l.key === state.locationKey)?.environment === 'outdoor';
  // Véritable: innbyggt LED — sleppum lampaskrefinu og sýnum upplýsingaskref í staðinn.
  const veritable = state.locationKey === 'veritable';

  function pickLocation(key: LocationKey) {
    const cat = getLocation(key);
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

  return {
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
  };
}
