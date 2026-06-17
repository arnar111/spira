import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TabsProps {
  /** Einfaldur strengjalisti (upprunalega API-ið — óbreytt). */
  tabs?: string[];
  /**
   * Ríkari flipar með frjálsu innihaldi (t.d. tákn + texti). Notað þegar
   * `variant="segmented"`. Hefur forgang ef bæði `tabs` og `items` eru gefin.
   */
  items?: ReactNode[];
  active: number;
  onChange?: (index: number) => void;
  /** „pill" = upprunalega kúlustangin; „segmented" = breiður reitastíll (Login). */
  variant?: 'pill' | 'segmented';
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Tabs({
  tabs,
  items,
  active,
  onChange,
  variant = 'pill',
  fullWidth = false,
  className,
  style,
}: TabsProps) {
  const entries: ReactNode[] = items ?? tabs ?? [];

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'flex p-1 rounded-2xl bg-moss-950/60 border border-moss-800/40',
          className,
        )}
        style={style}
      >
        {entries.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange?.(i)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
              i === active
                ? 'bg-moss-800/80 text-cream-50 shadow'
                : 'text-cream-300 hover:text-cream-100',
            )}
          >
            {t}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        padding: 4,
        borderRadius: 999,
        background: 'rgba(18,31,20,.6)',
        border: '1px solid rgba(64,104,67,.4)',
        ...style,
      }}
    >
      {entries.map((t, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          style={{
            flex: fullWidth ? 1 : undefined,
            padding: '6px 14px',
            borderRadius: 999,
            border: 'none',
            background: i === active ? 'var(--moss-600)' : 'transparent',
            color: i === active ? '#fdfbf6' : 'rgba(231,217,168,.7)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
