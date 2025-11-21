/**
 * useRunes Hook (v2)
 * New architecture using TanStack Query with Hiro API services
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { runesQueries } from '@/lib/queries';
import type { RunesFilters } from '@/lib/api/hiro/types';

/**
 * Get paginated list of runes
 */
export function useRunes(filters?: RunesFilters) {
  return useInfiniteQuery(runesQueries.list(filters));
}

/**
 * Get single rune by ID or name
 */
export function useRune(id: string) {
  return useQuery(runesQueries.detail(id));
}

/**
 * Get rune holders
 */
export function useRuneHolders(id: string) {
  return useQuery(runesQueries.holders(id));
}

/**
 * Get rune activities
 */
export function useRuneActivities(id: string) {
  return useInfiniteQuery(runesQueries.runeActivities(id));
}

/**
 * Get address rune balances
 */
export function useAddressRuneBalances(address: string) {
  return useQuery(runesQueries.addressBalances(address));
}

/**
 * Get address rune activities
 */
export function useAddressRuneActivities(address: string) {
  return useInfiniteQuery(runesQueries.addressActivities(address));
}

/**
 * Helper to flatten paginated rune data
 */
export function useFlatRunes(filters?: RunesFilters) {
  const query = useRunes(filters);

  const runes = query.data?.pages.flatMap((page) => page.results) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  // Debug log
  if (process.env.NODE_ENV === 'development') {
    console.log('[useFlatRunes]', {
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      pagesCount: query.data?.pages.length,
      runesCount: runes.length,
      total,
      hasNextPage: query.hasNextPage,
    });
  }

  return {
    ...query,
    runes,
    total,
    // Alias for compatibility with existing code
    hasMore: query.hasNextPage,
  };
}

/**
 * Helper to format rune supply with divisibility
 */
export function formatRuneAmount(amount: string, divisibility: number): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** divisibility);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;

  if (fractionalPart === 0n) {
    return integerPart.toLocaleString();
  }

  const fractionalStr = fractionalPart.toString().padStart(divisibility, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');

  return `${integerPart.toLocaleString()}.${trimmedFractional}`;
}
