import type { CSSProperties, ReactNode } from 'react';

interface HeroCardProps {
  /** Innihald spjaldsins (merki, titill, fasaslá o.s.frv.). */
  children: ReactNode;
  /** Stór mynd/tákn sem situr absolút í efra hægra horni (t.d. PlantGlyph). */
  glyph?: ReactNode;
  /** Hægri-bólstrun til að rýma fyrir glyph (sjálfgefið 120 eins og í GrowDetail). */
  glyphInset?: number;
  style?: CSSProperties;
}

/**
 * Glerspjald með absolút-staðsettu tákni í horninu (áður „hero" blokkin í
 * GrowDetail.tsx). Útlit fært óbreytt — aðeins innihald + glyph eru breytur.
 */
export function HeroCard({ children, glyph, glyphInset = 120, style }: HeroCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 22,
        overflow: 'hidden',
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.45)',
        backdropFilter: 'blur(20px) saturate(160%)',
        padding: 18,
        paddingRight: glyph ? glyphInset : 18,
        ...style,
      }}
    >
      {glyph && (
        <div style={{ position: 'absolute', right: -8, top: -4 }}>{glyph}</div>
      )}
      {children}
    </div>
  );
}
