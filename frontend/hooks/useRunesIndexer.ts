/**
 * Hooks for Omnity Runes Indexer
 * React Query hooks for querying on-chain Bitcoin Runes data
 */

import { useQuery } from '@tanstack/react-query';
import {
  getLatestBlock,
  getEtching,
  getRune,
  getRuneById,
  getRuneBalancesForOutputs,
  formatRuneEntry,
  formatRuneBalance,
} from '@/lib/omnity/runesIndexer';
import type { FormattedRuneEntry, FormattedRuneBalance } from '@/lib/omnity/types';

/**
 * Query keys for runes indexer
 */
export const runesIndexerKeys = {
  all: ['runesIndexer'] as const,
  latestBlock: () => [...runesIndexerKeys.all, 'latestBlock'] as const,
  etching: (txid: string) => [...runesIndexerKeys.all, 'etching', txid] as const,
  rune: (name: string) => [...runesIndexerKeys.all, 'rune', name] as const,
  runeById: (id: string) => [...runesIndexerKeys.all, 'runeById', id] as const,
  balances: (outpoints: string[]) => [...runesIndexerKeys.all, 'balances', outpoints] as const,
};

/**
 * Hook to get the latest indexed block
 */
export function useLatestBlock() {
  return useQuery({
    queryKey: runesIndexerKeys.latestBlock(),
    queryFn: getLatestBlock,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook to get etching info for a transaction
 */
export function useEtching(txid: string | undefined) {
  return useQuery({
    queryKey: runesIndexerKeys.etching(txid || ''),
    queryFn: () => getEtching(txid!),
    enabled: !!txid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get rune by spaced name
 */
export function useRune(spacedName: string | undefined) {
  return useQuery({
    queryKey: runesIndexerKeys.rune(spacedName || ''),
    queryFn: async () => {
      const rune = await getRune(spacedName!);
      return rune ? formatRuneEntry(rune) : null;
    },
    enabled: !!spacedName,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get rune by ID
 */
export function useRuneById(runeId: string | undefined) {
  return useQuery({
    queryKey: runesIndexerKeys.runeById(runeId || ''),
    queryFn: async () => {
      const rune = await getRuneById(runeId!);
      return rune ? formatRuneEntry(rune) : null;
    },
    enabled: !!runeId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get rune balances for UTXOs
 */
export function useRuneBalances(outpoints: string[] | undefined) {
  return useQuery({
    queryKey: runesIndexerKeys.balances(outpoints || []),
    queryFn: async () => {
      const balances = await getRuneBalancesForOutputs(outpoints!);
      // Flatten and format all balances
      return balances.flatMap((outputBalances) =>
        outputBalances.map(formatRuneBalance)
      );
    },
    enabled: !!outpoints && outpoints.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get multiple runes by their IDs
 */
export function useMultipleRunes(runeIds: string[]) {
  return useQuery({
    queryKey: [...runesIndexerKeys.all, 'multiple', runeIds],
    queryFn: async () => {
      const results = await Promise.all(
        runeIds.map(async (id) => {
          const rune = await getRuneById(id);
          return rune ? formatRuneEntry(rune) : null;
        })
      );
      return results.filter((r): r is FormattedRuneEntry => r !== null);
    },
    enabled: runeIds.length > 0,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to search for a rune by name or ID
 */
export function useRuneSearch(query: string | undefined) {
  return useQuery({
    queryKey: [...runesIndexerKeys.all, 'search', query],
    queryFn: async () => {
      if (!query) return null;

      // Try by ID first (format: "block:tx")
      if (query.includes(':')) {
        const rune = await getRuneById(query);
        return rune ? formatRuneEntry(rune) : null;
      }

      // Try by spaced name
      const rune = await getRune(query);
      return rune ? formatRuneEntry(rune) : null;
    },
    enabled: !!query && query.length > 0,
    staleTime: 60 * 1000,
  });
}
