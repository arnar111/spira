import { useId, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { SPRING_SOFT } from '@/lib/motion';

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

/**
 * Flipastöng með rennandi virkni-vísi: virki bakgrunnurinn er deilt
 * motion-lag (layoutId) sem líður milli flipa í stað þess að hoppa.
 * layoutId þarf að vera einkvæmt per Tabs-tilvik (useId) svo tvær
 * flipastangir á sömu síðu deili ekki vísinum.
 */
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
  const indicatorId = useId();

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
              'relative flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              i === active ? 'text-cream-50' : 'text-cream-300 hover:text-cream-100',
            )}
          >
            {i === active && (
              <motion.span
                layoutId={indicatorId}
                transition={SPRING_SOFT}
                className="absolute inset-0 rounded-xl bg-moss-800/80 shadow"
                aria-hidden
              />
            )}
            <span className="relative z-[1] flex items-center gap-1.5">{t}</span>
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
            position: 'relative',
            flex: fullWidth ? 1 : undefined,
            padding: '6px 14px',
            borderRadius: 999,
            border: 'none',
            background: 'transparent',
            color: i === active ? '#fdfbf6' : 'rgba(231,217,168,.7)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'color .18s ease',
          }}
        >
          {i === active && (
            <motion.span
              layoutId={indicatorId}
              transition={SPRING_SOFT}
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 999,
                background: 'var(--moss-600)',
              }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>{t}</span>
        </button>
      ))}
    </div>
  );
}
