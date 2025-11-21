/**
 * Modular RuneGrid Component
 * Responsive grid for displaying multiple Runes
 * Now with premium stagger animations
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader, Coins } from 'lucide-react';
import { RuneCard } from './RuneCard';
import { RuneCardPremium } from './RuneCardPremium';
import type { RegistryEntry } from '@/types/canisters';
import {
  staggerContainer,
  staggerContainerFast,
  staggerContainerSlow,
  staggerItem,
  prefersReducedMotion,
} from '@/design-system/motion/presets';

interface RuneGridProps {
  runes: RegistryEntry[];
  loading?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
  usePremiumCards?: boolean; // Use RuneCardPremium instead of RuneCard
  staggerSpeed?: 'slow' | 'normal' | 'fast'; // Animation stagger speed
  enableMagneticEffect?: boolean; // Enable magnetic hover on cards
  enable3DTilt?: boolean; // Enable 3D tilt on cards
}

export function RuneGrid({
  runes,
  loading = false,
  variant = 'default',
  emptyMessage = 'No Runes found',
  emptyDescription = 'Try adjusting your filters or create your first Rune',
  className = '',
  usePremiumCards = true, // Default to premium cards
  staggerSpeed = 'normal',
  enableMagneticEffect = true,
  enable3DTilt = true,
}: RuneGridProps) {
  // Check for reduced motion preference (must be in useEffect to avoid hydration mismatch)
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  // Select stagger variant based on speed
  const staggerVariant =
    staggerSpeed === 'fast'
      ? staggerContainerFast
      : staggerSpeed === 'slow'
      ? staggerContainerSlow
      : staggerContainer;

  // Select card component
  const CardComponent = usePremiumCards ? RuneCardPremium : RuneCard;
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-gold-600 mx-auto mb-4" />
          <p className="text-museum-dark-gray">Loading Runes...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (runes.length === 0) {
    return (
      <div className="border-2 border-dashed border-museum-light-gray rounded-xl p-12 text-center">
        <Coins className="h-12 w-12 text-museum-dark-gray mx-auto mb-4" />
        <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
          {emptyMessage}
        </h3>
        <p className="text-museum-dark-gray">{emptyDescription}</p>
      </div>
    );
  }

  // Grid layout based on variant - using museum spacing
  const gridClass =
    variant === 'compact'
      ? 'grid grid-cols-1 gap-3'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8'; // Increased gap for museum feel

  // Simple grid - cards handle their own animations
  return (
    <div className={`${gridClass} ${className}`}>
      {runes.map((rune) => (
        <CardComponent
          key={`${rune.metadata.key.block}:${rune.metadata.key.tx}`}
          rune={rune}
          variant={variant}
          enableMagneticEffect={usePremiumCards && enableMagneticEffect}
          enable3DTilt={usePremiumCards && enable3DTilt}
        />
      ))}
    </div>
  );
}
