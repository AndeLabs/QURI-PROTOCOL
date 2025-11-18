/**
 * Design System - Framer Motion Presets
 * Reusable animation variants for consistent micro-interactions
 * Based on museum design research and luxury psychology
 */

import { Variants, Transition } from 'framer-motion';

/**
 * Timing Functions
 * Custom easing curves for premium feel
 */
export const easings = {
  // Smooth and elegant (recommended for most animations)
  smooth: [0.43, 0.13, 0.23, 0.96],

  // Luxury feel (slow start, smooth end)
  luxury: [0.22, 0.61, 0.36, 1],

  // Bouncy premium (subtle bounce for interactive elements)
  bouncy: [0.68, -0.55, 0.265, 1.55],

  // Sharp and precise (for quick interactions)
  sharp: [0.4, 0, 0.2, 1],

  // Museum pace (very slow and deliberate)
  museum: [0.19, 1, 0.22, 1],
} as const;

/**
 * Durations
 * Based on research: 200-300ms for micro-interactions
 */
export const durations = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
  slowest: 1,
  museum: 1.2, // Extra slow for luxury feel
} as const;

/**
 * Default Transition
 * Premium smooth transition for most animations
 */
export const defaultTransition: Transition = {
  duration: durations.normal,
  ease: easings.smooth,
};

/**
 * Spring Transition
 * For bouncy, interactive elements (buttons, cards)
 */
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

/**
 * Museum Transition
 * Slow, elegant transition for premium feel
 */
export const museumTransition: Transition = {
  duration: durations.museum,
  ease: easings.museum,
};

/**
 * FADE ANIMATIONS
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: defaultTransition,
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: defaultTransition,
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: defaultTransition,
  },
};

/**
 * SCALE ANIMATIONS
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
};

export const scaleInBounce: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      ...springTransition,
      stiffness: 400,
      damping: 25,
    },
  },
};

/**
 * SLIDE ANIMATIONS
 */
export const slideInUp: Variants = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: defaultTransition,
  },
};

export const slideInDown: Variants = {
  hidden: { y: '-100%' },
  visible: {
    y: 0,
    transition: defaultTransition,
  },
};

export const slideInLeft: Variants = {
  hidden: { x: '-100%' },
  visible: {
    x: 0,
    transition: defaultTransition,
  },
};

export const slideInRight: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: defaultTransition,
  },
};

/**
 * STAGGER ANIMATIONS
 * For lists and grids - creates cascading effect
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // 100ms delay between children
      delayChildren: 0.2, // Wait 200ms before starting
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

/**
 * HOVER ANIMATIONS
 * Micro-interactions for buttons and cards
 */
export const hoverScale: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: {
      duration: durations.fast,
      ease: easings.smooth,
    },
  },
};

export const hoverLift: Variants = {
  rest: { y: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  hover: {
    y: -4,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    transition: {
      duration: durations.fast,
      ease: easings.smooth,
    },
  },
};

export const hoverGlow: Variants = {
  rest: {
    boxShadow: '0 0 0 0 rgba(212, 175, 55, 0)',
  },
  hover: {
    boxShadow: '0 0 20px 0 rgba(212, 175, 55, 0.3)',
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    },
  },
};

/**
 * 3D TILT EFFECT
 * Premium card effect that follows mouse
 */
export const tiltCard = {
  rest: {
    rotateX: 0,
    rotateY: 0,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    },
  },
};

/**
 * MAGNETIC EFFECT
 * Button/Card follows cursor within bounds
 */
export const magneticHover = {
  transition: {
    type: 'spring',
    stiffness: 150,
    damping: 15,
  },
};

/**
 * SHIMMER EFFECT
 * Loading/Premium highlight animation
 */
export const shimmer: Variants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 2,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

/**
 * PAGE TRANSITIONS
 */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.slow,
      ease: easings.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: durations.fast,
      ease: easings.sharp,
    },
  },
};

export const pageSlideTransition: Variants = {
  hidden: { opacity: 0, x: -100 },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.slow,
      ease: easings.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: {
      duration: durations.fast,
      ease: easings.sharp,
    },
  },
};

/**
 * PARALLAX SCROLLING
 * For hero sections and immersive experiences
 */
export const parallaxSlow = {
  initial: { y: 0 },
  animate: (scrollY: number) => ({
    y: scrollY * 0.5, // Moves 50% of scroll speed
  }),
};

export const parallaxMedium = {
  initial: { y: 0 },
  animate: (scrollY: number) => ({
    y: scrollY * 0.3, // Moves 30% of scroll speed
  }),
};

export const parallaxFast = {
  initial: { y: 0 },
  animate: (scrollY: number) => ({
    y: scrollY * 0.1, // Moves 10% of scroll speed
  }),
};

/**
 * ACCORDION/COLLAPSE
 */
export const accordion: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: easings.sharp,
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    },
  },
};

/**
 * MODAL/DIALOG
 */
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: durations.fast,
    },
  },
};

export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    },
  },
};

/**
 * LOADING ANIMATIONS
 */
export const pulseAnimation: Variants = {
  initial: { opacity: 0.6, scale: 1 },
  animate: {
    opacity: 1,
    scale: 1.02,
    transition: {
      duration: durations.slow,
      ease: easings.smooth,
      repeat: Infinity,
      repeatType: 'reverse',
    },
  },
};

export const spinAnimation: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

/**
 * LUXURY ENTRANCE
 * Premium entrance animation for special elements
 */
export const luxuryEntrance: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.museum,
      ease: easings.luxury,
    },
  },
};

/**
 * MUSEUM CARD ENTRANCE
 * Slow, elegant card reveal
 */
export const museumCardEntrance: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.museum,
      ease: easings.museum,
    },
  },
};

/**
 * UTILITIES
 */

/**
 * Reduced Motion Utility
 * Respect user's motion preferences
 */
export const getReducedMotionVariants = (variants: Variants): Variants => {
  const reducedVariants: Variants = {};

  Object.keys(variants).forEach((key) => {
    const variant = variants[key];
    if (typeof variant === 'object') {
      reducedVariants[key] = {
        ...variant,
        transition: { duration: 0 },
      };
    }
  });

  return reducedVariants;
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
