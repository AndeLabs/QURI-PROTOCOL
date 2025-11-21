/**
 * useOrdinals Hook (v2)
 * New architecture using TanStack Query with Hiro API services
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { ordinalsQueries } from '@/lib/queries';
import { ordinalsApi } from '@/lib/api/hiro';
import type { InscriptionsFilters } from '@/lib/api/hiro/types';

/**
 * Get paginated list of inscriptions
 */
export function useInscriptions(filters?: InscriptionsFilters) {
  return useInfiniteQuery(ordinalsQueries.list(filters));
}

/**
 * Get single inscription by ID
 */
export function useInscription(id: string) {
  return useQuery(ordinalsQueries.detail(id));
}

/**
 * Get inscription transfers history
 */
export function useInscriptionTransfers(id: string) {
  return useQuery(ordinalsQueries.transfers(id));
}

/**
 * Get satoshi information
 */
export function useSatoshi(ordinal: number) {
  return useQuery(ordinalsQueries.satoshi(ordinal));
}

/**
 * Get inscription statistics
 */
export function useInscriptionStats() {
  return useQuery(ordinalsQueries.stats());
}

/**
 * Get inscription content URL
 */
export function useInscriptionContent(id: string) {
  return ordinalsApi.getInscriptionContentUrl(id);
}

/**
 * Helper to flatten paginated inscription data
 */
export function useFlatInscriptions(filters?: InscriptionsFilters) {
  const query = useInscriptions(filters);

  const inscriptions = query.data?.pages.flatMap((page) => page.results) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    inscriptions,
    total,
  };
}
