'use client';

/**
 * BRC-20 Explorer Page
 * Browse and explore BRC-20 tokens on Bitcoin
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Loader2,
  TrendingUp,
  Users,
  Coins,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { useFlatBRC20Tokens, formatBRC20Amount, getMintProgress } from '@/hooks/useBRC20';
import { Button } from '@/components/ui/Button';
import { fadeInUp, staggerContainer, staggerItem } from '@/design-system/motion/presets';
import type { BRC20Filters } from '@/lib/api/hiro/types';

type SortOption = 'deploy_timestamp' | 'tx_count' | 'minted_supply';

export default function BRC20ExplorerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('tx_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filters: BRC20Filters = useMemo(
    () => ({
      order_by: sortBy,
      order: sortOrder,
      limit: 20,
    }),
    [sortBy, sortOrder]
  );

  const {
    tokens,
    total,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useFlatBRC20Tokens(filters);

  // Filter tokens by search term
  const filteredTokens = useMemo(() => {
    if (!searchTerm) return tokens;
    const term = searchTerm.toLowerCase();
    return tokens.filter((token) =>
      token.ticker.toLowerCase().includes(term)
    );
  }, [tokens, searchTerm]);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'tx_count', label: 'Most Active' },
    { value: 'deploy_timestamp', label: 'Newest' },
    { value: 'minted_supply', label: 'Most Minted' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeInUp} initial="hidden" animate="visible">
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          BRC-20 Explorer
        </h1>
        <p className="text-museum-dark-gray">
          Explore BRC-20 tokens on Bitcoin • {total.toLocaleString()} tokens indexed
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="bg-museum-white border border-museum-light-gray rounded-xl p-6"
          variants={staggerItem}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Coins className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-museum-dark-gray">Total Tokens</p>
              <p className="text-2xl font-bold text-museum-black">
                {total.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-museum-white border border-museum-light-gray rounded-xl p-6"
          variants={staggerItem}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-museum-dark-gray">Protocol</p>
              <p className="text-2xl font-bold text-museum-black">BRC-20</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-museum-white border border-museum-light-gray rounded-xl p-6"
          variants={staggerItem}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-museum-dark-gray">Network</p>
              <p className="text-2xl font-bold text-museum-black">Bitcoin</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-museum-dark-gray" />
          <input
            type="text"
            placeholder="Search by ticker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-museum-light-gray rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          />
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-3 border border-museum-light-gray rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-gold-500
                     bg-museum-white text-museum-black"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-3 border border-museum-light-gray rounded-lg hover:bg-museum-cream
                     transition-colors"
          >
            <ArrowUpDown className="h-5 w-5 text-museum-dark-gray" />
          </button>
        </div>
      </motion.div>

      {/* Tokens Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-museum-dark-gray">No tokens found</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {filteredTokens.map((token) => {
            const mintProgress = getMintProgress(token.minted_supply, token.max_supply);
            const isMintComplete = mintProgress >= 100;

            return (
              <motion.div
                key={token.ticker}
                className="bg-museum-white border border-museum-light-gray rounded-xl p-6
                         hover:border-gold-300 transition-colors cursor-pointer"
                variants={staggerItem}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600
                                  rounded-lg flex items-center justify-center text-white font-bold">
                      {token.ticker.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-museum-black">{token.ticker}</h3>
                      <p className="text-xs text-museum-dark-gray">
                        {token.tx_count.toLocaleString()} txs
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      isMintComplete
                        ? 'bg-green-50 text-green-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {isMintComplete ? 'Complete' : 'Minting'}
                  </span>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-museum-dark-gray">Max Supply</span>
                    <span className="text-museum-black font-medium">
                      {formatBRC20Amount(token.max_supply, token.decimals)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-museum-dark-gray">Minted</span>
                    <span className="text-museum-black font-medium">
                      {formatBRC20Amount(token.minted_supply, token.decimals)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-museum-dark-gray">Mint Progress</span>
                      <span className="text-museum-black">{mintProgress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-museum-cream rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isMintComplete ? 'bg-green-500' : 'bg-gold-500'
                        }`}
                        style={{ width: `${Math.min(mintProgress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-museum-dark-gray">Limit/Mint</span>
                    <span className="text-museum-black font-medium">
                      {formatBRC20Amount(token.mint_limit, token.decimals)}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-museum-light-gray flex justify-between items-center">
                  <span className="text-xs text-museum-dark-gray">
                    {new Date(token.deploy_timestamp).toLocaleDateString()}
                  </span>
                  <a
                    href={`https://ordinals.com/inscription/${token.inscription_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-600 hover:text-gold-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More
                <ChevronDown className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
