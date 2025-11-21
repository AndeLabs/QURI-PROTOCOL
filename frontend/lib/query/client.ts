/**
 * Production-grade Query Client Configuration
 * Optimized for performance, reliability, and UX
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

// Error types for better handling
interface ApiError extends Error {
  status?: number;
  code?: string;
}

// Global error handler for queries
const queryErrorHandler = (error: unknown) => {
  const apiError = error as ApiError;

  // Don't show toast for aborted requests
  if (apiError.name === 'AbortError') return;

  // Rate limiting
  if (apiError.status === 429) {
    toast.error('Too many requests. Please wait a moment.');
    return;
  }

  // Network errors
  if (apiError.message === 'Failed to fetch' || apiError.name === 'NetworkError') {
    toast.error('Network error. Please check your connection.');
    return;
  }

  // Generic error
  console.error('Query error:', error);
};

// Global error handler for mutations
const mutationErrorHandler = (error: unknown) => {
  const apiError = error as ApiError;

  // Show user-friendly error messages
  if (apiError.status === 400) {
    toast.error(apiError.message || 'Invalid request');
  } else if (apiError.status === 401) {
    toast.error('Please reconnect your wallet');
  } else if (apiError.status === 403) {
    toast.error('You do not have permission for this action');
  } else if (apiError.status === 500) {
    toast.error('Server error. Please try again later.');
  } else {
    toast.error(apiError.message || 'An error occurred');
  }

  console.error('Mutation error:', error);
};

// Create optimized query client
export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: queryErrorHandler,
    }),
    mutationCache: new MutationCache({
      onError: mutationErrorHandler,
      onSuccess: () => {
        // Optional: invalidate related queries on mutation success
      },
    }),
    defaultOptions: {
      queries: {
        // Stale time: how long data is considered fresh
        staleTime: 60 * 1000, // 1 minute

        // GC time: how long to keep unused data in cache
        gcTime: 10 * 60 * 1000, // 10 minutes

        // Retry configuration with exponential backoff
        retry: (failureCount, error) => {
          const apiError = error as ApiError;

          // Don't retry on 4xx errors (except 429)
          if (apiError.status && apiError.status >= 400 && apiError.status < 500 && apiError.status !== 429) {
            return false;
          }

          // Retry up to 3 times
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Background refetching
        refetchOnWindowFocus: false, // Disable auto-refetch on focus
        refetchOnReconnect: true,    // Refetch when network reconnects
        refetchOnMount: true,        // Refetch on component mount if stale

        // Network mode
        networkMode: 'offlineFirst', // Use cache when offline

        // Structural sharing for better performance
        structuralSharing: true,

        // Throw errors to error boundary
        throwOnError: (error, query) => {
          // Only throw if no cached data available
          return typeof query.state.data === 'undefined';
        },
      },
      mutations: {
        // Retry configuration
        retry: 2,
        retryDelay: 1000,

        // Network mode
        networkMode: 'offlineFirst',

        // Throw errors for error boundaries
        throwOnError: false, // Handle in onError instead
      },
    },
  });
}

// Singleton query client for SSR/SSG
let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always create a new client
    return createQueryClient();
  }

  // Browser: reuse existing client
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }

  return browserQueryClient;
}

// Export default instance
export const queryClient = getQueryClient();
