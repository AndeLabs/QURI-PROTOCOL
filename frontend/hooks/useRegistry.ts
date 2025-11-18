/**
 * Hook for Registry canister
 * Global registry for all Runes with search and analytics
 *
 * ✅ Updated to support new pagination API with sorting
 */

import { useState, useCallback } from 'react';
import { getRegistryActor } from '@/lib/icp/actors';
import type {
  RuneKey,
  RuneMetadata,
  RegistryEntry,
  RegistryStats,
  Page,
  PagedResponse,
  RuneSortBy,
  SortOrder,
} from '@/types/canisters';

export function useRegistry() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Register a new Rune in the global registry
   */
  const registerRune = useCallback(
    async (metadata: RuneMetadata): Promise<RuneKey | null> => {
      try {
        setLoading(true);
        setError(null);
        const actor = getRegistryActor();
        const result = await actor.register_rune(metadata);

        if ('Ok' in result) {
          return result.Ok;
        } else {
          setError(result.Err);
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to register Rune';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get a specific Rune by key
   */
  const getRune = useCallback(async (key: RuneKey): Promise<RegistryEntry | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRegistryActor();
      const result = await actor.get_rune(key);

      if (result.length > 0) {
        return result[0];
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get Rune';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get a specific Rune by name
   */
  const getRuneByName = useCallback(async (name: string): Promise<RegistryEntry | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRegistryActor();
      const result = await actor.get_rune_by_name(name);

      if (result.length > 0) {
        return result[0];
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get Rune by name';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get all runes created by the current user
   */
  const getMyRunes = useCallback(async (): Promise<RegistryEntry[]> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRegistryActor();
      const runes = await actor.get_my_runes();
      return runes;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get my Runes';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * List Runes with advanced pagination and sorting
   *
   * @example
   * // Get first 100 runes, newest first (default)
   * const page1 = await listRunes();
   *
   * @example
   * // Get by volume, descending
   * const trending = await listRunes({
   *   offset: 0n,
   *   limit: 50n,
   *   sort_by: [{ Volume: null }],
   *   sort_order: [{ Desc: null }],
   * });
   *
   * @example
   * // Get alphabetically
   * const alphabetical = await listRunes({
   *   offset: 0n,
   *   limit: 100n,
   *   sort_by: [{ Name: null }],
   *   sort_order: [{ Asc: null }],
   * });
   */
  const listRunes = useCallback(
    async (page?: Page): Promise<PagedResponse<RegistryEntry>> => {
      try {
        setLoading(true);
        setError(null);
        const actor = getRegistryActor();

        // Default page if not provided
        const defaultPage: Page = {
          offset: 0n,
          limit: 100n,
          sort_by: [{ Block: null }],
          sort_order: [{ Desc: null }],
        };

        const response = await actor.list_runes(page ? [page] : [defaultPage]);
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to list Runes';
        setError(errorMsg);
        return {
          items: [],
          total: 0n,
          offset: 0n,
          limit: 0n,
          has_more: false,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Search Runes by name or symbol (legacy endpoint)
   */
  const searchRunes = useCallback(
    async (query: string, offset = 0n, limit = 100n): Promise<RegistryEntry[]> => {
      try {
        setLoading(true);
        setError(null);
        const actor = getRegistryActor();
        const result = await actor.search_runes(query, offset, limit);
        return result.results;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to search Runes';
        setError(errorMsg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get trending Runes (legacy endpoint - prefer listRunes with Volume sort)
   */
  const getTrending = useCallback(
    async (offset = 0n, limit = 100n): Promise<RegistryEntry[]> => {
      try {
        setLoading(true);
        setError(null);
        const actor = getRegistryActor();
        const result = await actor.get_trending(offset, limit);
        return result.results;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to get trending Runes';
        setError(errorMsg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update trading volume for a Rune
   */
  const updateVolume = useCallback(
    async (key: RuneKey, volume: bigint): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        const actor = getRegistryActor();
        const result = await actor.update_volume(key, volume);

        if ('Ok' in result) {
          return true;
        } else {
          setError(result.Err);
          return false;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update volume';
        setError(errorMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update holder count for a Rune
   */
  const updateHolderCount = useCallback(
    async (key: RuneKey, count: bigint): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        const actor = getRegistryActor();
        const result = await actor.update_holder_count(key, count);

        if ('Ok' in result) {
          return true;
        } else {
          setError(result.Err);
          return false;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update holder count';
        setError(errorMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get total number of Runes
   */
  const getTotalRunes = useCallback(async (): Promise<bigint> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRegistryActor();
      const total = await actor.total_runes();
      return total;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get total Runes';
      setError(errorMsg);
      return 0n;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get registry statistics
   */
  const getStats = useCallback(async (): Promise<RegistryStats | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRegistryActor();
      const stats = await actor.get_stats();
      return stats;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get stats';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    loading,
    error,
    clearError,

    // Read methods
    getRune,
    getRuneByName,
    getMyRunes,
    listRunes, // ✅ NEW: Advanced pagination with sorting
    searchRunes,
    getTrending,
    getTotalRunes,
    getStats,

    // Write methods
    registerRune,
    updateVolume,
    updateHolderCount,
  };
}
