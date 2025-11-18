'use client';

/**
 * Page Transition Wrapper
 * Provides smooth transitions between pages
 * Supports reduced motion preferences
 */

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import {
  pageTransition,
  pageSlideTransition,
  prefersReducedMotion,
} from '@/design-system/motion/presets';

interface PageTransitionProps {
  children: ReactNode;
  variant?: 'fade' | 'slide';
  className?: string;
}

export function PageTransition({
  children,
  variant = 'fade',
  className = '',
}: PageTransitionProps) {
  const pathname = usePathname();
  const reducedMotion = prefersReducedMotion();

  // Select transition variant
  const transitionVariant = variant === 'slide' ? pageSlideTransition : pageTransition;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        className={className}
        initial={reducedMotion ? undefined : 'hidden'}
        animate={reducedMotion ? undefined : 'enter'}
        exit={reducedMotion ? undefined : 'exit'}
        variants={reducedMotion ? undefined : transitionVariant}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Simple fade wrapper for components
 */
export function FadeIn({ children, className = '', delay = 0 }: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : {
        duration: 0.3,
        delay,
        ease: [0.43, 0.13, 0.23, 0.96],
      }}
    >
      {children}
    </motion.div>
  );
}
