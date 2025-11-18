/**
 * Modular RuneCard Component
 * Reusable card for displaying Rune information
 */

import Link from 'next/link';
import { ArrowUpRight, Coins, Users, Activity, ExternalLink } from 'lucide-react';
import type { RegistryEntry } from '@/types/canisters';

interface RuneCardProps {
  rune: RegistryEntry;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  className?: string;
}

export function RuneCard({
  rune,
  variant = 'default',
  showActions = true,
  className = '',
}: RuneCardProps) {
  const { metadata } = rune;

  // Format supply with divisibility
  const formatSupply = (amount: bigint, divisibility: number): string => {
    const value = Number(amount) / Math.pow(10, divisibility);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.min(divisibility, 4),
    });
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        className={`border border-museum-light-gray rounded-lg p-4 bg-museum-white hover:border-gold-300 transition-colors ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-museum-black">{metadata.name}</h3>
            <p className="text-sm text-museum-dark-gray">{metadata.symbol}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-museum-black">
              {formatSupply(metadata.premine, metadata.divisibility)}
            </p>
            <p className="text-xs text-museum-dark-gray">Supply</p>
          </div>
        </div>
      </div>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div
        className={`border border-museum-light-gray rounded-xl p-6 bg-museum-white hover:border-gold-300 transition-all hover:shadow-lg ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-serif text-2xl font-bold text-museum-black">
              {metadata.name}
            </h3>
            <p className="text-museum-dark-gray mt-1">{metadata.symbol}</p>
          </div>
          {/* TODO: Enable when backend adds verified field */}
          {/* {rune.verified && (
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              ✓ Verified
            </div>
          )} */}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-museum-cream rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-museum-dark-gray" />
              <span className="text-xs text-museum-dark-gray">Supply</span>
            </div>
            <p className="text-lg font-bold text-museum-black">
              {formatSupply(metadata.premine, metadata.divisibility)}
            </p>
          </div>

          <div className="bg-museum-cream rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-museum-dark-gray" />
              <span className="text-xs text-museum-dark-gray">Holders</span>
            </div>
            <p className="text-lg font-bold text-museum-black">
              {rune.holder_count?.toString() || '0'}
            </p>
          </div>

          <div className="bg-museum-cream rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-museum-dark-gray" />
              <span className="text-xs text-museum-dark-gray">24h Volume</span>
            </div>
            <p className="text-lg font-bold text-museum-black">
              {rune.trading_volume_24h ? Number(rune.trading_volume_24h).toLocaleString() : '0'}
            </p>
          </div>

          <div className="bg-museum-cream rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-museum-dark-gray" />
              <span className="text-xs text-museum-dark-gray">Divisibility</span>
            </div>
            <p className="text-lg font-bold text-museum-black">
              {metadata.divisibility}
            </p>
          </div>
        </div>

        {/* Mint Terms */}
        {metadata.terms.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-blue-900 mb-2">Mint Terms Active</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-blue-700">Amount per mint:</span>
                <p className="font-semibold text-blue-900">
                  {metadata.terms[0] ? formatSupply(metadata.terms[0].amount, metadata.divisibility) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-blue-700">Total cap:</span>
                <p className="font-semibold text-blue-900">
                  {metadata.terms[0]?.cap.toString() || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-museum-dark-gray">Created</span>
            <span className="font-mono text-museum-black">
              Block #{metadata.created_at?.toString() || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-museum-dark-gray">Rune ID</span>
            <span className="font-mono text-xs text-museum-black">{metadata.key.block.toString()}:{metadata.key.tx}</span>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            <a
              href={`https://mempool.space/rune/${metadata.key.block}:${metadata.key.tx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-museum-light-gray rounded-lg hover:border-gold-300 hover:bg-museum-cream transition-colors text-sm font-medium text-museum-black"
            >
              View on Bitcoin
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`border border-museum-light-gray rounded-xl p-6 bg-museum-white hover:border-gold-300 transition-all hover:shadow-md ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-museum-black">{metadata.name}</h3>
          <p className="text-sm text-museum-dark-gray mt-1">{metadata.symbol}</p>
        </div>
        {/* TODO: Enable when backend adds verified field */}
        {/* {rune.verified && (
          <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            ✓
          </div>
        )} */}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-museum-cream rounded-lg p-3">
          <p className="text-xs text-museum-dark-gray mb-1">Supply</p>
          <p className="font-semibold text-museum-black">
            {formatSupply(metadata.premine, metadata.divisibility)}
          </p>
        </div>
        <div className="bg-museum-cream rounded-lg p-3">
          <p className="text-xs text-museum-dark-gray mb-1">Holders</p>
          <p className="font-semibold text-museum-black">
            {rune.holder_count?.toString() || '0'}
          </p>
        </div>
      </div>

      {/* Action */}
      {showActions && (
        <a
          href={`https://mempool.space/rune/${metadata.key.block}:${metadata.key.tx}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          View Details
          <ArrowUpRight className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
