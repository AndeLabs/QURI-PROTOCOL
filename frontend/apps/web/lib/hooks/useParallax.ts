'use client';

import { useState, useEffect, useRef, RefObject } from 'react';

/**
 * Parallax Scrolling Hook
 * Subtle depth effects for museum-grade presentation
 * Very subtle as requested - maintains elegance
 */

export interface ParallaxOptions {
  speed?: number; // 0-1, lower is slower/more subtle
  direction?: 'up' | 'down' | 'left' | 'right';
  disabled?: boolean;
}

export function useParallax(options: ParallaxOptions = {}) {
  const { speed = 0.3, direction = 'up', disabled = false } = options;
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    const handleScroll = () => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const clampedProgress = Math.max(0, Math.min(1, scrollProgress));

      // Calculate offset based on direction
      const maxOffset = 50; // Maximum offset in pixels (subtle)
      const calculatedOffset = clampedProgress * maxOffset * speed;

      setOffset(calculatedOffset);
    };

    handleScroll(); // Initial call
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [speed, direction, disabled]);

  // Generate transform based on direction
  const getTransform = () => {
    if (disabled) return 'none';

    switch (direction) {
      case 'up':
        return `translateY(-${offset}px)`;
      case 'down':
        return `translateY(${offset}px)`;
      case 'left':
        return `translateX(-${offset}px)`;
      case 'right':
        return `translateX(${offset}px)`;
      default:
        return 'none';
    }
  };

  return {
    ref,
    style: {
      transform: getTransform(),
      transition: 'transform 0.1s ease-out',
    },
  };
}

/**
 * Scroll-based fade effect
 */
export function useScrollFade(threshold = 0.1) {
  const [opacity, setOpacity] = useState(1);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const elementTop = rect.top;
      const elementHeight = rect.height;

      // Calculate opacity based on position in viewport
      if (elementTop > viewportHeight * (1 - threshold)) {
        // Element entering from bottom
        const progress = (viewportHeight - elementTop) / (viewportHeight * threshold);
        setOpacity(Math.max(0, Math.min(1, progress)));
      } else if (elementTop + elementHeight < viewportHeight * threshold) {
        // Element leaving from top
        const progress = (elementTop + elementHeight) / (viewportHeight * threshold);
        setOpacity(Math.max(0, Math.min(1, progress)));
      } else {
        setOpacity(1);
      }
    };

    handleScroll(); // Initial call
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [threshold]);

  return {
    ref,
    style: {
      opacity,
      transition: 'opacity 0.3s ease-out',
    },
  };
}

/**
 * Scroll progress hook (for progress indicators)
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setProgress(scrolled);
    };

    handleScroll(); // Initial call
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
}

/**
 * Element in view detection
 */
export function useInView(options: IntersectionObserverInit = {}) {
  const [isInView, setIsInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasBeenInView(true);
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return {
    ref,
    isInView,
    hasBeenInView,
  };
}
