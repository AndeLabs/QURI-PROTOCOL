'use client';

import { ReactNode, CSSProperties } from 'react';
import { useParallax, useScrollFade, useInView, ParallaxOptions } from '@/lib/hooks/useParallax';

/**
 * Museum-Grade Parallax Components
 * Very subtle depth effects that enhance without overwhelming
 * Inspired by premium gallery experiences
 */

interface ParallaxContainerProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: ParallaxOptions['direction'];
  disabled?: boolean;
}

export function ParallaxContainer({
  children,
  className = '',
  speed = 0.3,
  direction = 'up',
  disabled = false,
}: ParallaxContainerProps) {
  const { ref, style } = useParallax({ speed, direction, disabled });

  return (
    <div ref={ref as any} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Fade in on scroll component
 */
interface FadeInScrollProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export function FadeInScroll({ children, className = '', threshold = 0.1 }: FadeInScrollProps) {
  const { ref, style } = useScrollFade(threshold);

  return (
    <div ref={ref as any} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Reveal on scroll - animate in when visible
 */
interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale';
  delay?: number;
  once?: boolean;
}

export function RevealOnScroll({
  children,
  className = '',
  animation = 'fade',
  delay = 0,
  once = true,
}: RevealOnScrollProps) {
  const { ref, isInView, hasBeenInView } = useInView({ threshold: 0.1 });
  const shouldAnimate = once ? hasBeenInView : isInView;

  const getAnimationClass = () => {
    if (!shouldAnimate) {
      switch (animation) {
        case 'slide-up':
          return 'translate-y-12 opacity-0';
        case 'slide-down':
          return '-translate-y-12 opacity-0';
        case 'slide-left':
          return 'translate-x-12 opacity-0';
        case 'slide-right':
          return '-translate-x-12 opacity-0';
        case 'scale':
          return 'scale-95 opacity-0';
        case 'fade':
        default:
          return 'opacity-0';
      }
    }
    return 'translate-y-0 translate-x-0 scale-100 opacity-100';
  };

  return (
    <div
      ref={ref as any}
      className={`transition-all duration-700 ease-out ${getAnimationClass()} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Parallax layer - for creating depth in sections
 */
interface ParallaxLayerProps {
  children: ReactNode;
  depth?: number; // 1-5, higher is more depth
  className?: string;
}

export function ParallaxLayer({ children, depth = 1, className = '' }: ParallaxLayerProps) {
  const speed = depth * 0.1; // Very subtle
  const { ref, style } = useParallax({ speed, direction: 'up' });

  return (
    <div ref={ref as any} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Sticky reveal - element that becomes sticky on scroll
 */
interface StickyRevealProps {
  children: ReactNode;
  className?: string;
  topOffset?: number;
}

export function StickyReveal({ children, className = '', topOffset = 0 }: StickyRevealProps) {
  const { ref, isInView } = useInView({ threshold: 0 });

  return (
    <div
      ref={ref as any}
      className={`transition-all duration-500 ${isInView ? 'sticky' : 'relative'} ${className}`}
      style={{ top: isInView ? `${topOffset}px` : 'auto' }}
    >
      {children}
    </div>
  );
}

/**
 * Smooth scroll wrapper
 */
interface SmoothScrollProps {
  children: ReactNode;
  className?: string;
}

export function SmoothScroll({ children, className = '' }: SmoothScrollProps) {
  return (
    <div className={`smooth-scroll ${className}`} style={{ scrollBehavior: 'smooth' }}>
      {children}
    </div>
  );
}

/**
 * Scroll progress indicator (for reading progress)
 */
interface ScrollProgressProps {
  className?: string;
  color?: string;
}

export function ScrollProgress({ className = '', color = 'gold-500' }: ScrollProgressProps) {
  const { ref, style } = useParallax({ speed: 0, direction: 'up' });

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-1 z-50 bg-museum-light-gray ${className}`}
      ref={ref as any}
    >
      <div
        className={`h-full bg-${color} transition-all duration-300`}
        style={{ width: '0%' }} // This would be updated by scroll progress
      />
    </div>
  );
}

/**
 * Museum-style card with subtle hover parallax
 */
interface ParallaxCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function ParallaxCard({ children, className = '', intensity = 5 }: ParallaxCardProps) {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * intensity;
    const rotateY = ((x - centerX) / centerX) * intensity;

    card.style.transform = `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
  };

  return (
    <div
      className={`transition-transform duration-300 ease-out ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}

/**
 * Parallax background - subtle movement on scroll
 */
interface ParallaxBackgroundProps {
  imageUrl?: string;
  className?: string;
  children?: ReactNode;
}

export function ParallaxBackground({
  imageUrl,
  className = '',
  children,
}: ParallaxBackgroundProps) {
  const { ref, style } = useParallax({ speed: 0.5, direction: 'up' });

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        ref={ref as any}
        className="absolute inset-0 -top-[10%] -bottom-[10%]"
        style={{
          ...style,
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
