'use client';

/**
 * Premium RuneCard Component
 * Museum-style card with luxury micro-interactions
 * Features:
 * - Magnetic hover effect
 * - 3D tilt animation
 * - Shimmer effect
 * - Golden ratio spacing
 * - Premium animations
 */

import { useRef, useState, useEffect, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Coins, Users, Activity, ExternalLink } from 'lucide-react';
import type { RegistryEntry } from '@/types/canisters';
import {
  museumCardEntrance,
  hoverLift,
  prefersReducedMotion,
  durations,
  easings,
} from '@/design-system/motion/presets';

interface RuneCardPremiumProps {
  rune: RegistryEntry;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  className?: string;
  enableMagneticEffect?: boolean;
  enable3DTilt?: boolean;
}

export function RuneCardPremium({
  rune,
  variant = 'default',
  showActions = true,
  className = '',
  enableMagneticEffect = true,
  enable3DTilt = true,
}: RuneCardPremiumProps) {
  const { metadata } = rune;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const router = useRouter();

  // Check reduced motion preference on client only
  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  // Generate the detail page URL
  const detailUrl = `/explorer/rune/${metadata.key.block}:${metadata.key.tx}`;

  // Navigate to detail page
  const handleCardClick = () => {
    router.push(detailUrl);
  };

  // Motion values for magnetic effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring animation for smooth magnetic effect
  const springConfig = { damping: 25, stiffness: 150 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  // 3D tilt effect
  const rotateX = useTransform(ySpring, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], [-7, 7]);

  // Handle mouse move for magnetic + tilt effect
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || reducedMotion) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Magnetic effect: move card slightly toward cursor
    if (enableMagneticEffect) {
      const distanceX = (e.clientX - centerX) / rect.width;
      const distanceY = (e.clientY - centerY) / rect.height;
      x.set(distanceX * 10); // Limit movement to 10px
      y.set(distanceY * 10);
    }

    // 3D Tilt: rotate based on mouse position
    if (enable3DTilt) {
      const tiltX = (e.clientY - centerY) / rect.height;
      const tiltY = (e.clientX - centerX) / rect.width;
      x.set(tiltY * 0.5);
      y.set(tiltX * 0.5);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  // Format supply with divisibility
  const formatSupply = (amount: bigint, divisibility: number): string => {
    // Ensure divisibility is valid (0-20 range for toLocaleString)
    const safeDivisibility = Math.max(0, Math.min(divisibility || 0, 20));
    const value = Number(amount) / Math.pow(10, safeDivisibility);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.min(safeDivisibility, 4),
    });
  };

  // Base card styles with premium design
  const baseCardClass =
    'relative bg-gradient-to-br from-museum-white via-museum-cream to-museum-white border border-museum-light-gray overflow-hidden';

  // Shimmer effect overlay
  const shimmerOverlay = isHovered && !reducedMotion && (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ backgroundPosition: '-200% 0' }}
      animate={{ backgroundPosition: '200% 0' }}
      transition={{
        duration: 2,
        ease: 'linear',
        repeat: Infinity,
      }}
      style={{
        background:
          'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.1), transparent)',
        backgroundSize: '200% 100%',
      }}
    />
  );

  // Compact variant
  if (variant === 'compact') {
    return (
      <motion.div
        ref={cardRef}
        className={`${baseCardClass} rounded-lg p-4 cursor-pointer ${className}`}
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        whileHover={reducedMotion ? undefined : { y: -4 }}
        style={
          reducedMotion
            ? undefined
            : {
                x: xSpring,
                y: ySpring,
                rotateX: enable3DTilt ? rotateX : 0,
                rotateY: enable3DTilt ? rotateY : 0,
                transformStyle: 'preserve-3d',
              }
        }
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
        transition={{ duration: durations.fast }}
      >
        {shimmerOverlay}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex-1">
            <h3 className="font-serif font-semibold text-museum-black">
              {metadata.name}
            </h3>
            <p className="text-sm text-museum-dark-gray">{metadata.symbol}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-museum-black">
              {formatSupply(metadata.premine, metadata.divisibility)}
            </p>
            <p className="text-xs text-museum-dark-gray">Supply</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <motion.div
        ref={cardRef}
        className={`${baseCardClass} rounded-xl p-8 cursor-pointer ${className}`}
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        whileHover={
          reducedMotion
            ? undefined
            : {
                y: -8,
                boxShadow:
                  '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 25px rgba(212, 175, 55, 0.15)',
              }
        }
        style={
          reducedMotion
            ? undefined
            : {
                x: xSpring,
                y: ySpring,
                rotateX: enable3DTilt ? rotateX : 0,
                rotateY: enable3DTilt ? rotateY : 0,
                transformStyle: 'preserve-3d',
              }
        }
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
        transition={{ duration: durations.normal, ease: easings.smooth }}
      >
        {shimmerOverlay}

        {/* Content with z-index to stay above shimmer */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="font-serif text-3xl font-bold text-museum-black leading-tight">
                {metadata.name}
              </h3>
              <p className="text-museum-dark-gray mt-2 text-lg">
                {metadata.symbol}
              </p>
            </motion.div>
          </div>

          {/* Stats Grid with golden ratio spacing */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              {
                icon: Coins,
                label: 'Supply',
                value: formatSupply(metadata.premine, metadata.divisibility),
                delay: 0.15,
              },
              {
                icon: Users,
                label: 'Holders',
                value: rune.holder_count?.toString() || '0',
                delay: 0.2,
              },
              {
                icon: Activity,
                label: '24h Volume',
                value: rune.trading_volume_24h
                  ? Number(rune.trading_volume_24h).toLocaleString()
                  : '0',
                delay: 0.25,
              },
              {
                icon: Coins,
                label: 'Divisibility',
                value: metadata.divisibility.toString(),
                delay: 0.3,
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="bg-gradient-to-br from-museum-cream to-premium-exhibition-gray rounded-xl p-4 border border-museum-light-gray/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: stat.delay }}
                whileHover={{
                  scale: 1.02,
                  backgroundColor: 'rgba(212, 175, 55, 0.05)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-4 w-4 text-gold-600" />
                  <span className="text-xs font-medium text-museum-dark-gray">
                    {stat.label}
                  </span>
                </div>
                <p className="text-xl font-bold text-museum-black">
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Mint Terms */}
          {metadata.terms.length > 0 && metadata.terms[0] && (
            <motion.div
              className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-4 mb-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
            >
              <p className="text-sm font-semibold text-blue-900 mb-3">
                Mint Terms Active
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">Amount per mint:</span>
                  <p className="font-semibold text-blue-900 mt-1">
                    {formatSupply(metadata.terms[0].amount, metadata.divisibility)}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700">Total cap:</span>
                  <p className="font-semibold text-blue-900 mt-1">
                    {metadata.terms[0].cap.toString()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Metadata */}
          <motion.div
            className="space-y-3 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between text-sm border-b border-museum-light-gray pb-2">
              <span className="text-museum-dark-gray">Created</span>
              <span className="font-mono text-museum-black font-medium">
                Block #{metadata.created_at?.toString() || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-museum-dark-gray">Rune ID</span>
              <span className="font-mono text-xs text-museum-black">
                {metadata.key.block.toString()}:{metadata.key.tx}
              </span>
            </div>
          </motion.div>

          {/* Actions */}
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <motion.a
                href={`https://mempool.space/rune/${metadata.key.block}:${metadata.key.tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gold-300 rounded-xl hover:bg-gold-50 transition-all text-sm font-semibold text-museum-black"
                whileHover={{ scale: 1.02, borderColor: '#D4AF37' }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
              >
                View on Bitcoin
                <ExternalLink className="h-4 w-4" />
              </motion.a>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  // Default variant with premium effects
  return (
    <motion.div
      ref={cardRef}
      className={`${baseCardClass} rounded-xl p-6 cursor-pointer ${className}`}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      whileHover={
        reducedMotion
          ? undefined
          : {
              y: -6,
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 0 20px rgba(212, 175, 55, 0.1)',
            }
      }
      style={
        reducedMotion
          ? undefined
          : {
              x: xSpring,
              y: ySpring,
              rotateX: enable3DTilt ? rotateX : 0,
              rotateY: enable3DTilt ? rotateY : 0,
              transformStyle: 'preserve-3d',
            }
      }
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      transition={{ duration: durations.normal }}
    >
      {shimmerOverlay}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="font-serif text-2xl font-bold text-museum-black">
              {metadata.name}
            </h3>
            <p className="text-sm text-museum-dark-gray mt-1">
              {metadata.symbol}
            </p>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            {
              label: 'Supply',
              value: formatSupply(metadata.premine, metadata.divisibility),
            },
            {
              label: 'Holders',
              value: rune.holder_count?.toString() || '0',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="bg-museum-cream rounded-lg p-3 border border-museum-light-gray/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              whileHover={{
                backgroundColor: 'rgba(212, 175, 55, 0.05)',
                borderColor: 'rgba(212, 175, 55, 0.3)',
              }}
            >
              <p className="text-xs text-museum-dark-gray mb-1">
                {stat.label}
              </p>
              <p className="font-semibold text-museum-black text-lg">
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Action */}
        {showActions && (
          <motion.a
            href={`https://mempool.space/rune/${metadata.key.block}:${metadata.key.tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gold-600 hover:text-gold-700 transition-colors font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            whileHover={{ x: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            View on Bitcoin
            <ExternalLink className="h-4 w-4" />
          </motion.a>
        )}
      </div>
    </motion.div>
  );
}
