'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ICPProvider } from '@/lib/icp/ICPProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient with optimized defaults
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: 2,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log errors to our logging system
        logger.error('Application Error', error, {
          componentStack: errorInfo.componentStack,
          source: 'ErrorBoundary',
        });
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ICPProvider>
          {children}
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            richColors
            expand={false}
            closeButton
            duration={4000}
          />
        </ICPProvider>
        {/* React Query DevTools (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} position="bottom" />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
