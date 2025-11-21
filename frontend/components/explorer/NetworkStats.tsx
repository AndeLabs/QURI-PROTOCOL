'use client';

/**
 * Network Stats Widget
 * Displays Bitcoin network information
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  Clock,
  Zap,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Database,
} from 'lucide-react';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import { useLatestBlock } from '@/hooks/useRunesIndexer';
import { formatBlockHeight } from '@/lib/utils/format';
import { staggerContainer, staggerItem, prefersReducedMotion } from '@/design-system/motion/presets';

interface NetworkStatsProps {
  className?: string;
  compact?: boolean;
}

export function NetworkStats({ className = '', compact = false }: NetworkStatsProps) {
  const { getBitcoinBlockHeight, estimateEtchingFee } = useRuneEngine();
  const { data: indexerBlock, refetch: refetchIndexer, isLoading: indexerLoading } = useLatestBlock();

  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [feeEstimate, setFeeEstimate] = useState<{
    slow: number;
    medium: number;
    fast: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check reduced motion on client only
  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load block height
      const height = await getBitcoinBlockHeight();
      if (height) setBlockHeight(height);

      // Load fee estimates
      const slowFee = await estimateEtchingFee('slow');
      const mediumFee = await estimateEtchingFee('medium');
      const fastFee = await estimateEtchingFee('fast');

      if (slowFee && mediumFee && fastFee) {
        setFeeEstimate({
          slow: Number(slowFee.feeRate),
          medium: Number(mediumFee.feeRate),
          fast: Number(fastFee.feeRate),
        });
      }

      // Refresh indexer data
      refetchIndexer();

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load network stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Refresh every 60 seconds
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <div className={`bg-museum-white border border-museum-light-gray rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-museum-black flex items-center gap-2">
            <Cpu className="h-4 w-4 text-gold-600" />
            Network
          </h4>
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-1 hover:bg-museum-cream rounded transition-colors"
          >
            <RefreshCw className={`h-3 w-3 text-museum-dark-gray ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-museum-dark-gray">Block</span>
            <span className="font-mono font-medium text-museum-black">
              {blockHeight ? formatBlockHeight(blockHeight) : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-museum-dark-gray">Indexer</span>
            <span className="font-mono font-medium text-museum-black">
              {indexerBlock ? formatBlockHeight(indexerBlock.height) : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-museum-dark-gray">Fee (med)</span>
            <span className="font-mono font-medium text-museum-black">
              {feeEstimate ? `${feeEstimate.medium} sat/vB` : '-'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-museum-white border border-museum-light-gray rounded-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-museum-light-gray">
        <h3 className="font-semibold text-museum-black flex items-center gap-2">
          <Cpu className="h-5 w-5 text-gold-600" />
          Bitcoin Network
        </h3>
        <button
          onClick={loadStats}
          disabled={loading}
          className="p-2 hover:bg-museum-cream rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 text-museum-dark-gray ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="p-4 space-y-4">
        {/* Block Height */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-museum-dark-gray">Block Height</p>
            <p className="font-mono font-semibold text-museum-black">
              {blockHeight ? formatBlockHeight(blockHeight) : '-'}
            </p>
          </div>
        </div>

        {/* Omnity Indexer Status */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Database className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-museum-dark-gray">Runes Indexer</p>
            <p className="font-mono font-semibold text-museum-black">
              {indexerBlock ? formatBlockHeight(indexerBlock.height) : indexerLoading ? '...' : '-'}
            </p>
            {indexerBlock && (
              <p className="text-xs text-museum-dark-gray truncate" title={indexerBlock.hash}>
                {indexerBlock.hash.slice(0, 8)}...
              </p>
            )}
          </div>
        </div>

        {/* Fee Estimates */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Zap className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-xs text-museum-dark-gray">Fee Estimates (sat/vB)</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Slow', value: feeEstimate?.slow, color: 'bg-green-100 text-green-800' },
              { label: 'Medium', value: feeEstimate?.medium, color: 'bg-yellow-100 text-yellow-800' },
              { label: 'Fast', value: feeEstimate?.fast, color: 'bg-red-100 text-red-800' },
            ].map((fee) => (
              <div
                key={fee.label}
                className={`rounded-lg p-2 text-center ${fee.color}`}
              >
                <p className="text-xs opacity-75">{fee.label}</p>
                <p className="font-mono font-semibold text-sm">
                  {fee.value ?? '-'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-museum-dark-gray pt-2 border-t border-museum-light-gray">
            <Clock className="h-3 w-3" />
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="p-3 bg-museum-cream/30 border-t border-museum-light-gray">
        <a
          href="https://mempool.space"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gold-600 hover:text-gold-700 font-medium flex items-center justify-center gap-1"
        >
          View on Mempool.space
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
