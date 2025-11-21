'use client';

/**
 * Premium Button Component
 * Museum-style button with luxury micro-interactions
 * Features:
 * - Magnetic hover effect
 * - Smooth animations
 * - Multiple variants
 * - Loading states
 * - Icon support
 */

import { ButtonHTMLAttributes, ReactNode, useRef, MouseEvent, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { prefersReducedMotion, durations, easings } from '@/design-system/motion/presets';

// Omit drag and animation props that conflict with Framer Motion
type ButtonBaseProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop'
  | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>;

export interface ButtonPremiumProps extends ButtonBaseProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  enableMagnetic?: boolean; // Magnetic hover effect
  className?: string;
}

export function ButtonPremium({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  enableMagnetic = true,
  disabled,
  className = '',
  ...props
}: ButtonPremiumProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true); // Default to true for SSR

  // Set mounted state and check reduced motion on client
  useEffect(() => {
    setIsMounted(true);
    setReducedMotion(prefersReducedMotion());
  }, []);

  // Motion values for magnetic effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring animation for smooth magnetic effect
  const springConfig = { damping: 20, stiffness: 200 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  // Magnetic hover effect
  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || !enableMagnetic || disabled || loading || reducedMotion) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Move button slightly toward cursor (max 5px)
    const distanceX = (e.clientX - centerX) / rect.width;
    const distanceY = (e.clientY - centerY) / rect.height;

    x.set(distanceX * 5);
    y.set(distanceY * 5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Variant styles
  const variantStyles = {
    primary: 'bg-museum-charcoal text-museum-white hover:bg-museum-black border-2 border-museum-charcoal',
    secondary: 'bg-museum-white text-museum-charcoal hover:bg-museum-cream border-2 border-museum-light-gray hover:border-museum-dark-gray',
    ghost: 'bg-transparent text-museum-charcoal hover:bg-museum-cream border-2 border-transparent hover:border-museum-light-gray',
    gold: 'bg-gradient-to-r from-gold-500 to-gold-600 text-museum-white hover:from-gold-600 hover:to-gold-700 border-2 border-gold-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 border-2 border-red-500',
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg',
  };

  // Base styles
  const baseStyles = `
    relative
    font-semibold
    rounded-xl
    transition-all
    duration-200
    inline-flex
    items-center
    justify-center
    gap-2
    overflow-hidden
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

  // Loading spinner
  const loadingSpinner = loading && (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
    </motion.div>
  );

  // Icon rendering
  const iconLeft = icon && iconPosition === 'left' && !loading && (
    <span className="inline-flex">{icon}</span>
  );
  const iconRight = icon && iconPosition === 'right' && !loading && (
    <span className="inline-flex">{icon}</span>
  );

  return (
    <motion.button
      ref={buttonRef}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      style={
        !isMounted || reducedMotion || !enableMagnetic
          ? undefined
          : {
              x: xSpring,
              y: ySpring,
            }
      }
      whileHover={
        !isMounted || reducedMotion || disabled || loading
          ? undefined
          : {
              scale: 1.02,
              transition: {
                duration: durations.fast,
                ease: easings.smooth,
              },
            }
      }
      whileTap={
        !isMounted || reducedMotion || disabled || loading
          ? undefined
          : {
              scale: 0.98,
              transition: {
                duration: durations.instant,
                ease: easings.sharp,
              },
            }
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {/* Shimmer effect overlay */}
      {isMounted && !disabled && !loading && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ backgroundPosition: '-200% 0' }}
          whileHover={{
            backgroundPosition: '200% 0',
            transition: {
              duration: 1.5,
              ease: 'linear',
            },
          }}
          style={{
            backgroundImage:
              variant === 'gold'
                ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
            backgroundSize: '200% 100%',
          }}
        />
      )}

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {loadingSpinner}
        {iconLeft}
        {loading ? loadingText || children : children}
        {iconRight}
      </span>
    </motion.button>
  );
}
