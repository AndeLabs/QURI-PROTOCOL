/**
 * Ordinals Query Options
 * TanStack Query configurations for Ordinals API
 */

import { queryOptions, infiniteQueryOptions } from '@tanstack/react-query';
import { ordinalsApi } from '@/lib/api/hiro';
import { queryKeys } from './keys';
import type { InscriptionsFilters } from '@/lib/api/hiro/types';

// Stale times
const FIVE_MINUTES = 5 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

export const ordinalsQueries = {
  /**
   * Infinite query for paginated inscriptions list
   */
  list: (filters?: InscriptionsFilters) =>
    infiniteQueryOptions({
      queryKey: queryKeys.ordinals.list(filters),
      queryFn: ({ pageParam = 0 }) =>
        ordinalsApi.getInscriptions({
          ...filters,
          offset: pageParam,
          limit: filters?.limit ?? 20,
        }),
      getNextPageParam: (lastPage, allPages) => {
        const nextOffset = allPages.length * (filters?.limit ?? 20);
        return nextOffset < lastPage.total ? nextOffset : undefined;
      },
      initialPageParam: 0,
      staleTime: FIVE_MINUTES,
    }),

  /**
   * Single inscription detail
   */
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.ordinals.detail(id),
      queryFn: () => ordinalsApi.getInscription(id),
      staleTime: TEN_MINUTES,
      enabled: !!id,
    }),

  /**
   * Inscription transfers history
   */
  transfers: (id: string) =>
    queryOptions({
      queryKey: queryKeys.ordinals.transfers(id),
      queryFn: () => ordinalsApi.getInscriptionTransfers(id, { limit: 50 }),
      staleTime: FIVE_MINUTES,
      enabled: !!id,
    }),

  /**
   * Satoshi information
   */
  satoshi: (ordinal: number) =>
    queryOptions({
      queryKey: queryKeys.ordinals.satoshi(ordinal),
      queryFn: () => ordinalsApi.getSatoshi(ordinal),
      staleTime: TEN_MINUTES,
      enabled: ordinal > 0,
    }),

  /**
   * Inscription statistics
   */
  stats: () =>
    queryOptions({
      queryKey: queryKeys.ordinals.stats(),
      queryFn: () => ordinalsApi.getStats(),
      staleTime: FIVE_MINUTES,
    }),
};
