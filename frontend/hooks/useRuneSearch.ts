/**
 * useRuneSearch Hook
 * Efficient search implementation using direct API calls + local filtering
 *
 * Improvements over page-by-page search:
 * - Debounced input (300ms delay)
 * - Direct API search by name when possible
 * - Local filtering for loaded data
 * - Better UX with proper loading states
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { runesApi } from '@/lib/api/hiro';
import { queryKeys } from '@/lib/queries/keys';
import type { RuneEtching } from '@/lib/api/hiro/types';

// Debounce delay in milliseconds
const DEBOUNCE_MS = 300;

// Minimum characters to trigger search
const MIN_SEARCH_LENGTH = 2;

interface UseRuneSearchOptions {
  /** All loaded runes for local filtering */
  loadedRunes?: RuneEtching[];
  /** Callback when search finds results */
  onResults?: (results: RuneEtching[]) => void;
}

interface UseRuneSearchReturn {
  /** Current search query */
  searchQuery: string;
  /** Debounced search query */
  debouncedQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Search results */
  results: RuneEtching[];
  /** Is searching via API */
  isSearching: boolean;
  /** Search error */
  error: string | null;
  /** Clear search */
  clearSearch: () => void;
  /** Is there an active search */
  hasActiveSearch: boolean;
}

export function useRuneSearch(options: UseRuneSearchOptions = {}): UseRuneSearchReturn {
  const { loadedRunes = [], onResults } = options;
  const queryClient = useQueryClient();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toUpperCase());
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Normalize search term (remove dots, spaces)
  const normalizedQuery = useMemo(() => {
    return debouncedQuery.replace(/[•.\s]/g, '');
  }, [debouncedQuery]);

  // Check if we should search via API
  const shouldSearchApi = normalizedQuery.length >= MIN_SEARCH_LENGTH;

  // Direct API search by name
  const {
    data: apiResult,
    isLoading: isApiSearching,
    error: apiError,
  } = useQuery({
    queryKey: queryKeys.runes.detail(normalizedQuery),
    queryFn: async () => {
      // Try exact match first
      try {
        const result = await runesApi.getEtching(normalizedQuery);
        return result;
      } catch {
        // If exact match fails, try with dots (spaced name format)
        const spacedName = normalizedQuery
          .split('')
          .join('•');
        try {
          return await runesApi.getEtching(spacedName);
        } catch {
          return null;
        }
      }
    },
    enabled: shouldSearchApi,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Local filtering of loaded runes
  const localResults = useMemo(() => {
    if (!debouncedQuery || loadedRunes.length === 0) {
      return [];
    }

    const query = debouncedQuery.toLowerCase();
    const normalizedQueryLower = normalizedQuery.toLowerCase();

    return loadedRunes.filter((rune) => {
      const name = rune.name.toLowerCase();
      const spacedName = rune.spaced_name.toLowerCase();
      const symbol = rune.symbol.toLowerCase();

      return (
        name.includes(normalizedQueryLower) ||
        spacedName.includes(query) ||
        symbol === query ||
        rune.id.toLowerCase().includes(query)
      );
    });
  }, [debouncedQuery, normalizedQuery, loadedRunes]);

  // Combine results: API result + local results (deduplicated)
  const results = useMemo(() => {
    const combined: RuneEtching[] = [];
    const seenIds = new Set<string>();

    // Add API result first (exact match has priority)
    if (apiResult && !seenIds.has(apiResult.id)) {
      combined.push(apiResult);
      seenIds.add(apiResult.id);
    }

    // Add local results
    for (const rune of localResults) {
      if (!seenIds.has(rune.id)) {
        combined.push(rune);
        seenIds.add(rune.id);
      }
    }

    // Sort by relevance (exact matches first)
    combined.sort((a, b) => {
      const aExact = a.name.toUpperCase() === normalizedQuery ||
                     a.spaced_name.toUpperCase().replace(/•/g, '') === normalizedQuery;
      const bExact = b.name.toUpperCase() === normalizedQuery ||
                     b.spaced_name.toUpperCase().replace(/•/g, '') === normalizedQuery;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Then by name similarity
      const aStarts = a.name.toUpperCase().startsWith(normalizedQuery);
      const bStarts = b.name.toUpperCase().startsWith(normalizedQuery);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return 0;
    });

    return combined;
  }, [apiResult, localResults, normalizedQuery]);

  // Call onResults callback
  useEffect(() => {
    if (onResults && debouncedQuery) {
      onResults(results);
    }
  }, [results, onResults, debouncedQuery]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  // Error handling
  const error = apiError instanceof Error ? apiError.message : null;

  return {
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    results,
    isSearching: isApiSearching,
    error,
    clearSearch,
    hasActiveSearch: debouncedQuery.length > 0,
  };
}

/**
 * Custom hook for debouncing a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useRuneSearch;
