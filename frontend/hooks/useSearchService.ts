/**
 * useSearchService Hook
 *
 * Premium search service that provides:
 * - Zero-latency instant search using Fuse.js
 * - Automatic index building and updates
 * - Background sync with canister
 * - Optimized for large datasets
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  SearchEngine,
  getRuneSearchEngine,
  RUNE_SEARCH_CONFIG,
  type SearchResult,
  type SearchableItem
} from '@/lib/search/SearchEngine';
import { getRegistryActor } from '@/lib/icp/actors';
import type { RegistryEntry } from '@/types/canisters';

// ============================================================================
// TYPES
// ============================================================================

interface UseSearchServiceOptions {
  /** Pre-loaded runes to index immediately */
  initialRunes?: RegistryEntry[];
  /** Auto-sync with canister */
  autoSync?: boolean;
  /** Sync interval in ms */
  syncInterval?: number;
  /** Enable search */
  enabled?: boolean;
}

interface SearchServiceResult {
  /** Perform instant search */
  search: (query: string) => SearchResult<SearchableItem>[];
  /** Search results */
  results: SearchResult<SearchableItem>[];
  /** Current search query */
  query: string;
  /** Set search query (triggers search) */
  setQuery: (query: string) => void;
  /** Clear search */
  clearSearch: () => void;
  /** Is index built */
  isIndexReady: boolean;
  /** Is syncing with canister */
  isSyncing: boolean;
  /** Total items in index */
  indexSize: number;
  /** Manually trigger sync */
  syncWithCanister: () => void;
  /** Last sync time */
  lastSyncTime: Date | null;
}

// ============================================================================
// HELPER: Transform RegistryEntry to SearchableItem
// ============================================================================

function transformToSearchable(rune: RegistryEntry): SearchableItem {
  const name = rune.metadata.name;
  return {
    id: `${rune.metadata.key.block}:${rune.metadata.key.tx}`,
    name: name,
    // Normalized name for better matching (removes dots, bullets, spaces)
    normalizedName: name.toUpperCase().replace(/[•.\s]/g, ''),
    symbol: rune.metadata.symbol,
    // Include original data for access after search
    originalData: rune,
  };
}

// ============================================================================
// SIMPLE CACHE FOR SEARCH RESULTS
// ============================================================================

class SearchCache {
  private cache = new Map<string, { results: any[]; timestamp: number }>();
  private maxAge = 5000; // 5 seconds

  get(key: string): any[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    return entry.results;
  }

  set(key: string, results: any[]): void {
    // Limit cache size
    if (this.cache.size > 100) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { results, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSearchService(options: UseSearchServiceOptions = {}): SearchServiceResult {
  const {
    initialRunes = [],
    autoSync = true,
    syncInterval = 60000, // 1 minute
    enabled = true,
  } = options;

  // Search engine instance (singleton)
  const searchEngine = useMemo(() => getRuneSearchEngine(), []);

  // State
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResult<SearchableItem>[]>([]);
  const [isIndexReady, setIsIndexReady] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Ref to track if initial index was built
  const initialIndexBuilt = useRef(false);

  // Build index from initial runes
  useEffect(() => {
    if (initialRunes.length > 0 && !initialIndexBuilt.current) {
      const searchableItems = initialRunes.map(transformToSearchable);
      searchEngine.buildIndex(searchableItems);
      setIsIndexReady(true);
      initialIndexBuilt.current = true;
      setLastSyncTime(new Date());
    }
  }, [initialRunes, searchEngine]);

  // Fetch all runes for complete index
  const {
    data: allRunesData,
    isLoading: isSyncing,
    refetch: refetchRunes,
  } = useQuery({
    queryKey: ['search', 'all-runes', 'index'],
    queryFn: async () => {
      const actor = await getRegistryActor();

      // Fetch first page to get total
      const firstPage = await actor.list_runes([{
        offset: 0n,
        limit: 100n,
        sort_by: [],
        sort_order: [],
      }]);

      if ('Err' in firstPage) {
        throw new Error(firstPage.Err);
      }

      const total = Number(firstPage.Ok.total);
      const allRunes: RegistryEntry[] = [...firstPage.Ok.items];

      // Fetch remaining pages in parallel
      const remainingPages = Math.ceil((total - 100) / 100);
      if (remainingPages > 0) {
        const pagePromises = Array.from({ length: remainingPages }, async (_, i) => {
          const result = await actor.list_runes([{
            offset: BigInt((i + 1) * 100),
            limit: 100n,
            sort_by: [],
            sort_order: [],
          }]);
          if ('Ok' in result) {
            return result.Ok.items;
          }
          return [];
        });

        const pages = await Promise.all(pagePromises);
        pages.forEach(items => allRunes.push(...items));
      }

      return allRunes;
    },
    enabled: enabled && autoSync,
    staleTime: syncInterval,
    refetchInterval: syncInterval,
    refetchOnWindowFocus: false,
  });

  // Update index when all runes data changes
  useEffect(() => {
    if (allRunesData && allRunesData.length > 0) {
      const searchableItems = allRunesData.map(transformToSearchable);
      searchEngine.buildIndex(searchableItems);
      setIsIndexReady(true);
      setLastSyncTime(new Date());

      // Re-run search if there's an active query
      if (query.length >= 2) {
        const newResults = searchEngine.search(query);
        setResults(newResults);
      }
    }
  }, [allRunesData, searchEngine, query]);

  // Perform search
  const search = useCallback((searchQuery: string): SearchResult<SearchableItem>[] => {
    if (!isIndexReady || searchQuery.length < 2) {
      return [];
    }
    return searchEngine.search(searchQuery);
  }, [searchEngine, isIndexReady]);

  // Set query and trigger search
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);

    if (newQuery.length < 2) {
      setResults([]);
      return;
    }

    const searchResults = search(newQuery);
    setResults(searchResults);
  }, [search]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQueryState('');
    setResults([]);
  }, []);

  // Manual sync
  const syncWithCanister = useCallback(() => {
    refetchRunes();
  }, [refetchRunes]);

  // Get index stats
  const indexSize = searchEngine.getStats().itemCount;

  return {
    search,
    results,
    query,
    setQuery,
    clearSearch,
    isIndexReady,
    isSyncing,
    indexSize,
    syncWithCanister,
    lastSyncTime,
  };
}

// ============================================================================
// LIGHTWEIGHT VERSION FOR SIMPLE USE CASES
// ============================================================================

/**
 * Simple search hook that uses pre-loaded data only
 * No canister sync - instant performance with caching
 */
export function useInstantSearch(runes: RegistryEntry[]) {
  // Cache for search results
  const cacheRef = useRef(new SearchCache());

  const searchEngine = useMemo(() => {
    const engine = new SearchEngine<SearchableItem>(RUNE_SEARCH_CONFIG);
    if (runes.length > 0) {
      const searchableItems = runes.map(transformToSearchable);
      engine.buildIndex(searchableItems);
      // Clear cache when data changes
      cacheRef.current.clear();
    }
    return engine;
  }, [runes]);

  const search = useCallback((query: string): SearchResult<SearchableItem>[] => {
    if (query.length < 2) return [];

    // Check cache first
    const normalizedQuery = query.trim().toUpperCase();
    const cached = cacheRef.current.get(normalizedQuery);
    if (cached) {
      return cached as SearchResult<SearchableItem>[];
    }

    // Perform search
    const results = searchEngine.search(query);

    // Cache results
    cacheRef.current.set(normalizedQuery, results);

    return results;
  }, [searchEngine]);

  return { search, indexSize: searchEngine.getStats().itemCount };
}

export default useSearchService;
