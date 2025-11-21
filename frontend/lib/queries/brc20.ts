/**
 * BRC-20 Query Options
 * TanStack Query configurations for BRC-20 API
 */

import { queryOptions, infiniteQueryOptions } from '@tanstack/react-query';
import { brc20Api } from '@/lib/api/hiro';
import { queryKeys } from './keys';
import type { BRC20Filters } from '@/lib/api/hiro/types';

// Stale times
const FIVE_MINUTES = 5 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

export const brc20Queries = {
  /**
   * Infinite query for paginated BRC-20 tokens list
   */
  list: (filters?: BRC20Filters) =>
    infiniteQueryOptions({
      queryKey: queryKeys.brc20.tokenList(filters),
      queryFn: ({ pageParam = 0 }) =>
        brc20Api.getTokens({
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
   * Single BRC-20 token detail
   */
  token: (ticker: string) =>
    queryOptions({
      queryKey: queryKeys.brc20.token(ticker),
      queryFn: () => brc20Api.getToken(ticker),
      staleTime: TEN_MINUTES,
      enabled: !!ticker,
    }),

  /**
   * BRC-20 token holders
   */
  holders: (ticker: string) =>
    infiniteQueryOptions({
      queryKey: queryKeys.brc20.holders(ticker),
      queryFn: ({ pageParam = 0 }) =>
        brc20Api.getTokenHolders(ticker, { offset: pageParam, limit: 50 }),
      getNextPageParam: (lastPage, allPages) => {
        const nextOffset = allPages.length * 50;
        return nextOffset < lastPage.total ? nextOffset : undefined;
      },
      initialPageParam: 0,
      staleTime: FIVE_MINUTES,
      enabled: !!ticker,
    }),

  /**
   * Address BRC-20 balances
   */
  addressBalances: (address: string) =>
    queryOptions({
      queryKey: queryKeys.brc20.balances(address),
      queryFn: () => brc20Api.getAddressBalances(address, { limit: 100 }),
      staleTime: FIVE_MINUTES,
      enabled: !!address,
    }),

  /**
   * BRC-20 token activity
   */
  tokenActivity: (ticker: string) =>
    infiniteQueryOptions({
      queryKey: queryKeys.brc20.tokenActivity(ticker),
      queryFn: ({ pageParam = 0 }) =>
        brc20Api.getTokenActivity(ticker, { offset: pageParam, limit: 50 }),
      getNextPageParam: (lastPage, allPages) => {
        const nextOffset = allPages.length * 50;
        return nextOffset < lastPage.total ? nextOffset : undefined;
      },
      initialPageParam: 0,
      staleTime: FIVE_MINUTES,
      enabled: !!ticker,
    }),
};
