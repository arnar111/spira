import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  FlaskConical,
  Stethoscope,
  Target,
  Wind,
} from 'lucide-react';
import type { StrawberryVariety, TomatoVariety } from '@/lib/varieties';

/**
 * Renders a crop variety's structured care guide — targets, watering,
 * pollination, feeding schedule and troubleshooting — distilled from its sheet.
 * Works for any variety that carries a `care` block (tomatoes, strawberries).
 */
export function CareGuide({ variety }: { variety: TomatoVariety | StrawberryVariety }) {
  const c = variety.care;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12px] leading-relaxed text-cream-300/80">{c.summary}</p>

      <Section icon={<Target size={13} />} title="Markgildi">
        <div className="grid sm:grid-cols-2 gap-1.5">
          {c.targets.map((t) => (
            <div
              key={t.label}
              className="rounded-xl px-3 py-2 border"
              style={{ background: 'rgba(18,31,20,.4)', borderColor: 'rgba(64,104,67,.3)' }}
            >
              <div className="text-[9px] uppercase tracking-[0.16em] text-cream-400/70">
                {t.label}
              </div>
              <div className="text-[12.5px] text-cream-100 font-medium leading-tight mt-0.5">
                {t.value}
              </div>
              {t.hint && <div className="text-[10.5px] text-cream-400/60 mt-0.5">{t.hint}</div>}
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<Droplets size={13} />} title="Vökvun">
        <Bullets items={c.watering} />
      </Section>

      <Section icon={<Wind size={13} />} title="Frjóvgun">
        <Bullets items={c.pollination} />
      </Section>

      <Section icon={<FlaskConical size={13} />} title="Áburðaráætlun">
        <div className="flex flex-col gap-1.5">
          {c.fertilizer.map((f) => (
            <div
              key={f.stage}
              className="rounded-xl px-3 py-2 border"
              style={{ background: 'rgba(18,31,20,.4)', borderColor: 'rgba(64,104,67,.3)' }}
            >
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className="text-[12.5px] text-cream-100 font-medium">{f.stage}</span>
                <span className="sp-mono text-[11px] text-terra-300">{f.npk}</span>
              </div>
              <div className="text-[10.5px] text-cream-400/70 mt-0.5">
                {f.freq} · {f.note}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<Stethoscope size={13} />} title="Bilanaleit">
        <div className="flex flex-col gap-1.5">
          {c.troubleshooting.map((t) => (
            <div key={t.problem} className="text-[11.5px] leading-snug">
              <span className="text-cream-100 font-medium">{t.problem}</span>
              <span className="text-cream-400/60"> — {t.cause}. </span>
              <span className="text-moss-300">{t.fix}.</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid sm:grid-cols-2 gap-3">
        <Section icon={<CheckCircle2 size={13} color="var(--moss-300)" />} title="Eðlilegt">
          <Bullets items={c.normal} tone="moss" />
        </Section>
        <Section icon={<AlertTriangle size={13} color="var(--cap-400)" />} title="Varúð">
          <Bullets items={c.concern} tone="cap" />
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-moss-300 mb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Bullets({ items, tone = 'cream' }: { items: string[]; tone?: 'cream' | 'moss' | 'cap' }) {
  const dot =
    tone === 'moss' ? 'var(--moss-400)' : tone === 'cap' ? 'var(--cap-400)' : 'var(--terra-400)';
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-[11.5px] leading-snug text-cream-300/85">
          <span
            className="shrink-0 mt-[6px]"
            style={{ width: 5, height: 5, borderRadius: 999, background: dot }}
          />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
