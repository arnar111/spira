import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';

export type CardTone = 'glass' | 'strong' | 'cream' | 'outline' | 'terra';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  tone?: CardTone;
  radius?: number;
  padding?: number;
  style?: CSSProperties;
}

const TONE_STYLES: Record<CardTone, { background: string; border: string; color?: string }> = {
  glass: { background: 'rgba(36,56,39,.5)', border: '1px solid rgba(64,104,67,.4)' },
  strong: { background: 'rgba(36,56,39,.78)', border: '1px solid rgba(64,104,67,.55)' },
  cream: {
    background: 'rgba(253,251,246,0.95)',
    border: '1px solid rgba(36,56,39,.08)',
    color: '#29261b',
  },
  outline: { background: 'transparent', border: '1px dashed rgba(64,104,67,.55)' },
  terra: { background: 'rgba(194,106,77,.14)', border: '1px solid rgba(194,106,77,.32)' },
};

const TONE_SHADOWS: Record<CardTone, string> = {
  glass: '0 1px 0 rgba(253,251,246,.04) inset, 0 8px 24px rgba(0,0,0,.18)',
  strong: '0 1px 0 rgba(253,251,246,.05) inset, 0 12px 28px rgba(0,0,0,.22)',
  cream: '0 1px 0 rgba(255,255,255,.6) inset, 0 4px 14px rgba(40,30,20,.08)',
  outline: 'none',
  terra: '0 1px 0 rgba(253,251,246,.04) inset, 0 8px 24px rgba(0,0,0,.18)',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ tone = 'glass', radius = 22, padding = 18, style, ...rest }, ref) => {
    const t = TONE_STYLES[tone];
    const isBlurred = tone === 'glass' || tone === 'strong';
    return (
      <div
        ref={ref}
        style={{
          borderRadius: radius,
          padding,
          backdropFilter: isBlurred ? 'blur(20px) saturate(160%)' : undefined,
          WebkitBackdropFilter: isBlurred ? 'blur(20px) saturate(160%)' : undefined,
          color: t.color ?? 'var(--cream-100)',
          boxShadow: TONE_SHADOWS[tone],
          background: t.background,
          border: t.border,
          ...style,
        }}
        {...rest}
      />
    );
  },
);
Card.displayName = 'Card';
