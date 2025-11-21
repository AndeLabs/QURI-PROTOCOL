/**
 * useOrdinals Hook
 * Fetches Ordinals/Inscriptions data from Hiro API
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  OrdinalInscription,
  OrdinalsResponse,
  OrdinalFilters,
  OrdinalSortBy,
  SortOrder
} from '@/types/ordinals';

const HIRO_API_BASE = 'https://api.hiro.so/ordinals/v1';

interface UseOrdinalsOptions {
  pageSize?: number;
  sortBy?: OrdinalSortBy;
  sortOrder?: SortOrder;
  filters?: OrdinalFilters;
  enabled?: boolean;
}

interface UseOrdinalsReturn {
  ordinals: OrdinalInscription[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasMore: boolean;
  fetchNextPage: () => Promise<void>;
  isFetchingNextPage: boolean;
  refetch: () => Promise<void>;
}

export function useOrdinals(options: UseOrdinalsOptions = {}): UseOrdinalsReturn {
  const {
    pageSize = 24,
    sortBy = 'genesis_block_height',
    sortOrder = 'desc',
    filters = {},
    enabled = true,
  } = options;

  const [ordinals, setOrdinals] = useState<OrdinalInscription[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const buildQueryString = useCallback((currentOffset: number): string => {
    const params = new URLSearchParams();
    params.set('limit', pageSize.toString());
    params.set('offset', currentOffset.toString());
    params.set('order_by', sortBy);
    params.set('order', sortOrder);

    // Apply filters
    if (filters.mime_type?.length) {
      filters.mime_type.forEach(type => params.append('mime_type', type));
    }
    if (filters.rarity?.length) {
      filters.rarity.forEach(r => params.append('rarity', r));
    }
    if (filters.address) {
      params.set('address', filters.address);
    }
    if (filters.recursive !== undefined) {
      params.set('recursive', filters.recursive.toString());
    }
    if (filters.cursed !== undefined) {
      params.set('cursed', filters.cursed.toString());
    }
    if (filters.from_number !== undefined) {
      params.set('from_number', filters.from_number.toString());
    }
    if (filters.to_number !== undefined) {
      params.set('to_number', filters.to_number.toString());
    }
    if (filters.from_genesis_block_height !== undefined) {
      params.set('from_genesis_block_height', filters.from_genesis_block_height.toString());
    }
    if (filters.to_genesis_block_height !== undefined) {
      params.set('to_genesis_block_height', filters.to_genesis_block_height.toString());
    }

    return params.toString();
  }, [pageSize, sortBy, sortOrder, filters]);

  const fetchOrdinals = useCallback(async (currentOffset: number, append: boolean = false) => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (append) {
        setIsFetchingNextPage(true);
      } else {
        setIsLoading(true);
      }
      setIsError(false);
      setError(null);

      const queryString = buildQueryString(currentOffset);
      const response = await fetch(
        `${HIRO_API_BASE}/inscriptions?${queryString}`,
        {
          headers: {
            'Accept': 'application/json',
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ordinals: ${response.statusText}`);
      }

      const data: OrdinalsResponse = await response.json();

      if (append) {
        setOrdinals(prev => [...prev, ...data.results]);
      } else {
        setOrdinals(data.results);
      }
      setTotal(data.total);
      setOffset(currentOffset + data.results.length);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [enabled, buildQueryString]);

  const fetchNextPage = useCallback(async () => {
    if (isFetchingNextPage || ordinals.length >= total) return;
    await fetchOrdinals(offset, true);
  }, [fetchOrdinals, isFetchingNextPage, offset, ordinals.length, total]);

  const refetch = useCallback(async () => {
    setOrdinals([]);
    setOffset(0);
    await fetchOrdinals(0, false);
  }, [fetchOrdinals]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      setOrdinals([]);
      setOffset(0);
      fetchOrdinals(0, false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, pageSize, sortBy, sortOrder, JSON.stringify(filters)]);

  const hasMore = ordinals.length < total;

  return {
    ordinals,
    total,
    isLoading,
    isError,
    error,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  };
}

/**
 * Hook for fetching a single ordinal by ID
 */
export function useOrdinal(inscriptionId: string | null) {
  const [ordinal, setOrdinal] = useState<OrdinalInscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!inscriptionId) {
      setOrdinal(null);
      return;
    }

    const fetchOrdinal = async () => {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const response = await fetch(
          `${HIRO_API_BASE}/inscriptions/${inscriptionId}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch ordinal: ${response.statusText}`);
        }

        const data = await response.json();
        setOrdinal(data);
      } catch (err) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrdinal();
  }, [inscriptionId]);

  return { ordinal, isLoading, isError, error };
}

/**
 * Hook for fetching ordinal content URL
 */
export function useOrdinalContent(inscriptionId: string | null) {
  if (!inscriptionId) return null;
  return `${HIRO_API_BASE}/inscriptions/${inscriptionId}/content`;
}

export default useOrdinals;
