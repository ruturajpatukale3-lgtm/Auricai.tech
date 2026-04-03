/**
 * Framer Motion animation variants and spring configs
 * All animations use spring physics for natural feel
 * GPU-accelerated (transform + opacity only)
 */

import type { Variants, Transition } from "framer-motion";

/* ═══ SPRING CONFIGS ═══ */
export const springSmooth: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
};

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
};

export const springMagnetic: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 20,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 150,
  damping: 15,
};

export const springGentle: Transition = {
  type: "spring",
  stiffness: 80,
  damping: 20,
};

/* ═══ FADE UP (scroll reveal default) ═══ */
export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springSmooth,
  },
};

/* ═══ FADE UP WITH CUSTOM DELAY ═══ */
export const fadeUpDelay = (delay: number): Variants => ({
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...springSmooth,
      delay: delay / 1000,
    },
  },
});

/* ═══ SCALE FADE ═══ */
export const scaleFade: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springSmooth,
  },
};

/* ═══ STAGGER CONTAINER ═══ */
export const staggerContainer = (delayMs = 50): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: delayMs / 1000,
    },
  },
});

/* ═══ STAGGER ITEM ═══ */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springSmooth,
  },
};

/* ═══ HERO SEQUENCE ═══ */
export const heroSequence = {
  badge: fadeUpDelay(0),
  headline: fadeUpDelay(100),
  subheadline: fadeUpDelay(200),
  cta: fadeUpDelay(300),
  social: fadeUpDelay(400),
  visual: fadeUpDelay(500),
};

/* ═══ TAB CONTENT ═══ */
export const tabContent: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
    },
  },
};

/* ═══ CARD HOVER ═══ */
export const cardHover = {
  rest: {
    y: 0,
    transition: springSmooth,
  },
  hover: {
    y: -4,
    transition: springSnappy,
  },
};

/* ═══ NAVBAR SCROLL ═══ */
export const navbarVariants: Variants = {
  top: {
    backgroundColor: "rgba(0, 0, 0, 0)",
    backdropFilter: "blur(0px)",
    borderBottomColor: "rgba(255, 255, 255, 0)",
  },
  scrolled: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(24px)",
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
};

/* ═══ VIEWPORT CONFIG ═══ */
export const scrollTrigger = {
  once: true,
  amount: 0.1,
};
