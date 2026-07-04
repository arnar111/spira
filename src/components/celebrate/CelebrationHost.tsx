import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bug,
  Camera,
  Droplet,
  Flower2,
  Leaf,
  Move,
  Scissors,
  ShieldAlert,
  Sparkles,
  Sprout,
  StickyNote,
  Thermometer,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { onCelebrate, type CelebrationKind } from '@/lib/celebrate';
import { EASE_OUT, SPRING_POP } from '@/lib/motion';

/**
 * Fögnuðar-yfirlagið (5.x): stutt, ósnertanlegt hreyfimynstur sem spilast yfir
 * öllu þegar skráningu er lokið — dropar falla við vökvun, frjókorn svífa við
 * frjóvgun, konfettí við uppskeru. Kveikt gegnum lib/celebrate.ts.
 * Virðir prefers-reduced-motion (aðeins látlaus staðfesting án agna) og er
 * aria-hidden — skjálesarar fá sína staðfestingu úr announce().
 */

interface KindConfig {
  icon: LucideIcon;
  label: string;
  accent: string;
  particles: 'drops' | 'pollen' | 'leaves' | 'confetti' | 'sparkles';
}

const DEFAULT_CONFIG: KindConfig = {
  icon: Sparkles,
  label: 'Skráð!',
  accent: 'var(--moss-300)',
  particles: 'sparkles',
};

const KIND_CONFIG: Partial<Record<CelebrationKind, KindConfig>> = {
  water: { icon: Droplet, label: 'Vökvað!', accent: 'var(--moss-200)', particles: 'drops' },
  feed: { icon: Leaf, label: 'Næring gefin!', accent: 'var(--moss-300)', particles: 'leaves' },
  pollinate: { icon: Flower2, label: 'Frjóvgað!', accent: 'var(--cream-400)', particles: 'pollen' },
  harvest: { icon: Sprout, label: 'Uppskera í hús!', accent: 'var(--cap-400)', particles: 'confetti' },
  top: { icon: Sparkles, label: 'Toppað!', accent: 'var(--moss-300)', particles: 'sparkles' },
  prune: { icon: Scissors, label: 'Klippt!', accent: 'var(--moss-300)', particles: 'leaves' },
  transplant: { icon: Move, label: 'Umpottað!', accent: 'var(--terra-300)', particles: 'sparkles' },
  maintenance: { icon: Wrench, label: 'Viðhald skráð!', accent: 'var(--moss-300)', particles: 'sparkles' },
  environment: { icon: Thermometer, label: 'Mæling skráð!', accent: 'var(--cream-300)', particles: 'sparkles' },
  pest: { icon: Bug, label: 'Skráð í dagbók', accent: 'var(--cream-400)', particles: 'sparkles' },
  disease: { icon: ShieldAlert, label: 'Skráð í dagbók', accent: 'var(--cream-400)', particles: 'sparkles' },
  note: { icon: StickyNote, label: 'Nóta vistuð', accent: 'var(--moss-300)', particles: 'sparkles' },
  photo: { icon: Camera, label: 'Mynd vistuð', accent: 'var(--moss-300)', particles: 'sparkles' },
};

const LIFETIME_MS = 1500;

export function CelebrationHost(): JSX.Element | null {
  const [burst, setBurst] = useState<{ kind: CelebrationKind; seq: number } | null>(null);
  const seqRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const off = onCelebrate((kind) => {
      seqRef.current += 1;
      setBurst({ kind, seq: seqRef.current });
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setBurst(null), LIFETIME_MS);
    });
    return () => {
      off();
      window.clearTimeout(timerRef.current);
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {burst && <Burst key={burst.seq} kind={burst.kind} />}
    </AnimatePresence>,
    document.body,
  );
}

function Burst({ kind }: { kind: CelebrationKind }) {
  const reduced = useReducedMotion();
  const cfg = KIND_CONFIG[kind] ?? DEFAULT_CONFIG;
  const Icon = cfg.icon;

  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      {/* Mjúkur ljómi svo fögnuðurinn lesist ofan á hvaða efni sem er */}
      <motion.div
        className="absolute"
        style={{
          width: 340,
          height: 340,
          borderRadius: '50%',
          background:
            'radial-gradient(50% 50% at 50% 50%, rgba(18,31,20,.72), rgba(18,31,20,.35) 55%, transparent 75%)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
      />

      <div className="relative flex flex-col items-center">
        {/* Gára út frá merkinu */}
        {!reduced && (
          <motion.span
            className="absolute top-0 left-1/2"
            style={{
              width: 76,
              height: 76,
              marginLeft: -38,
              borderRadius: '50%',
              border: `2px solid ${cfg.accent}`,
            }}
            initial={{ opacity: 0.7, scale: 0.9 }}
            animate={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.08 }}
          />
        )}

        {/* Agnir á bak við merkið */}
        {!reduced && <Particles variant={cfg.particles} accent={cfg.accent} />}

        <motion.div
          className="w-[76px] h-[76px] rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(36,56,39,.92)',
            border: '1px solid rgba(64,104,67,.65)',
            color: cfg.accent,
            boxShadow: '0 10px 30px rgba(0,0,0,.45)',
          }}
          initial={{ scale: reduced ? 1 : 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduced ? { duration: 0.2 } : SPRING_POP}
        >
          <Icon size={32} />
        </motion.div>

        <motion.div
          className="sp-display mt-3 text-center"
          style={{ fontSize: 17, color: 'var(--cream-50)' }}
          initial={{ opacity: 0, y: reduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.12 }}
        >
          {cfg.label}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* — Agnasett — handstilltar, endurtakanlegar staðsetningar (engin slembni). — */

const DROPS: { x: number; delay: number; size: number }[] = [
  { x: -64, delay: 0.0, size: 13 },
  { x: -44, delay: 0.16, size: 11 },
  { x: -26, delay: 0.05, size: 15 },
  { x: -8, delay: 0.24, size: 12 },
  { x: 10, delay: 0.1, size: 14 },
  { x: 28, delay: 0.28, size: 11 },
  { x: 46, delay: 0.03, size: 13 },
  { x: 64, delay: 0.2, size: 12 },
];

const POLLEN: { x: number; y: number; delay: number; size: number }[] = [
  { x: -58, y: -64, delay: 0.0, size: 5 },
  { x: -38, y: -88, delay: 0.1, size: 4 },
  { x: -20, y: -70, delay: 0.22, size: 6 },
  { x: -4, y: -96, delay: 0.06, size: 4 },
  { x: 14, y: -76, delay: 0.18, size: 5 },
  { x: 34, y: -92, delay: 0.02, size: 4 },
  { x: 52, y: -66, delay: 0.26, size: 6 },
  { x: 66, y: -84, delay: 0.12, size: 4 },
  { x: -70, y: -40, delay: 0.3, size: 4 },
  { x: 72, y: -46, delay: 0.08, size: 5 },
];

const LEAVES: { x: number; drift: number; delay: number; size: number; spin: number }[] = [
  { x: -56, drift: 10, delay: 0.0, size: 14, spin: -38 },
  { x: -30, drift: -8, delay: 0.14, size: 12, spin: 30 },
  { x: -6, drift: 12, delay: 0.05, size: 15, spin: -24 },
  { x: 18, drift: -10, delay: 0.22, size: 12, spin: 40 },
  { x: 42, drift: 8, delay: 0.1, size: 14, spin: -32 },
  { x: 62, drift: -12, delay: 0.26, size: 12, spin: 26 },
];

const CONFETTI_COLORS = [
  'var(--cap-400)',
  'var(--cream-400)',
  'var(--moss-300)',
  'var(--terra-400)',
];

const CONFETTI: { x: number; up: number; delay: number; spin: number; c: number }[] = [
  { x: -96, up: -70, delay: 0.0, spin: 320, c: 0 },
  { x: -72, up: -95, delay: 0.06, spin: -280, c: 1 },
  { x: -50, up: -60, delay: 0.12, spin: 400, c: 2 },
  { x: -28, up: -105, delay: 0.02, spin: -340, c: 3 },
  { x: -8, up: -80, delay: 0.16, spin: 300, c: 1 },
  { x: 12, up: -100, delay: 0.08, spin: -380, c: 0 },
  { x: 32, up: -66, delay: 0.2, spin: 340, c: 2 },
  { x: 54, up: -92, delay: 0.04, spin: -300, c: 3 },
  { x: 76, up: -74, delay: 0.14, spin: 360, c: 0 },
  { x: 98, up: -88, delay: 0.1, spin: -320, c: 2 },
];

const SPARKS: { x: number; y: number; delay: number; size: number }[] = [
  { x: -44, y: -52, delay: 0.05, size: 5 },
  { x: 40, y: -60, delay: 0.12, size: 4 },
  { x: -58, y: -10, delay: 0.2, size: 4 },
  { x: 56, y: -16, delay: 0.0, size: 5 },
  { x: 0, y: -72, delay: 0.16, size: 6 },
];

function Particles({
  variant,
  accent,
}: {
  variant: KindConfig['particles'];
  accent: string;
}): JSX.Element {
  if (variant === 'drops') {
    return (
      <div className="absolute top-[10px] left-1/2">
        {DROPS.map((d, i) => (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: d.x, color: accent }}
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 104, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.85, ease: 'easeIn', delay: d.delay, times: [0, 0.2, 0.7, 1] }}
          >
            <Droplet size={d.size} fill="currentColor" strokeWidth={0} />
          </motion.span>
        ))}
      </div>
    );
  }
  if (variant === 'pollen' || variant === 'sparkles') {
    const dots = variant === 'pollen' ? POLLEN : SPARKS;
    return (
      <div className="absolute top-[38px] left-1/2">
        {dots.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: p.size, height: p.size, background: accent }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.5] }}
            transition={{ duration: 1.05, ease: EASE_OUT, delay: p.delay }}
          />
        ))}
      </div>
    );
  }
  if (variant === 'leaves') {
    return (
      <div className="absolute top-[30px] left-1/2">
        {LEAVES.map((l, i) => (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: l.x, color: accent }}
            initial={{ y: 26, x: 0, rotate: 0, opacity: 0 }}
            animate={{
              y: -78,
              x: [0, l.drift, -l.drift / 2],
              rotate: l.spin,
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: l.delay }}
          >
            <Leaf size={l.size} />
          </motion.span>
        ))}
      </div>
    );
  }
  // confetti
  return (
    <div className="absolute top-[34px] left-1/2">
      {CONFETTI.map((c, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[2px]"
          style={{ width: 6, height: 10, background: CONFETTI_COLORS[c.c] }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: c.x,
            y: [0, c.up, 120],
            rotate: c.spin,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: c.delay, times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
