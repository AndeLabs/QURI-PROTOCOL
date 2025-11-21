/**
 * useIndexedRunes Hook
 * Fetches indexed Bitcoin Runes from the registry canister
 * These are real runes indexed from the Bitcoin network via Hiro API
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getRegistryActor } from '@/lib/icp/actors';
import {
  IndexedRune as CandidIndexedRune,
  IndexerStats,
  IndexedSearchResult
} from '@/types/canisters';

// Re-export types for consumers
export type { IndexerStats };

// Local type that matches what we transform to for UI
export interface IndexedRune {
  id: {
    block: bigint;
    tx_index: number;
  };
  name: string;
  symbol: string;
  decimals: number;
  total_supply: bigint;
  premine: bigint;
  block_height: bigint;
  txid: string;
  timestamp: bigint;
  etcher: string;
  terms: {
    amount: bigint;
    cap: bigint;
    height_start: bigint | null;
    height_end: bigint | null;
  } | null;
}

// Transform Candid IndexedRune to our local type
function transformIndexedRune(candid: CandidIndexedRune): IndexedRune {
  let terms: IndexedRune['terms'] = null;

  const candidTerms = candid.terms[0];
  if (candidTerms) {
    terms = {
      amount: candidTerms.amount,
      cap: candidTerms.cap,
      height_start: candidTerms.height_start[0] ?? null,
      height_end: candidTerms.height_end[0] ?? null,
    };
  }

  return {
    id: candid.id,
    name: candid.name,
    symbol: candid.symbol,
    decimals: candid.decimals,
    total_supply: candid.total_supply,
    premine: candid.premine,
    block_height: candid.block_height,
    txid: candid.txid,
    timestamp: candid.timestamp,
    etcher: candid.etcher,
    terms,
  };
}

interface UseIndexedRunesOptions {
  pageSize?: number;
  enabled?: boolean;
}

interface IndexedRunesResult {
  runes: IndexedRune[];
  total: bigint;
  hasMore: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching indexed runes with infinite scroll
 */
export function useIndexedRunes(options: UseIndexedRunesOptions = {}): IndexedRunesResult {
  const { pageSize = 24, enabled = true } = options;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['indexed-runes', 'infinite', pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const actor = await getRegistryActor();

      const offset = BigInt(pageParam * pageSize);
      const limit = BigInt(pageSize);

      const rawRunes = await actor.list_indexed_runes(offset, limit);
      const runes = rawRunes.map(transformIndexedRune);

      return {
        runes,
        offset: pageParam,
        hasMore: runes.length === pageSize,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length;
      }
      return undefined;
    },
    initialPageParam: 0,
    enabled,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Flatten all pages into a single array
  const runes = data?.pages.flatMap((page) => page.runes) ?? [];

  // Get total from indexer stats
  const { data: stats } = useIndexerStats();
  const total = stats?.total_runes ?? 0n;

  const hasMore = hasNextPage ?? false;

  return {
    runes,
    total,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook for fetching indexer statistics
 */
export function useIndexerStats() {
  return useQuery({
    queryKey: ['indexer-stats'],
    queryFn: async () => {
      const actor = await getRegistryActor();
      const stats = await actor.get_indexer_stats();
      return stats as IndexerStats;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching a single indexed rune by ID
 */
export function useIndexedRune(block: bigint, txIndex: number) {
  return useQuery({
    queryKey: ['indexed-rune', block.toString(), txIndex],
    queryFn: async () => {
      const actor = await getRegistryActor();
      const rune = await actor.get_indexed_rune({
        block,
        tx_index: txIndex,
      });
      return rune[0] ? transformIndexedRune(rune[0]) : null; // Returns Option<IndexedRune>
    },
    enabled: block > 0n,
    staleTime: 60000,
  });
}

/**
 * Hook for searching indexed runes
 */
export function useSearchIndexedRunes(query: string, options: UseIndexedRunesOptions = {}) {
  const { pageSize = 24, enabled = true } = options;

  return useQuery({
    queryKey: ['indexed-runes', 'search', query, pageSize],
    queryFn: async () => {
      const actor = await getRegistryActor();
      const result = await actor.search_indexed_runes(
        query,
        0n,
        BigInt(pageSize)
      );
      return {
        runes: result.results.map(transformIndexedRune),
        total: result.total_matches,
      };
    },
    enabled: enabled && query.length > 0,
    staleTime: 30000,
  });
}

/**
 * Hook for syncing runes from Hiro API
 */
export function useSyncRunes() {
  const syncRunes = async (offset: number, limit: number) => {
    const actor = await getRegistryActor();
    const result = await actor.sync_runes_from_hiro(offset, limit);

    if ('Ok' in result) {
      return result.Ok;
    } else {
      throw new Error(result.Err);
    }
  };

  const getHiroTotal = async () => {
    const actor = await getRegistryActor();
    const result = await actor.get_hiro_total();

    if ('Ok' in result) {
      return result.Ok;
    } else {
      throw new Error(result.Err);
    }
  };

  return { syncRunes, getHiroTotal };
}

export default useIndexedRunes;
