import { useState } from 'react';
import { Sun, Clock, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import {
  DLI_TARGET_MAX,
  DLI_TARGET_MIN,
  LIGHT_STAGES,
  dli,
  dliVerdict,
  hoursForDli,
  ppfdVerdict,
  type Verdict,
} from '@/lib/light';

const VERDICT_COLOR: Record<Verdict, string> = {
  low: 'var(--cap-400)',
  ok: 'var(--moss-300)',
  high: 'var(--cream-400)',
};
const VERDICT_LABEL: Record<Verdict, string> = {
  low: 'of lítið',
  ok: 'í lagi',
  high: 'ríkulegt',
};

/** Quick presets mapped to typical canopy PPFD (guide Table 10). */
const PRESETS: { label: string; ppfd: number }[] = [
  { label: 'Gluggaljós', ppfd: 300 },
  { label: '150W LED', ppfd: 600 },
  { label: '300W LED', ppfd: 750 },
];

/**
 * Interactive light planner — turns the guide's PPFD/DLI math into a tool so
 * growers can check whether their light is enough without doing the arithmetic.
 */
export function LightPlanner() {
  const [ppfd, setPpfd] = useState(600);
  const [hours, setHours] = useState(14);

  const value = dli(ppfd, hours);
  const verdict = dliVerdict(value);
  const suggestedHours = Math.round(hoursForDli(ppfd, DLI_TARGET_MIN) * 10) / 10;

  return (
    <Card tone="strong" radius={18} padding={16}>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <Eyebrow>Ljósareiknir · DLI</Eyebrow>
          <div className="sp-display" style={{ fontSize: 18, color: 'var(--cream-50)', fontWeight: 500 }}>
            Færðu plöntan nóg ljós?
          </div>
        </div>
      </div>

      {/* DLI result */}
      <div className="flex items-end gap-2 mb-1">
        <span
          className="sp-display"
          style={{ fontSize: 38, fontWeight: 500, color: VERDICT_COLOR[verdict], lineHeight: 1 }}
        >
          {value.toFixed(1)}
        </span>
        <span className="sp-mono text-cream-400/70 mb-1" style={{ fontSize: 12 }}>
          mol/m²/dag · {VERDICT_LABEL[verdict]}
        </span>
      </div>
      <p className="text-[11px] text-cream-300/65 leading-snug mb-4">
        Markmið fyrir aldin: {DLI_TARGET_MIN}–{DLI_TARGET_MAX} mol/m²/dag.{' '}
        {verdict === 'low' && suggestedHours > 0 && suggestedHours <= 24 && (
          <span className="text-cream-200">
            Lengdu í ~{suggestedHours} klst eða auktu styrk til að ná markinu.
          </span>
        )}
        {verdict === 'ok' && <span className="text-moss-300">Frábært — innan kjörbils.</span>}
        {verdict === 'high' && (
          <span className="text-cream-200">Yfir markinu — má lækka styrk eða stytta tíma.</span>
        )}
      </p>

      {/* PPFD slider */}
      <Slider
        icon={<Sun size={13} />}
        label="Ljósstyrkur (PPFD)"
        value={ppfd}
        min={100}
        max={1000}
        step={10}
        suffix=" µmol/m²/s"
        onChange={setPpfd}
      />
      <div className="flex flex-wrap gap-1.5 mt-1.5 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPpfd(p.ppfd)}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600"
          >
            <Lightbulb size={10} /> {p.label}
          </button>
        ))}
      </div>

      {/* Hours slider */}
      <Slider
        icon={<Clock size={13} />}
        label="Ljóstími"
        value={hours}
        min={8}
        max={20}
        step={1}
        suffix=" klst/dag"
        onChange={setHours}
      />

      {/* Per-stage PPFD verdicts */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {LIGHT_STAGES.map((s) => {
          const verd = ppfdVerdict(s, ppfd);
          return (
            <div
              key={s.id}
              className="rounded-xl px-2.5 py-2 border text-center"
              style={{ background: 'rgba(18,31,20,.4)', borderColor: 'rgba(64,104,67,.3)' }}
            >
              <div className="text-[9px] uppercase tracking-[0.14em] text-cream-400/70">{s.label}</div>
              <div className="sp-mono text-[10.5px] text-cream-200 mt-0.5">
                {s.ppfdMin}–{s.ppfdMax}
              </div>
              <div className="text-[10px] font-medium mt-0.5" style={{ color: VERDICT_COLOR[verd] }}>
                {VERDICT_LABEL[verd]}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Slider({
  icon,
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[11px] text-cream-300/80">
          {icon}
          {label}
        </span>
        <span className="sp-mono text-[12px] text-cream-100">
          {value}
          <span className="text-cream-400/60">{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-moss-400"
        style={{ accentColor: 'var(--moss-400)' }}
      />
    </div>
  );
}
