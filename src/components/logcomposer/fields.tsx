import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { LogField } from '@/lib/logSchema';
import { inputClass } from './shared';

/** Fjöldi aukastafa í skrefi — svo 0.1+0.2 verði ekki 0.30000000000000004. */
function stepDecimals(step: number): number {
  const s = String(step);
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
}

interface FieldInputProps {
  field: LogField;
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * Tölureitur með −/+ þrepahnöppum (5.x) — eitt tapp í stað lyklaborðs fyrir
 * algengustu gildin (t.d. vökvun í 50 ml skrefum). Beinn innsláttur virkar
 * áfram; þrepin klemmast við min/max reitsins.
 */
export function NumberStepperField({ field, value, onChange, inputRef }: FieldInputProps) {
  const step = field.step ?? 1;
  const decimals = stepDecimals(step);

  function nudge(dir: 1 | -1) {
    const current = value.trim() === '' ? undefined : Number(value);
    let next: number;
    if (current === undefined || !Number.isFinite(current)) {
      // Tómt: fyrsta tapp byrjar á lágmarkinu (eða 0) + skref í plús-átt.
      next = dir === 1 ? (field.min ?? 0) + step : (field.min ?? 0);
    } else {
      next = current + dir * step;
    }
    if (field.min !== undefined) next = Math.max(field.min, next);
    if (field.max !== undefined) next = Math.min(field.max, next);
    onChange(next.toFixed(decimals));
  }

  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-stretch gap-1.5">
        <StepButton dir={-1} label={`${field.label} — minnka`} onClick={() => nudge(-1)} />
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={value}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(inputClass, 'text-center', field.unit ? 'pr-10' : undefined)}
          />
          {field.unit && (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-cream-400/50">
              {field.unit}
            </span>
          )}
        </div>
        <StepButton dir={1} label={`${field.label} — auka`} onClick={() => nudge(1)} />
      </div>
    </div>
  );
}

function StepButton({
  dir,
  label,
  onClick,
}: {
  dir: 1 | -1;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="shrink-0 w-9 rounded-xl border border-moss-800 bg-moss-900/50 text-cream-200 flex items-center justify-center transition-all duration-150 hover:border-moss-500 active:scale-95"
    >
      {dir === 1 ? <Plus size={14} /> : <Minus size={14} />}
    </button>
  );
}

/**
 * Valreitur sem flögur (5.x) — valkostir liggja sýnilegir í stað þess að fela
 * sig í falllista; eitt tapp velur, tapp á valda flögu afvelur.
 */
export function ChipSelectField({ field, value, onChange }: Omit<FieldInputProps, 'inputRef'>) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={field.label}>
        {(field.options ?? []).map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? '' : o.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition-all duration-150 active:scale-95',
                active
                  ? 'bg-moss-600 border-moss-400 text-cream-50'
                  : 'bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TextFieldInput({ field, value, onChange, inputRef }: FieldInputProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function FieldLabel({ field }: { field: LogField }) {
  return (
    <label className="text-[11px] text-cream-300/70 mb-1 block">
      {field.label}
      {field.unit ? <span className="text-cream-400/50"> ({field.unit})</span> : null}
    </label>
  );
}

/** Dreifari: réttur reitur eftir tegund sviðs. */
export function FieldInput(props: FieldInputProps) {
  if (props.field.kind === 'number') return <NumberStepperField {...props} />;
  if (props.field.kind === 'select') return <ChipSelectField {...props} />;
  return <TextFieldInput {...props} />;
}
