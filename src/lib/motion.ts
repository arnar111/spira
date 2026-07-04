/**
 * Sameiginlegir hreyfifastar (5.x) — EIN uppspretta fyrir easing, tímalengdir
 * og endurnýtt variants svo allar hreyfingar í appinu tali sama mál.
 * Áður var einkennis-easingið [0.16,1,0.3,1] afritað í Modal/Lightbox/Toast
 * og síðufölnun harðkóðuð í ~12 skrám. Nýjar míkró-hreyfingar eiga að flytja
 * inn héðan í stað þess að skrifa eigin tölur.
 *
 * Athugið: <MotionConfig reducedMotion="user"> í App.tsx sér um að slökkva á
 * transform-hreyfingum fyrir notendur með prefers-reduced-motion — variants
 * hér þurfa því ekki eigin varnir.
 */

import type { Transition, Variants } from 'framer-motion';

/** Einkennis-easing appsins (ease-out-quint-ætt) — notað í Modal/Lightbox/Toast. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Staðlaðar tímalengdir (sek). */
export const DUR = {
  /** Bakgrunnsfölnun yfirlags. */
  backdrop: 0.18,
  /** Yfirlagsflötur rennur inn. */
  panel: 0.22,
  /** Síðuinnihald fölnar inn. */
  page: 0.3,
  /** Hægari hetju-innkoma (Heim/Rós). */
  hero: 0.4,
} as const;

/** Gormur fyrir „popp" (sama og GrowingPlant notar). */
export const SPRING_POP: Transition = { type: 'spring', stiffness: 180, damping: 14 };

/** Mjúkur gormur fyrir stærri fleti (blöð, spjöld). */
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 260, damping: 26 };

/** Síðufölnun — `initial`/`animate` beint á motion.div síðu. */
export const pageFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: DUR.page },
} as const;

/** Foreldri sem raðleysir börnin sín inn (listar, risti). */
export const listStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

/** Barn í raðleystum lista — rís örlítið og fölnar inn. */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};

/** Lítil innkoma fyrir staka fleti (kort, reitir). */
export const riseIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DUR.panel, ease: EASE_OUT },
} as const;

/** Samræmd snertisvörun — whileTap á gagnvirk kort/reiti. */
export const PRESS_TAP = { scale: 0.97 } as const;
