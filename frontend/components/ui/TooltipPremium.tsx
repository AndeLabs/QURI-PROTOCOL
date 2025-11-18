'use client';

/**
 * Premium Tooltip Component
 * Built on Radix UI with museum-style design
 * Features:
 * - Smooth animations
 * - Multiple positions
 * - Premium styling
 * - Accessibility compliant
 */

import { ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { prefersReducedMotion } from '@/design-system/motion/presets';

interface TooltipPremiumProps {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  className?: string;
  contentClassName?: string;
}

export function TooltipPremium({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  className = '',
  contentClassName = '',
}: TooltipPremiumProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild className={className}>
          {children}
        </TooltipPrimitive.Trigger>

        <AnimatePresence>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side={side}
              align={align}
              sideOffset={8}
              className={`
                z-50
                overflow-hidden
                rounded-lg
                bg-museum-charcoal
                px-4
                py-2
                text-sm
                text-museum-white
                shadow-xl
                border
                border-museum-dark-gray/20
                ${contentClassName}
              `}
              asChild
            >
              <motion.div
                initial={
                  reducedMotion
                    ? { opacity: 1 }
                    : {
                        opacity: 0,
                        scale: 0.95,
                        y: side === 'top' ? 5 : side === 'bottom' ? -5 : 0,
                        x: side === 'left' ? 5 : side === 'right' ? -5 : 0,
                      }
                }
                animate={
                  reducedMotion
                    ? { opacity: 1 }
                    : {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        x: 0,
                      }
                }
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        scale: 0.95,
                        y: side === 'top' ? 5 : side === 'bottom' ? -5 : 0,
                        x: side === 'left' ? 5 : side === 'right' ? -5 : 0,
                      }
                }
                transition={{
                  duration: reducedMotion ? 0 : 0.15,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {content}
                <TooltipPrimitive.Arrow
                  className="fill-museum-charcoal"
                  width={12}
                  height={6}
                />
              </motion.div>
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </AnimatePresence>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/**
 * Simple Tooltip Variant
 * For quick inline usage with text content
 */
interface SimpleTooltipProps {
  text: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function SimpleTooltip({ text, children, side = 'top' }: SimpleTooltipProps) {
  return (
    <TooltipPremium content={<span>{text}</span>} side={side}>
      {children}
    </TooltipPremium>
  );
}

/**
 * Info Tooltip
 * For informational content with icon
 */
interface InfoTooltipProps {
  title: string;
  description: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function InfoTooltip({ title, description, children, side = 'top' }: InfoTooltipProps) {
  return (
    <TooltipPremium
      content={
        <div className="max-w-xs">
          <p className="font-semibold mb-1">{title}</p>
          <p className="text-xs text-museum-cream opacity-90">{description}</p>
        </div>
      }
      side={side}
    >
      {children}
    </TooltipPremium>
  );
}
