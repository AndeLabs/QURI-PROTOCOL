'use client';

/**
 * RuneCardSimple - Clean, SSR-safe Rune Card
 *
 * Features:
 * - No hydration issues
 * - CSS-based hover effects
 * - Clean, modular design
 * - TypeScript strict
 */

import { useRouter } from 'next/navigation';
import { ExternalLink, Coins, Users } from 'lucide-react';
import type { RegistryEntry } from '@/types/canisters';
import { formatFullPrecision } from '@/lib/utils/format';

interface RuneCardSimpleProps {
  rune: RegistryEntry;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  className?: string;
}

export function RuneCardSimple({
  rune,
  variant = 'default',
  showActions = true,
  className = '',
}: RuneCardSimpleProps) {
  const { metadata } = rune;
  const router = useRouter();

  // Generate the detail page URL
  const detailUrl = `/explorer/rune/${metadata.key.block}:${metadata.key.tx}`;

  // Navigate to detail page
  const handleCardClick = () => {
    router.push(detailUrl);
  };

  // Format supply with full precision (NO ROUNDING for blockchain)
  const formatSupply = (amount: bigint, divisibility: number): string => {
    const safeDivisibility = Math.max(0, Math.min(divisibility || 0, 20));
    const { display } = formatFullPrecision(amount, safeDivisibility);
    return display;
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        onClick={handleCardClick}
        className={`
          bg-gradient-to-br from-white via-gray-50 to-white
          border border-gray-200 rounded-lg p-4 cursor-pointer
          hover:shadow-lg hover:border-amber-300 hover:-translate-y-1
          transition-all duration-200 ease-out
          ${className}
        `}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-semibold text-gray-900 truncate" title={metadata.name}>
              {metadata.name}
            </h3>
            <p className="text-sm text-gray-600 truncate">{metadata.symbol}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-mono tabular-nums font-medium text-gray-900" title={formatSupply(metadata.premine, metadata.divisibility)}>
              {formatSupply(metadata.premine, metadata.divisibility)}
            </p>
            <p className="text-xs text-gray-500">Supply</p>
          </div>
        </div>
      </div>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div
        onClick={handleCardClick}
        className={`
          bg-gradient-to-br from-white via-gray-50 to-white
          border border-gray-200 rounded-xl p-6 cursor-pointer
          hover:shadow-xl hover:border-amber-300 hover:-translate-y-2
          transition-all duration-300 ease-out
          ${className}
        `}
      >
        {/* Header */}
        <div className="mb-4">
          <h3 className="font-serif text-2xl font-bold text-gray-900 truncate" title={metadata.name}>
            {metadata.name}
          </h3>
          <p className="text-gray-600 mt-1 truncate">{metadata.symbol}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-100 rounded-lg p-3 hover:bg-amber-50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-gray-600">Supply</span>
            </div>
            <p className="font-mono tabular-nums font-semibold text-gray-900 truncate" title={formatSupply(metadata.premine, metadata.divisibility)}>
              {formatSupply(metadata.premine, metadata.divisibility)}
            </p>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 hover:bg-amber-50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-gray-600">Holders</span>
            </div>
            <p className="font-mono tabular-nums font-semibold text-gray-900">
              {rune.holder_count?.toString() || '0'}
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">Rune ID</span>
            <span className="font-mono text-gray-900">
              {metadata.key.block.toString()}:{metadata.key.tx}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Divisibility</span>
            <span className="font-mono text-gray-900">
              {metadata.divisibility}
            </span>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <a
            href={`https://mempool.space/rune/${metadata.key.block}:${metadata.key.tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-amber-200 rounded-lg hover:bg-amber-50 hover:border-amber-400 transition-all text-sm font-medium text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            View on Bitcoin
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      onClick={handleCardClick}
      className={`
        bg-gradient-to-br from-white via-gray-50 to-white
        border border-gray-200 rounded-xl p-5 cursor-pointer
        hover:shadow-lg hover:border-amber-300 hover:-translate-y-1
        transition-all duration-200 ease-out
        ${className}
      `}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-serif text-xl font-bold text-gray-900 truncate" title={metadata.name}>
          {metadata.name}
        </h3>
        <p className="text-sm text-gray-600 mt-1 truncate">{metadata.symbol}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-100 rounded-lg p-3 hover:bg-amber-50 transition-colors">
          <p className="text-xs text-gray-500 mb-1">Supply</p>
          <p className="font-mono tabular-nums font-semibold text-gray-900 truncate" title={formatSupply(metadata.premine, metadata.divisibility)}>
            {formatSupply(metadata.premine, metadata.divisibility)}
          </p>
        </div>
        <div className="bg-gray-100 rounded-lg p-3 hover:bg-amber-50 transition-colors">
          <p className="text-xs text-gray-500 mb-1">Holders</p>
          <p className="font-mono tabular-nums font-semibold text-gray-900">
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
          className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 transition-colors font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          View on Bitcoin
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
