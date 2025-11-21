/**
 * Optimistic Update Utilities
 * Provides seamless UX by updating UI before server confirmation
 */

import { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Context for optimistic updates - stores previous data for rollback
 */
export interface OptimisticContext<T> {
  previousData: T | undefined;
}

/**
 * Create optimistic update handlers for a mutation
 *
 * @example
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: updateTodo,
 *   ...createOptimisticUpdate(queryClient, ['todos'], (oldData, newData) => {
 *     return oldData.map(todo =>
 *       todo.id === newData.id ? { ...todo, ...newData } : todo
 *     );
 *   }),
 * });
 * ```
 */
export function createOptimisticUpdate<TData, TVariables>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updateFn: (oldData: TData, variables: TVariables) => TData
) {
  return {
    onMutate: async (variables: TVariables): Promise<OptimisticContext<TData>> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<TData>(queryKey, (old) =>
          old ? updateFn(old, variables) : old
        );
      }

      return { previousData };
    },

    onError: (
      _error: unknown,
      _variables: TVariables,
      context: OptimisticContext<TData> | undefined
    ) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Create optimistic update for adding an item to a list
 */
export function createOptimisticAdd<TData extends unknown[], TItem>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  createItem: (variables: TItem) => TData[number]
) {
  return createOptimisticUpdate<TData, TItem>(
    queryClient,
    queryKey,
    (oldData, variables) => [...oldData, createItem(variables)] as TData
  );
}

/**
 * Create optimistic update for removing an item from a list
 */
export function createOptimisticRemove<TData extends { id: string | number }[]>(
  queryClient: QueryClient,
  queryKey: QueryKey
) {
  return createOptimisticUpdate<TData, string | number>(
    queryClient,
    queryKey,
    (oldData, id) => oldData.filter((item) => item.id !== id) as TData
  );
}

/**
 * Create optimistic update for updating an item in a list
 */
export function createOptimisticEdit<
  TData extends { id: string | number }[],
  TVariables extends { id: string | number }
>(
  queryClient: QueryClient,
  queryKey: QueryKey
) {
  return createOptimisticUpdate<TData, TVariables>(
    queryClient,
    queryKey,
    (oldData, variables) =>
      oldData.map((item) =>
        item.id === variables.id ? { ...item, ...variables } : item
      ) as TData
  );
}

/**
 * Placeholder data for queries - shows skeleton while loading
 */
export const placeholderData = {
  // Runes list placeholder
  runesList: {
    results: Array(12).fill(null).map((_, i) => ({
      id: `placeholder-${i}`,
      name: 'Loading...',
      spaced_name: 'Loading...',
      number: 0,
      symbol: '?',
      divisibility: 0,
      turbo: false,
      mint_terms: null,
      supply: {
        current: '0',
        minted: '0',
        total_mints: '0',
        mint_percentage: '0',
        mintable: false,
        burned: '0',
        total_burns: '0',
        premine: '0',
      },
      location: {
        block_hash: '',
        block_height: 0,
        tx_id: '',
        tx_index: 0,
        timestamp: 0,
      },
    })),
    total: 0,
    limit: 12,
    offset: 0,
  },

  // Ordinals list placeholder
  ordinalsList: {
    results: Array(12).fill(null).map((_, i) => ({
      id: `placeholder-${i}`,
      number: 0,
      address: '',
      genesis_address: '',
      genesis_block_height: 0,
      genesis_block_hash: '',
      genesis_tx_id: '',
      genesis_fee: 0,
      genesis_timestamp: 0,
      tx_id: '',
      location: '',
      output: '',
      value: 0,
      offset: 0,
      sat_ordinal: 0,
      sat_rarity: 'common',
      sat_coinbase_height: 0,
      mime_type: 'image/png',
      content_type: 'image/png',
      content_length: 0,
      timestamp: 0,
      curse_type: null,
      recursive: false,
      recursion_refs: null,
    })),
    total: 0,
    limit: 12,
    offset: 0,
  },

  // BRC-20 list placeholder
  brc20List: {
    results: Array(12).fill(null).map((_, i) => ({
      ticker: 'LOAD',
      inscription_id: `placeholder-${i}`,
      max_supply: '0',
      minted_supply: '0',
      mint_limit: '0',
      decimals: 18,
      deploy_timestamp: 0,
      tx_count: 0,
      address: '',
    })),
    total: 0,
    limit: 12,
    offset: 0,
  },
};

/**
 * Get placeholder data with keepPreviousData behavior
 */
export function getPlaceholderData<T>(
  type: 'runes' | 'ordinals' | 'brc20'
): T {
  switch (type) {
    case 'runes':
      return placeholderData.runesList as T;
    case 'ordinals':
      return placeholderData.ordinalsList as T;
    case 'brc20':
      return placeholderData.brc20List as T;
    default:
      return placeholderData.runesList as T;
  }
}
