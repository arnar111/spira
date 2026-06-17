import { motion } from 'framer-motion';
import type { Leaf, Sprout } from 'lucide-react';
import { cn } from '@/lib/cn';
import { inputCls } from './styles';

/**
 * Samnýttir framsetningarhlutar SetupWizard (4.4 — dregnir út óbreyttir úr
 * upprunalega SetupWizard.tsx svo öll skref noti sömu útlitseiningar).
 */

export function StepWrap({ children }: { children: React.ReactNode }) {
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

export function StepHeader({
  eyebrow,
  title,
  hint,
  why,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  /** Skýrir AF HVERJU þetta skref birtist (1.4) — út frá vali notandans. */
  why?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-moss-300 mb-2">{eyebrow}</p>
      <h2 className="heading text-3xl sm:text-4xl font-semibold text-cream-50 mb-2">{title}</h2>
      {why && <p className="text-[12px] text-moss-300/90 mb-1.5">{why}</p>}
      {hint && <p className="text-cream-300/70 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function FilterRow({
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

export function Chip({
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
          ? 'bg-moss-600 border-moss-400 text-cream-50'
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

export function Field({
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

export function NumberInput({
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
