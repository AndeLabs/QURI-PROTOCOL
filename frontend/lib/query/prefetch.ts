/**
 * Prefetching Utilities
 * Enable fluid navigation with data prefetching on hover/focus
 */

import { QueryClient } from '@tanstack/react-query';
import { runesApi } from '@/lib/api/hiro/runes';
import { ordinalsApi } from '@/lib/api/hiro/ordinals';
import { brc20Api } from '@/lib/api/hiro/brc20';
import { queryKeys } from '@/lib/queries/keys';

// Prefetch configuration
const PREFETCH_STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Prefetch rune details on hover
 */
export function prefetchRune(queryClient: QueryClient, runeId: string) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.runes.detail(runeId),
    queryFn: () => runesApi.getEtching(runeId),
    staleTime: PREFETCH_STALE_TIME,
  });
}

/**
 * Prefetch rune holders
 */
export function prefetchRuneHolders(queryClient: QueryClient, runeId: string) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.runes.holders(runeId),
    queryFn: () => runesApi.getHolders(runeId),
    staleTime: PREFETCH_STALE_TIME,
  });
}

/**
 * Prefetch ordinal inscription details
 */
export function prefetchOrdinal(queryClient: QueryClient, inscriptionId: string) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.ordinals.detail(inscriptionId),
    queryFn: () => ordinalsApi.getInscription(inscriptionId),
    staleTime: PREFETCH_STALE_TIME,
  });
}

/**
 * Prefetch BRC-20 token details
 */
export function prefetchBRC20Token(queryClient: QueryClient, ticker: string) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.brc20.token(ticker),
    queryFn: () => brc20Api.getToken(ticker),
    staleTime: PREFETCH_STALE_TIME,
  });
}

/**
 * Prefetch initial list data for pages
 */
export function prefetchRunesList(queryClient: QueryClient) {
  return queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.runes.list({}),
    queryFn: ({ pageParam = 0 }) =>
      runesApi.getEtchings({ offset: pageParam, limit: 24 }),
    initialPageParam: 0,
    staleTime: PREFETCH_STALE_TIME,
  });
}

export function prefetchOrdinalsList(queryClient: QueryClient) {
  return queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.ordinals.list({}),
    queryFn: ({ pageParam = 0 }) =>
      ordinalsApi.getInscriptions({ offset: pageParam, limit: 24 }),
    initialPageParam: 0,
    staleTime: PREFETCH_STALE_TIME,
  });
}

export function prefetchBRC20List(queryClient: QueryClient) {
  return queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.brc20.tokenList({}),
    queryFn: ({ pageParam = 0 }) =>
      brc20Api.getTokens({ offset: pageParam, limit: 20 }),
    initialPageParam: 0,
    staleTime: PREFETCH_STALE_TIME,
  });
}

/**
 * Prefetch portfolio data for an address
 */
export function prefetchPortfolio(queryClient: QueryClient, address: string) {
  return Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.portfolio.runeBalances(address),
      queryFn: () => runesApi.getAddressBalances(address),
      staleTime: PREFETCH_STALE_TIME,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.portfolio.brc20Balances(address),
      queryFn: () => brc20Api.getAddressBalances(address),
      staleTime: PREFETCH_STALE_TIME,
    }),
  ]);
}

/**
 * Hook helper to create prefetch handlers
 */
export function createPrefetchHandlers(queryClient: QueryClient) {
  return {
    // For navigation links
    prefetchOnHover: (type: 'rune' | 'ordinal' | 'brc20', id: string) => {
      return () => {
        switch (type) {
          case 'rune':
            prefetchRune(queryClient, id);
            break;
          case 'ordinal':
            prefetchOrdinal(queryClient, id);
            break;
          case 'brc20':
            prefetchBRC20Token(queryClient, id);
            break;
        }
      };
    },

    // For page navigation
    prefetchPage: (page: 'explorer' | 'gallery' | 'brc20') => {
      return () => {
        switch (page) {
          case 'explorer':
            prefetchRunesList(queryClient);
            break;
          case 'gallery':
            prefetchOrdinalsList(queryClient);
            break;
          case 'brc20':
            prefetchBRC20List(queryClient);
            break;
        }
      };
    },
  };
}
