import type { ReactNode } from 'react';

interface TaskRowProps {
  icon: ReactNode;
  label: string;
  /** Stutt mónó-tímatexti við hlið merkis (t.d. „eftir 2 daga"). */
  meta?: ReactNode;
  /** Merki/pilla lengst til hægri (kallarinn ræður tóni). */
  badge?: ReactNode;
  note?: ReactNode;
}

/**
 * Viðhaldsverk-lína (áður innfellt í VeritableCard.tsx). Tákn í reit til
 * vinstri, merki + tími + pilla efst, lýsing fyrir neðan. Útlit fært óbreytt.
 */
export function TaskRow({ icon, label, meta, badge, note }: TaskRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-2.5 border bg-moss-900/30 border-moss-800/30">
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(231,217,168,.08)', color: 'var(--cream-300)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-cream-100 text-sm font-medium">{label}</span>
          {meta && <span className="text-[10px] text-cream-400/60 sp-mono">{meta}</span>}
          {badge}
        </div>
        {note && <p className="text-[11.5px] text-cream-300/70 leading-snug mt-0.5">{note}</p>}
      </div>
    </div>
  );
}
