'use client';

/**
 * Premium Gallery Page
 * Museum-style gallery with:
 * - Hero parallax scrolling
 * - Stagger animations
 * - Premium card components
 * - Smooth transitions
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Home,
  Grid3x3,
  List,
  TrendingUp,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Filter,
  X,
} from 'lucide-react';
import { useRegistry } from '@/hooks/useRegistry';
import type { RegistryEntry, Page } from '@/types/canisters';
import { RuneGrid } from '@/components/runes/RuneGrid';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { SimpleTooltip } from '@/components/ui/TooltipPremium';
import {
  pageTransition,
  fadeInUp,
  staggerContainer,
  staggerItem,
  modalBackdrop,
  modalContent,
  luxuryEntrance,
  durations,
  easings,
  prefersReducedMotion,
} from '@/design-system/motion/presets';

export default function GalleryPagePremium() {
  const {
    listRunes,
    getTotalRunes,
    loading,
    error,
  } = useRegistry();

  const [runes, setRunes] = useState<RegistryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0n);
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const [sortMode, setSortMode] = useState<'recent' | 'popular'>('recent');
  const [selectedRune, setSelectedRune] = useState<RegistryEntry | null>(null);

  // Parallax scrolling for hero
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  const reducedMotion = prefersReducedMotion();

  // Load Runes
  const loadRunes = async () => {
    try {
      const page: Page = {
        offset: 0n,
        limit: 50n,
        sort_by: sortMode === 'popular' ? [{ Volume: null }] : [{ Block: null }],
        sort_order: [{ Desc: null }],
      };

      const [response, total] = await Promise.all([
        listRunes(page),
        getTotalRunes(),
      ]);

      setRunes(response.items);
      setTotalCount(total);
    } catch (err) {
      console.error('Failed to load Runes:', err);
    }
  };

  useEffect(() => {
    loadRunes();

    // Refresh every 30 seconds
    const interval = setInterval(loadRunes, 30000);
    return () => clearInterval(interval);
  }, [sortMode]);

  // Format supply
  const formatSupply = (amount: bigint, divisibility: number): string => {
    const value = Number(amount) / Math.pow(10, divisibility);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.min(divisibility, 2),
    });
  };

  // Get color for Rune
  const getRuneColor = (name: string): string => {
    const colors = [
      'from-gold-400 to-gold-600',
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-green-400 to-green-600',
      'from-red-400 to-red-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-orange-400 to-orange-600',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <motion.div
      className="min-h-screen"
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={reducedMotion ? undefined : pageTransition}
    >
      {/* Hero Section with Parallax */}
      <motion.section
        ref={heroRef}
        className="relative h-[70vh] overflow-hidden bg-gradient-to-br from-museum-white via-museum-cream to-premium-exhibition-gray"
        style={
          reducedMotion
            ? undefined
            : {
                y: heroY,
                scale: heroScale,
              }
        }
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-gold-200/30 to-gold-400/10 blur-3xl"
            style={{ opacity: heroOpacity }}
          />
          <motion.div
            className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-blue-200/20 to-purple-300/10 blur-3xl"
            style={{ opacity: heroOpacity }}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <motion.div
            variants={reducedMotion ? undefined : luxuryEntrance}
            className="max-w-4xl"
          >
            <motion.h1
              className="font-serif text-6xl md:text-7xl lg:text-8xl font-bold text-museum-black mb-6 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: durations.museum, ease: easings.luxury }}
            >
              Runes Gallery
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-museum-dark-gray mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: durations.slow, delay: 0.2 }}
            >
              A curated collection of Bitcoin Runes, showcased with elegance on the Internet Computer
            </motion.p>
            <motion.div
              className="flex items-center justify-center gap-4 text-sm text-museum-dark-gray"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: durations.normal, delay: 0.4 }}
            >
              <span className="px-4 py-2 bg-museum-white/80 backdrop-blur-sm rounded-full border border-museum-light-gray">
                {totalCount.toString()} Runes
              </span>
              <span className="px-4 py-2 bg-museum-white/80 backdrop-blur-sm rounded-full border border-museum-light-gray">
                On-Chain Registry
              </span>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: durations.normal,
            delay: 0.6,
            repeat: Infinity,
            repeatType: 'reverse',
            repeatDelay: 0.5,
          }}
        >
          <div className="w-6 h-10 border-2 border-museum-dark-gray/30 rounded-full flex items-start justify-center p-2">
            <motion.div className="w-1 h-2 bg-museum-dark-gray/50 rounded-full" />
          </div>
        </motion.div>
      </motion.section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
        <motion.div
          className="space-y-12"
          initial="hidden"
          animate="visible"
          variants={reducedMotion ? undefined : staggerContainer}
        >
          {/* Back Link */}
          <motion.div variants={reducedMotion ? undefined : staggerItem}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-museum-dark-gray hover:text-museum-black transition-colors group"
            >
              <Home className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
          </motion.div>

          {/* Controls */}
          <motion.div
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-museum-white/90 backdrop-blur-sm border border-museum-light-gray rounded-2xl p-6 shadow-lg"
            variants={reducedMotion ? undefined : staggerItem}
          >
            <div className="flex items-center gap-4 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 border border-museum-light-gray rounded-lg p-1 bg-museum-cream">
                <SimpleTooltip text="Grid View">
                  <motion.button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-gold-100 text-gold-800'
                        : 'text-museum-dark-gray hover:bg-museum-white'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Grid3x3 className="h-5 w-5" />
                  </motion.button>
                </SimpleTooltip>
                <SimpleTooltip text="Masonry View">
                  <motion.button
                    onClick={() => setViewMode('masonry')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'masonry'
                        ? 'bg-gold-100 text-gold-800'
                        : 'text-museum-dark-gray hover:bg-museum-white'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <List className="h-5 w-5" />
                  </motion.button>
                </SimpleTooltip>
              </div>

              {/* Sort Select */}
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as 'recent' | 'popular')}
                className="px-4 py-2 border border-museum-light-gray rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none bg-museum-white"
              >
                <option value="recent">Recently Created</option>
                <option value="popular">Most Popular</option>
              </select>

              {/* Count Badge */}
              <div className="text-sm text-museum-dark-gray bg-museum-cream px-4 py-2 rounded-lg border border-museum-light-gray">
                {runes.length} of {totalCount.toString()} Runes
              </div>
            </div>

            {/* Refresh Button */}
            <ButtonPremium
              onClick={loadRunes}
              variant="secondary"
              size="md"
              disabled={loading}
              icon={<RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </ButtonPremium>
          </motion.div>

          {/* Error Display */}
          {error && (
            <motion.div
              className="bg-red-50 border border-red-200 rounded-xl p-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          {/* Gallery - Using Premium RuneGrid */}
          <motion.div variants={reducedMotion ? undefined : staggerItem}>
            <RuneGrid
              runes={runes}
              loading={loading}
              variant="default"
              usePremiumCards={true}
              staggerSpeed="normal"
              enableMagneticEffect={true}
              enable3DTilt={true}
              emptyMessage="No Runes Yet"
              emptyDescription="Be the first to create a Bitcoin Rune"
              className="mb-12"
            />
          </motion.div>

          {/* Quick Links */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12"
            variants={reducedMotion ? undefined : staggerItem}
          >
            {[
              {
                href: '/create',
                icon: Sparkles,
                title: 'Create a Rune',
                description: 'Etch your own Bitcoin Rune on the blockchain',
                gradient: 'from-gold-50 to-gold-100',
                iconColor: 'text-gold-600',
                linkColor: 'text-gold-600',
              },
              {
                href: '/explorer',
                icon: Filter,
                title: 'Advanced Search',
                description: 'Filter and search all Runes with advanced options',
                gradient: 'from-blue-50 to-blue-100',
                iconColor: 'text-blue-600',
                linkColor: 'text-blue-600',
              },
              {
                href: '/dashboard',
                icon: TrendingUp,
                title: 'My Dashboard',
                description: 'View your Runes and track your creations',
                gradient: 'from-purple-50 to-purple-100',
                iconColor: 'text-purple-600',
                linkColor: 'text-purple-600',
              },
            ].map((link, index) => (
              <Link key={link.href} href={link.href}>
                <motion.div
                  className={`border border-museum-light-gray rounded-xl p-6 bg-gradient-to-br ${link.gradient} hover:shadow-xl transition-all group h-full`}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: durations.fast }}
                >
                  <link.icon className={`h-8 w-8 ${link.iconColor} mb-3`} />
                  <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
                    {link.title}
                  </h3>
                  <p className="text-sm text-museum-dark-gray mb-4">
                    {link.description}
                  </p>
                  <div className={`flex items-center gap-2 ${link.linkColor} font-medium`}>
                    Start Now
                    <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Detail Modal with Premium Animations */}
      <AnimatePresence>
        {selectedRune && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
            onClick={() => setSelectedRune(null)}
            variants={reducedMotion ? undefined : modalBackdrop}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-museum-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              variants={reducedMotion ? undefined : modalContent}
            >
              {/* Header */}
              <div className={`h-48 bg-gradient-to-br ${getRuneColor(selectedRune.metadata.name)} p-8 relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
                  <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-32 translate-y-32"></div>
                </div>
                <motion.button
                  onClick={() => setSelectedRune(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
                <div className="relative">
                  <div className="text-7xl font-bold text-white drop-shadow-2xl mb-4">
                    {selectedRune.metadata.symbol}
                  </div>
                  <h2 className="font-serif text-3xl font-bold text-white drop-shadow-lg">
                    {selectedRune.metadata.name}
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Supply',
                      value: formatSupply(selectedRune.metadata.premine, selectedRune.metadata.divisibility),
                    },
                    {
                      label: 'Holders',
                      value: selectedRune.holder_count?.toString() || '0',
                    },
                    {
                      label: 'Divisibility',
                      value: selectedRune.metadata.divisibility.toString(),
                    },
                    {
                      label: '24h Volume',
                      value: selectedRune.trading_volume_24h
                        ? Number(selectedRune.trading_volume_24h).toLocaleString()
                        : '0',
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      className="bg-museum-cream rounded-lg p-4 border border-museum-light-gray"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <p className="text-xs text-museum-dark-gray mb-1">{stat.label}</p>
                      <p className="text-lg font-bold text-museum-black">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Metadata */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-museum-light-gray">
                    <span className="text-museum-dark-gray">Rune ID</span>
                    <span className="font-mono text-sm text-museum-black">
                      {selectedRune.metadata.key.block.toString()}:{selectedRune.metadata.key.tx}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <ButtonPremium
                    onClick={() => setSelectedRune(null)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Close
                  </ButtonPremium>
                  <a
                    href={`https://mempool.space/rune/${selectedRune.metadata.key.block}:${selectedRune.metadata.key.tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <ButtonPremium
                      variant="gold"
                      className="w-full"
                      icon={<ExternalLink className="h-4 w-4" />}
                    >
                      View on Bitcoin
                    </ButtonPremium>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
