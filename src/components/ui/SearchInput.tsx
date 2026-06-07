import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Skýritexti í reitnum (placeholder). */
  placeholder?: string;
  /** Aðgengisnafn reitsins — sjálfgefið sama og placeholder. */
  'aria-label'?: string;
  className?: string;
}

/**
 * Samnýtt leitarreitur (1.3) — leitartákn, hreinsunarhnappur og hönnunartóka
 * sömu og önnur form. Notað í Plöntum, Ræktunum, Safni og GrowDetail.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Leita…',
  className,
  'aria-label': ariaLabel,
}: SearchInputProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        color="rgba(231,217,168,.45)"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="w-full rounded-xl bg-moss-950/60 border border-moss-800 pl-9 pr-9 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400 placeholder:text-cream-400/40"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Hreinsa leit"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cream-400/50 hover:text-cream-100 transition-colors"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

/**
 * Samræmd „ekkert fannst" staða (1.3) — aðgreind frá tómri stöðu („engin gögn
 * enn"). Notuð þegar leit/síur skila engu en gögn eru til.
 */
export function NoResults({ message = 'Ekkert fannst' }: { message?: string }) {
  return (
    <div className="text-cream-300/60 text-sm border border-dashed border-moss-800/40 rounded-2xl p-6 text-center">
      {message}
    </div>
  );
}
