import { MapPin, Sprout, Thermometer } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { StepWrap, StepHeader, Field, NumberInput } from './components';
import { inputCls } from './styles';
import type { WizardState } from './useSetupState';

export function SpaceStep({
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
          <div
            className={cn(
              'grid gap-2',
              outdoor ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3',
            )}
          >
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
