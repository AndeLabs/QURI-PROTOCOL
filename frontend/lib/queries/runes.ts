/**
 * Runes Query Options
 * TanStack Query configurations for Runes API
 */

import { queryOptions, infiniteQueryOptions } from '@tanstack/react-query';
import { runesApi } from '@/lib/api/hiro';
import { queryKeys } from './keys';
import type { RunesFilters } from '@/lib/api/hiro/types';

// Stale times
const FIVE_MINUTES = 5 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

export const runesQueries = {
  /**
   * Infinite query for paginated runes list
   */
  list: (filters?: RunesFilters) =>
    infiniteQueryOptions({
      queryKey: queryKeys.runes.list(filters),
      queryFn: ({ pageParam = 0 }) =>
        runesApi.getEtchings({
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
   * Single rune detail
   */
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.runes.detail(id),
      queryFn: () => runesApi.getEtching(id),
      staleTime: TEN_MINUTES,
      enabled: !!id,
    }),

  /**
   * Rune holders
   */
  holders: (id: string) =>
    queryOptions({
      queryKey: queryKeys.runes.holders(id),
      queryFn: () => runesApi.getHolders(id, { limit: 100 }),
      staleTime: FIVE_MINUTES,
      enabled: !!id,
    }),

  /**
   * Rune activities
   */
  runeActivities: (id: string) =>
    infiniteQueryOptions({
      queryKey: queryKeys.runes.runeActivities(id),
      queryFn: ({ pageParam = 0 }) =>
        runesApi.getRuneActivities(id, { offset: pageParam, limit: 50 }),
      getNextPageParam: (lastPage, allPages) => {
        const nextOffset = allPages.length * 50;
        return nextOffset < lastPage.total ? nextOffset : undefined;
      },
      initialPageParam: 0,
      staleTime: FIVE_MINUTES,
      enabled: !!id,
    }),

  /**
   * Address rune balances
   */
  addressBalances: (address: string) =>
    queryOptions({
      queryKey: queryKeys.runes.balances(address),
      queryFn: () => runesApi.getAddressBalances(address, { limit: 100 }),
      staleTime: FIVE_MINUTES,
      enabled: !!address,
    }),

  /**
   * Address rune activities
   */
  addressActivities: (address: string) =>
    infiniteQueryOptions({
      queryKey: queryKeys.runes.addressActivities(address),
      queryFn: ({ pageParam = 0 }) =>
        runesApi.getAddressActivities(address, { offset: pageParam, limit: 50 }),
      getNextPageParam: (lastPage, allPages) => {
        const nextOffset = allPages.length * 50;
        return nextOffset < lastPage.total ? nextOffset : undefined;
      },
      initialPageParam: 0,
      staleTime: FIVE_MINUTES,
      enabled: !!address,
    }),
};
