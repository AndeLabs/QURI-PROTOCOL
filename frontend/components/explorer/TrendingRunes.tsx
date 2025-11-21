'use client';

/**
 * Trending Runes Component
 * Displays recently created or popular runes in a horizontal carousel
 */

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, ChevronLeft, ChevronRight, Flame, Clock, ExternalLink } from 'lucide-react';
import { useRegistry } from '@/hooks/useRegistry';
import { formatSupply, formatRelativeTime, getMempoolRuneUrl } from '@/lib/utils/format';
import { staggerContainer, staggerItem, prefersReducedMotion } from '@/design-system/motion/presets';
import type { RegistryEntry, Page } from '@/types/canisters';
import { useQuery } from '@tanstack/react-query';
import { getRegistryActor } from '@/lib/icp/actors';

interface TrendingRunesProps {
  className?: string;
  limit?: number;
  sortBy?: 'recent' | 'volume' | 'mints';
}

export function TrendingRunes({
  className = '',
  limit = 10,
  sortBy = 'recent',
}: TrendingRunesProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = prefersReducedMotion();

  // Fetch trending runes
  const { data: runes = [], isLoading } = useQuery({
    queryKey: ['runes', 'trending', sortBy, limit],
    queryFn: async () => {
      const actor = await getRegistryActor();

      const page: Page = {
        offset: 0n,
        limit: BigInt(limit),
        sort_by: [sortBy === 'recent' ? { Block: null } : { Volume: null }],
        sort_order: [{ Desc: null }],
      };

      const result = await actor.list_runes([page]);
      if ('Ok' in result) {
        return result.Ok.items;
      }
      return [];
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleRuneClick = (rune: RegistryEntry) => {
    router.push(`/explorer/rune/${rune.metadata.key.block}:${rune.metadata.key.tx}`);
  };

  if (isLoading) {
    return (
      <div className={`bg-museum-white border border-museum-light-gray rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-gold-600" />
          <h3 className="font-semibold text-museum-black">Trending Runes</h3>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48 h-32 bg-museum-cream animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (runes.length === 0) {
    return null;
  }

  return (
    <div className={`bg-museum-white border border-museum-light-gray rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-museum-light-gray">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gold-50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-gold-600" />
          </div>
          <div>
            <h3 className="font-semibold text-museum-black">
              {sortBy === 'recent' ? 'Recently Created' : 'Trending Runes'}
            </h3>
            <p className="text-xs text-museum-dark-gray">
              {sortBy === 'recent' ? 'Latest etchings on Bitcoin' : 'Most active this period'}
            </p>
          </div>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 hover:bg-museum-cream rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-museum-dark-gray" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 hover:bg-museum-cream rounded-lg transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-museum-dark-gray" />
          </button>
        </div>
      </div>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 p-4 overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {runes.map((rune, index) => (
          <motion.button
            key={`${rune.metadata.key.block}:${rune.metadata.key.tx}`}
            onClick={() => handleRuneClick(rune)}
            className="flex-shrink-0 w-52 bg-gradient-to-br from-museum-cream to-museum-white
                       border border-museum-light-gray rounded-lg p-4 text-left
                       hover:border-gold-300 hover:shadow-lg transition-all
                       scroll-snap-align-start"
            variants={reducedMotion ? undefined : staggerItem}
            whileHover={reducedMotion ? undefined : { y: -4, scale: 1.02 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {/* Symbol & Name */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{rune.metadata.symbol}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-museum-black truncate text-sm">
                    {rune.metadata.name}
                  </p>
                </div>
              </div>
              {index < 3 && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                  <Flame className="h-3 w-3" />
                  {index + 1}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-museum-dark-gray">Supply</span>
                <span className="font-medium text-museum-black">
                  {rune.metadata.terms[0]
                    ? formatSupply(rune.metadata.terms[0].amount, rune.metadata.divisibility)
                    : formatSupply(rune.metadata.premine, rune.metadata.divisibility)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-museum-dark-gray">ID</span>
                <span className="font-mono text-museum-black">
                  {rune.metadata.key.block.toString().slice(-4)}:{rune.metadata.key.tx}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-museum-light-gray">
              <span className="flex items-center gap-1 text-xs text-museum-dark-gray">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(rune.metadata.created_at)}
              </span>
              <ExternalLink className="h-3 w-3 text-museum-dark-gray" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version for sidebars
 */
export function TrendingRunesCompact({ className = '' }: { className?: string }) {
  const router = useRouter();

  const { data: runes = [], isLoading } = useQuery({
    queryKey: ['runes', 'trending', 'compact'],
    queryFn: async () => {
      const actor = await getRegistryActor();

      const page: Page = {
        offset: 0n,
        limit: 5n,
        sort_by: [{ Block: null }],
        sort_order: [{ Desc: null }],
      };

      const result = await actor.list_runes([page]);
      if ('Ok' in result) {
        return result.Ok.items;
      }
      return [];
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  if (isLoading || runes.length === 0) {
    return null;
  }

  return (
    <div className={`bg-museum-white border border-museum-light-gray rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 p-4 border-b border-museum-light-gray">
        <Flame className="h-4 w-4 text-orange-500" />
        <h4 className="text-sm font-semibold text-museum-black">Hot Runes</h4>
      </div>

      <div className="divide-y divide-museum-light-gray">
        {runes.map((rune, index) => (
          <button
            key={`${rune.metadata.key.block}:${rune.metadata.key.tx}`}
            onClick={() => router.push(`/explorer/rune/${rune.metadata.key.block}:${rune.metadata.key.tx}`)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-museum-cream transition-colors text-left"
          >
            <span className="text-xs font-bold text-museum-dark-gray w-4">
              {index + 1}
            </span>
            <span className="text-lg">{rune.metadata.symbol}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-museum-black truncate">
                {rune.metadata.name}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-museum-dark-gray flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
