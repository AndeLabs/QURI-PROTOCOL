/**
 * Infinite Scroll Hook for Runes
 * Uses TanStack Query for efficient data fetching with pagination
 * Now uses list_indexed_runes for synced data from Hiro
 */

import React from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getRegistryActor } from '@/lib/icp/actors';
import type { RegistryEntry, Page, PagedResponse, RuneSortBy, SortOrder } from '@/types/canisters';

// Convert IndexedRune to RegistryEntry format
function indexedToRegistryEntry(rune: any): RegistryEntry {
  // Ensure timestamp is BigInt
  const timestamp = typeof rune.timestamp === 'bigint' ? rune.timestamp : BigInt(rune.timestamp);

  return {
    metadata: {
      key: {
        block: typeof rune.id.block === 'bigint' ? rune.id.block : BigInt(rune.id.block),
        tx: Number(rune.id.tx_index),
      },
      name: rune.name,
      symbol: rune.symbol,
      divisibility: Number(rune.decimals),
      total_supply: typeof rune.total_supply === 'bigint' ? rune.total_supply : BigInt(rune.total_supply),
      premine: typeof rune.premine === 'bigint' ? rune.premine : BigInt(rune.premine),
      terms: rune.terms && rune.terms.length > 0 ? [{
        amount: typeof rune.terms[0].amount === 'bigint' ? rune.terms[0].amount : BigInt(rune.terms[0].amount || 0),
        cap: typeof rune.terms[0].cap === 'bigint' ? rune.terms[0].cap : BigInt(rune.terms[0].cap || 0),
        height_start: rune.terms[0].height_start ? [BigInt(rune.terms[0].height_start)] : [],
        height_end: rune.terms[0].height_end ? [BigInt(rune.terms[0].height_end)] : [],
        offset_start: [],
        offset_end: [],
      }] as [any] : [],
      creator: rune.etcher || 'unknown',
      created_at: timestamp,
    },
    bonding_curve: [],
    trading_volume_24h: 0n,
    holder_count: 0n,
    indexed_at: timestamp * 1000000n,
  };
}

interface UseInfiniteRunesOptions {
  pageSize?: number;
  sortBy?: RuneSortBy;
  sortOrder?: SortOrder;
  enabled?: boolean;
}

interface InfiniteRunesResult {
  runes: RegistryEntry[];
  total: bigint;
  hasMore: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useInfiniteRunes(options: UseInfiniteRunesOptions = {}): InfiniteRunesResult {
  const {
    pageSize = 24,
    sortBy = { Block: null },
    sortOrder = { Desc: null },
    enabled = true,
  } = options;

  // First get total count
  const { data: statsData } = useQuery({
    queryKey: ['runes', 'indexer-stats'],
    queryFn: async () => {
      const actor = await getRegistryActor();
      return await actor.get_indexer_stats();
    },
    staleTime: 60000,
  });

  const totalRunes = statsData?.total_runes ?? 0n;

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
    queryKey: ['runes', 'infinite', 'indexed', pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const actor = await getRegistryActor();

      const offset = BigInt(pageParam * pageSize);
      const limit = BigInt(pageSize);

      // Use list_indexed_runes which has the synced data
      const indexedRunes = await actor.list_indexed_runes(offset, limit);

      // Convert to RegistryEntry format
      const items = indexedRunes.map(indexedToRegistryEntry);

      return {
        items,
        total: totalRunes,
        offset,
        limit,
        has_more: offset + limit < totalRunes,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentOffset = Number(lastPage.offset);
      const totalItems = Number(lastPage.total);
      const nextOffset = currentOffset + Number(lastPage.limit);

      if (nextOffset < totalItems) {
        return allPages.length;
      }
      return undefined;
    },
    initialPageParam: 0,
    enabled,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Flatten all pages into a single array
  const runes = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0n;
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
 * Hook for searching runes - HYBRID FAST VERSION
 * - Instant local search (0ms) for already loaded runes
 * - Parallel canister search for additional results
 * - Combines both for best UX
 */
export function useInfiniteRuneSearch(
  query: string,
  options: Omit<UseInfiniteRunesOptions, 'sortBy' | 'sortOrder'> & {
    localRunes?: RegistryEntry[];
  } = {}
) {
  const { pageSize = 30, enabled = true, localRunes = [] } = options;

  // Instant local search - filters already loaded runes (0ms)
  const localResults = React.useMemo(() => {
    if (!query || query.length < 2 || localRunes.length === 0) {
      return [];
    }

    const searchLower = query.toLowerCase();
    const searchNormalized = query.toUpperCase().replace(/[•.\s]/g, '');

    return localRunes.filter((rune) => {
      const name = rune.metadata.name.toLowerCase();
      const nameNormalized = rune.metadata.name.toUpperCase().replace(/[•.\s]/g, '');
      const symbol = rune.metadata.symbol.toLowerCase();

      return (
        nameNormalized.includes(searchNormalized) ||
        name.includes(searchLower) ||
        symbol.includes(searchLower) ||
        symbol === searchLower
      );
    }).slice(0, 20); // Limit local results
  }, [query, localRunes]);

  // Canister search - for additional results (has latency)
  const {
    data: canisterData,
    isLoading: isCanisterLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['runes', 'search', 'canister', query],
    queryFn: async () => {
      const actor = await getRegistryActor();
      const result = await actor.search_runes(query, 0n, BigInt(pageSize));
      return result.results;
    },
    enabled: enabled && query.length >= 2,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Combine results: local first (instant), then canister (deduplicated)
  const runes = React.useMemo(() => {
    const combined: RegistryEntry[] = [...localResults];
    const seenKeys = new Set(
      localResults.map((r) => `${r.metadata.key.block}:${r.metadata.key.tx}`)
    );

    // Add canister results that aren't already in local
    if (canisterData) {
      for (const rune of canisterData) {
        const key = `${rune.metadata.key.block}:${rune.metadata.key.tx}`;
        if (!seenKeys.has(key)) {
          combined.push(rune);
          seenKeys.add(key);
        }
      }
    }

    // Sort by relevance
    const searchNormalized = query.toUpperCase().replace(/[•.\s]/g, '');
    combined.sort((a, b) => {
      const aName = a.metadata.name.toUpperCase().replace(/[•.\s]/g, '');
      const bName = b.metadata.name.toUpperCase().replace(/[•.\s]/g, '');

      // Exact match first
      if (aName === searchNormalized && bName !== searchNormalized) return -1;
      if (bName === searchNormalized && aName !== searchNormalized) return 1;

      // Starts with query
      if (aName.startsWith(searchNormalized) && !bName.startsWith(searchNormalized)) return -1;
      if (bName.startsWith(searchNormalized) && !aName.startsWith(searchNormalized)) return 1;

      return 0;
    });

    return combined;
  }, [localResults, canisterData, query]);

  // Show loading only if no local results and canister is loading
  const isLoading = localResults.length === 0 && isCanisterLoading;

  return {
    runes,
    total: BigInt(runes.length),
    hasMore: false,
    fetchNextPage: () => {},
    isFetchingNextPage: false,
    isLoading,
    isSearchingCanister: isCanisterLoading, // New: indicates background search
    isError,
    error: error as Error | null,
    refetch,
  };
}
