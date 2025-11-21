'use client';

/**
 * RuneGridSimple - Clean, SSR-safe Rune Grid
 *
 * Features:
 * - No hydration issues
 * - Responsive grid layout
 * - Loading and empty states
 * - TypeScript strict
 */

import { Loader, Coins } from 'lucide-react';
import { RuneCardSimple } from './RuneCardSimple';
import type { RegistryEntry } from '@/types/canisters';

interface RuneGridSimpleProps {
  runes: RegistryEntry[];
  loading?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
}

export function RuneGridSimple({
  runes,
  loading = false,
  variant = 'default',
  emptyMessage = 'No Runes found',
  emptyDescription = 'Try adjusting your filters or create your first Rune',
  className = '',
}: RuneGridSimpleProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Runes...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (runes.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
        <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
          {emptyMessage}
        </h3>
        <p className="text-gray-600">{emptyDescription}</p>
      </div>
    );
  }

  // Grid layout based on variant
  const gridClass =
    variant === 'compact'
      ? 'grid grid-cols-1 gap-3'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

  // Debug log
  console.log('[RuneGridSimple] Rendering', runes.length, 'runes');

  return (
    <div className={`${gridClass} ${className}`}>
      {runes.length === 0 && !loading && (
        <div className="col-span-full text-center py-8 text-red-500">
          DEBUG: No runes to display
        </div>
      )}
      {runes.map((rune, index) => {
        // Debug first rune
        if (index === 0) {
          console.log('[RuneGridSimple] First rune:', rune.metadata.name);
        }
        return (
          <RuneCardSimple
            key={`${rune.metadata.key.block}:${rune.metadata.key.tx}`}
            rune={rune}
            variant={variant}
          />
        );
      })}
    </div>
  );
}
