/**
 * Query Utilities
 * Central export for all TanStack Query utilities
 */

// Query client
export { createQueryClient, getQueryClient, queryClient } from './client';

// Prefetching
export {
  prefetchRune,
  prefetchRuneHolders,
  prefetchOrdinal,
  prefetchBRC20Token,
  prefetchRunesList,
  prefetchOrdinalsList,
  prefetchBRC20List,
  prefetchPortfolio,
  createPrefetchHandlers,
} from './prefetch';

// Optimistic updates
export {
  createOptimisticUpdate,
  createOptimisticAdd,
  createOptimisticRemove,
  createOptimisticEdit,
  placeholderData,
  getPlaceholderData,
} from './optimistic';
export type { OptimisticContext } from './optimistic';
