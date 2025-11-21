/**
 * useRuneExplorer Hook
 * Unified hook for exploring runes with search and filters
 *
 * Features:
 * - Server-side search using indexed_runes
 * - Server-side sorting and pagination
 * - Infinite scroll support
 * - Unified state management
 * - Instant local search as fallback
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getRegistryActor } from '@/lib/icp/actors';
import type { RegistryEntry, RuneSortBy, SortOrder } from '@/types/canisters';

// ============================================================================
// TYPES
// ============================================================================

export interface RuneExplorerFilters {
  /** Search query for name, symbol, or ID */
  search: string;
  /** Sort by field */
  sortBy: RuneSortBy;
  /** Sort order */
  sortOrder: SortOrder;
  /** Show only verified runes */
  showVerifiedOnly?: boolean;
}

export interface UseRuneExplorerOptions {
  /** Initial filters */
  initialFilters?: Partial<RuneExplorerFilters>;
  /** Page size for pagination */
  pageSize?: number;
  /** Enable the query */
  enabled?: boolean;
  /** Use search mode (search_indexed_runes) instead of list mode */
  searchMode?: boolean;
}

export interface UseRuneExplorerResult {
  /** Filtered runes */
  runes: RegistryEntry[];
  /** Total count from server */
  totalCount: bigint;
  /** Current filters */
  filters: RuneExplorerFilters;
  /** Update filters */
  setFilters: (filters: Partial<RuneExplorerFilters>) => void;
  /** Clear search */
  clearSearch: () => void;
  /** Fetch next page */
  fetchNextPage: () => void;
  /** Has more pages */
  hasMore: boolean;
  /** Is fetching next page */
  isFetchingNextPage: boolean;
  /** Is loading initial data */
  isLoading: boolean;
  /** Is error */
  isError: boolean;
  /** Error message */
  error: Error | null;
  /** Refetch data */
  refetch: () => void;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_FILTERS: RuneExplorerFilters = {
  search: '',
  sortBy: { Block: null },
  sortOrder: { Desc: null },
  showVerifiedOnly: false,
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useRuneExplorer(
  options: UseRuneExplorerOptions = {}
): UseRuneExplorerResult {
  const {
    initialFilters = {},
    pageSize = 24,
    enabled = true,
  } = options;

  // State
  const [filters, setFiltersState] = useState<RuneExplorerFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Determine if we should use search mode
  const useSearchMode = filters.search.length >= 2;

  console.log('[useRuneExplorer] Mode:', useSearchMode ? 'SEARCH' : 'LIST', 'query:', filters.search);

  // ============================================================================
  // SEARCH MODE: Use search_indexed_runes when there's a query
  // ============================================================================

  const {
    data: searchData,
    isLoading: isSearchLoading,
    isError: isSearchError,
    error: searchError,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ['rune-explorer', 'search', filters.search, pageSize],
    queryFn: async () => {
      const actor = await getRegistryActor();
      const result = await actor.search_indexed_runes(
        filters.search,
        0n,
        BigInt(pageSize * 3) // Fetch more for search to show good results
      );

      // Convert IndexedRune to RegistryEntry
      const runes = result.results.map((rune: any): RegistryEntry => {
        const terms = rune.terms && rune.terms.length > 0 ? rune.terms[0] : null;
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
            terms: terms ? [{
              amount: typeof terms.amount === 'bigint' ? terms.amount : BigInt(terms.amount || 0),
              cap: typeof terms.cap === 'bigint' ? terms.cap : BigInt(terms.cap || 0),
              height_start: terms.height_start ? [BigInt(terms.height_start)] : [],
              height_end: terms.height_end ? [BigInt(terms.height_end)] : [],
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
      });

      return {
        runes,
        total: result.total_matches,
      };
    },
    enabled: enabled && useSearchMode,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // ============================================================================
  // LIST MODE: Use list_indexed_runes with infinite scroll when no search query
  // ============================================================================

  const {
    data: listData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
    refetch: refetchList,
  } = useInfiniteQuery({
    queryKey: ['rune-explorer', 'list', JSON.stringify(filters.sortBy), JSON.stringify(filters.sortOrder), pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      console.log('[useRuneExplorer] LIST query fetching page:', pageParam);
      const actor = await getRegistryActor();

      // Use list_indexed_runes to get the synced runes from Hiro
      const offset = BigInt(pageParam * pageSize);
      const limit = BigInt(pageSize);
      const rawRunes = await actor.list_indexed_runes(offset, limit);

      console.log('[useRuneExplorer] list_indexed_runes - fetched:', rawRunes.length, 'offset:', offset, 'limit:', limit);

      // Get total count from indexer stats
      const stats = await actor.get_indexer_stats();
      const total = stats.total_runes;

      // Convert IndexedRune to RegistryEntry
      const runes = rawRunes.map((rune: any): RegistryEntry => {
        const terms = rune.terms && rune.terms.length > 0 ? rune.terms[0] : null;
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
            terms: terms ? [{
              amount: typeof terms.amount === 'bigint' ? terms.amount : BigInt(terms.amount || 0),
              cap: typeof terms.cap === 'bigint' ? terms.cap : BigInt(terms.cap || 0),
              height_start: terms.height_start ? [BigInt(terms.height_start)] : [],
              height_end: terms.height_end ? [BigInt(terms.height_end)] : [],
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
      });

      console.log('[useRuneExplorer] list_indexed_runes OK - converted:', runes.length, 'total:', total);

      return {
        runes,
        total,
        hasMore: rawRunes.length === pageSize,
        offset: pageParam,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length;
      }
      return undefined;
    },
    initialPageParam: 0,
    enabled: enabled && !useSearchMode,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // ============================================================================
  // COMBINE RESULTS
  // ============================================================================

  const runes = useMemo(() => {
    if (useSearchMode && searchData) {
      console.log('[useRuneExplorer] Using SEARCH results:', searchData.runes.length);
      return searchData.runes;
    }

    if (listData) {
      const allRunes = listData.pages.flatMap(page => page.runes);
      console.log('[useRuneExplorer] Using LIST results:', allRunes.length, 'pages:', listData.pages.length);
      return allRunes;
    }

    console.log('[useRuneExplorer] No data yet');
    return [];
  }, [useSearchMode, searchData, listData]);

  const totalCount = useMemo(() => {
    if (useSearchMode && searchData) {
      return searchData.total;
    }

    if (listData && listData.pages.length > 0) {
      return listData.pages[0].total;
    }

    return 0n;
  }, [useSearchMode, searchData, listData]);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const setFilters = useCallback((newFilters: Partial<RuneExplorerFilters>) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const clearSearch = useCallback(() => {
    setFiltersState(prev => ({
      ...prev,
      search: '',
    }));
  }, []);

  const refetch = useCallback(() => {
    if (useSearchMode) {
      refetchSearch();
    } else {
      refetchList();
    }
  }, [useSearchMode, refetchSearch, refetchList]);

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  const isLoading = useSearchMode ? isSearchLoading : isListLoading;
  const isError = useSearchMode ? isSearchError : isListError;
  const error = (useSearchMode ? searchError : listError) as Error | null;
  const hasMore = useSearchMode ? false : (hasNextPage ?? false);

  return {
    runes,
    totalCount,
    filters,
    setFilters,
    clearSearch,
    fetchNextPage,
    hasMore,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  };
}

export default useRuneExplorer;
