/**
 * useClientMotion Hook
 * Safe motion handling for SSR/hydration compatibility
 *
 * This hook solves the common Framer Motion + Next.js hydration mismatch issue
 * where server renders elements with opacity:0 but client tries to animate
 */

import { useState, useEffect } from 'react';
import { prefersReducedMotion } from '@/design-system/motion/presets';

interface UseClientMotionReturn {
  /** Whether the component is mounted (safe for animations) */
  isMounted: boolean;
  /** Whether user prefers reduced motion */
  reducedMotion: boolean;
  /** Whether animations should be enabled */
  shouldAnimate: boolean;
}

/**
 * Hook for safe client-side motion handling
 *
 * @example
 * ```tsx
 * const { shouldAnimate, isMounted } = useClientMotion();
 *
 * return (
 *   <motion.div
 *     initial={shouldAnimate ? { opacity: 0 } : false}
 *     animate={shouldAnimate ? { opacity: 1 } : undefined}
 *   />
 * );
 * ```
 */
export function useClientMotion(): UseClientMotionReturn {
  const [isMounted, setIsMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setReducedMotion(prefersReducedMotion());
  }, []);

  return {
    isMounted,
    reducedMotion,
    shouldAnimate: isMounted && !reducedMotion,
  };
}

/**
 * Get motion props that are safe for SSR
 * Use this to wrap motion props conditionally
 */
export function getMotionProps<T extends object>(
  shouldAnimate: boolean,
  props: T
): Partial<T> {
  return shouldAnimate ? props : {};
}
