/**
 * useBRC-20 Hook
 * TanStack Query hooks for BRC-20 tokens
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { brc20Queries } from '@/lib/queries';
import type { BRC20Filters } from '@/lib/api/hiro/types';

/**
 * Get paginated list of BRC-20 tokens
 */
export function useBRC20Tokens(filters?: BRC20Filters) {
  return useInfiniteQuery(brc20Queries.list(filters));
}

/**
 * Get single BRC-20 token details
 */
export function useBRC20Token(ticker: string) {
  return useQuery(brc20Queries.token(ticker));
}

/**
 * Get BRC-20 token holders
 */
export function useBRC20Holders(ticker: string) {
  return useInfiniteQuery(brc20Queries.holders(ticker));
}

/**
 * Get address BRC-20 balances
 */
export function useAddressBRC20Balances(address: string) {
  return useQuery(brc20Queries.addressBalances(address));
}

/**
 * Get BRC-20 token activity
 */
export function useBRC20Activity(ticker: string) {
  return useInfiniteQuery(brc20Queries.tokenActivity(ticker));
}

/**
 * Helper to flatten paginated BRC-20 token data
 */
export function useFlatBRC20Tokens(filters?: BRC20Filters) {
  const query = useBRC20Tokens(filters);

  const tokens = query.data?.pages.flatMap((page) => page.results) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    tokens,
    total,
  };
}

/**
 * Helper to format BRC-20 amount with decimals
 */
export function formatBRC20Amount(amount: string, decimals: number = 18): string {
  try {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    if (fractionalPart === 0n) {
      return integerPart.toLocaleString();
    }

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '').slice(0, 6);

    if (trimmedFractional) {
      return `${integerPart.toLocaleString()}.${trimmedFractional}`;
    }

    return integerPart.toLocaleString();
  } catch {
    return amount;
  }
}

/**
 * Helper to calculate mint progress
 */
export function getMintProgress(mintedSupply: string, maxSupply: string): number {
  try {
    const minted = BigInt(mintedSupply);
    const max = BigInt(maxSupply);

    if (max === 0n) return 100;

    return Number((minted * 10000n) / max) / 100;
  } catch {
    return 0;
  }
}
