import type { SpringOptions, Variants } from "framer-motion";

// ---------------------------------------------------------------------------
// Spring presets
// ---------------------------------------------------------------------------

type SpringTransition = SpringOptions & { type: "spring" };

export const spring = {
  snappy: { type: "spring" as const, stiffness: 400, damping: 30 },
  smooth: { type: "spring" as const, stiffness: 300, damping: 25 },
  gentle: { type: "spring" as const, stiffness: 200, damping: 20 },
  bounce: { type: "spring" as const, stiffness: 500, damping: 25 },
} satisfies Record<string, SpringTransition>;

// ---------------------------------------------------------------------------
// Variant sets
// ---------------------------------------------------------------------------

/** Staggered container parent */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

/** Individual cards / items entering from below */
export const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
};

/** Simple fade-up for text and headers */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

/** List items with horizontal entry */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 350, damping: 28 },
  },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
};

/** Pills / tags */
export const tagVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 450, damping: 28 },
  },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.12 } },
};

/** Panels sliding in from the right */
export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    x: 40,
    transition: { duration: 0.2 },
  },
};

/** Subtle float for empty states / illustrations */
export const floatVariants: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};

/** Pulse for skeleton loading */
export const skeletonPulseVariants: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the transition unchanged, or `{ duration: 0 }` when the user
 * has requested reduced motion.
 *
 * Usage:
 *   const transition = reducedMotion(spring.snappy, prefersReducedMotion);
 */
export function reducedMotion<T extends object>(
  t: T,
  prefersReduced: boolean,
): T | { duration: 0 } {
  return prefersReduced ? { duration: 0 } : t;
}
