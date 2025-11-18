/**
 * React Query hooks for Rune Registry
 * Provides caching, automatic refetching, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useRegistry } from '../useRegistry';
import { useRuneStore } from '@/lib/store/useRuneStore';
import type { RuneId, RegistryEntry, RuneMetadata } from '@/types/canisters';
import { toast } from 'sonner';

// Query keys for cache management
// Note: Convert all BigInts to strings to avoid serialization errors
export const runeKeys = {
  all: ['runes'] as const,
  lists: () => [...runeKeys.all, 'list'] as const,
  list: (offset: bigint, limit: bigint) =>
    [...runeKeys.lists(), { offset: offset.toString(), limit: limit.toString() }] as const,
  details: () => [...runeKeys.all, 'detail'] as const,
  detail: (id: RuneId) =>
    [...runeKeys.details(), { block: id.block.toString(), tx: id.tx.toString() }] as const,
  search: (query: string) => [...runeKeys.all, 'search', query] as const,
  trending: (limit: bigint) => [...runeKeys.all, 'trending', limit.toString()] as const,
  stats: () => [...runeKeys.all, 'stats'] as const,
};

/**
 * Query: Get a single Rune by ID
 */
export function useRuneQuery(runeId: RuneId) {
  const { getRune } = useRegistry();
  const addRune = useRuneStore((state) => state.addRune);

  return useQuery({
    queryKey: runeKeys.detail(runeId),
    queryFn: async () => {
      const rune = await getRune(runeId);
      if (rune) {
        addRune(rune); // Update Zustand cache
      }
      return rune;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!runeId.block && !!runeId.tx,
  });
}

/**
 * Query: List Runes with pagination
 */
export function useRunesQuery(offset: bigint = 0n, limit: bigint = 20n) {
  const { listRunes } = useRegistry();
  const addRunes = useRuneStore((state) => state.addRunes);

  return useQuery({
    queryKey: runeKeys.list(offset, limit),
    queryFn: async () => {
      const runes = await listRunes(offset, limit);
      if (runes.length > 0) {
        addRunes(runes); // Update Zustand cache
      }
      return runes;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Infinite Query: List Runes with infinite scroll
 */
export function useInfiniteRunesQuery(limit: bigint = 20n) {
  const { listRunes } = useRegistry();
  const addRunes = useRuneStore((state) => state.addRunes);

  return useInfiniteQuery({
    queryKey: [...runeKeys.lists(), 'infinite', limit.toString()], // Convert BigInt to string
    queryFn: async ({ pageParam = 0n }) => {
      const runes = await listRunes(pageParam, limit);
      if (runes.length > 0) {
        addRunes(runes);
      }
      return runes;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Stop if no more results
      if (lastPage.length < Number(limit)) return undefined;

      // Limit to 50 pages max to prevent memory issues (~1000 runes)
      const MAX_PAGES = 50;
      if (allPages.length >= MAX_PAGES) return undefined;

      return BigInt(allPages.length) * limit;
    },
    initialPageParam: 0n,
    staleTime: 1 * 60 * 1000,
    // Limit number of pages kept in cache
    maxPages: 50,
  });
}

/**
 * Query: Search Runes
 */
export function useSearchRunesQuery(query: string) {
  const { searchRunes } = useRegistry();
  const addRunes = useRuneStore((state) => state.addRunes);

  return useQuery({
    queryKey: runeKeys.search(query),
    queryFn: async () => {
      const runes = await searchRunes(query);
      if (runes.length > 0) {
        addRunes(runes);
      }
      return runes;
    },
    enabled: query.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Query: Get trending Runes
 */
export function useTrendingRunesQuery(limit: bigint = 10n) {
  const { getTrending } = useRegistry();
  const addRunes = useRuneStore((state) => state.addRunes);

  return useQuery({
    queryKey: runeKeys.trending(limit),
    queryFn: async () => {
      const runes = await getTrending(limit);
      if (runes.length > 0) {
        addRunes(runes);
      }
      return runes;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Query: Get registry statistics
 */
export function useRegistryStatsQuery() {
  const { getStats } = useRegistry();

  return useQuery({
    queryKey: runeKeys.stats(),
    queryFn: getStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Mutation: Register a new Rune
 */
export function useRegisterRuneMutation() {
  const { registerRune } = useRegistry();
  const queryClient = useQueryClient();
  const addRune = useRuneStore((state) => state.addRune);

  return useMutation({
    mutationFn: async (metadata: RuneMetadata) => {
      const success = await registerRune(metadata);
      if (!success) {
        throw new Error('Failed to register Rune');
      }
      return metadata;
    },
    onMutate: async (metadata) => {
      // Optimistic update
      toast.loading('Registering Rune...', { id: 'register-rune' });
    },
    onSuccess: (metadata) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: runeKeys.all });
      queryClient.invalidateQueries({ queryKey: runeKeys.stats() });

      toast.success('Rune registered successfully!', { id: 'register-rune' });
    },
    onError: (error: Error) => {
      toast.error(`Failed to register Rune: ${error.message}`, {
        id: 'register-rune',
      });
    },
  });
}

/**
 * Mutation: Update Rune volume
 */
export function useUpdateVolumeMutation() {
  const { updateVolume } = useRegistry();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ runeId, volume }: { runeId: RuneId; volume: bigint }) => {
      const success = await updateVolume(runeId, volume);
      if (!success) {
        throw new Error('Failed to update volume');
      }
      return { runeId, volume };
    },
    onSuccess: ({ runeId }) => {
      // Invalidate specific rune and lists
      queryClient.invalidateQueries({ queryKey: runeKeys.detail(runeId) });
      queryClient.invalidateQueries({ queryKey: runeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: runeKeys.stats() });
    },
  });
}

/**
 * Mutation: Update holder count
 */
export function useUpdateHolderCountMutation() {
  const { updateHolderCount } = useRegistry();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ runeId, count }: { runeId: RuneId; count: bigint }) => {
      const success = await updateHolderCount(runeId, count);
      if (!success) {
        throw new Error('Failed to update holder count');
      }
      return { runeId, count };
    },
    onSuccess: ({ runeId }) => {
      queryClient.invalidateQueries({ queryKey: runeKeys.detail(runeId) });
      queryClient.invalidateQueries({ queryKey: runeKeys.lists() });
    },
  });
}
