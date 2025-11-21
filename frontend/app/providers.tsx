'use client';

import { ReactNode, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { DualAuthProvider } from '@/lib/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryErrorBoundary } from '@/components/QueryErrorBoundary';
import { createQueryClient } from '@/lib/query/client';
import { logger } from '@/lib/logger';
import { Toaster } from 'sonner';

// SIWB canister ID - update this when deployed
const SIWB_CANISTER_ID = process.env.NEXT_PUBLIC_SIWB_CANISTER_ID;

export function Providers({ children }: { children: ReactNode }) {
  // Create optimized QueryClient
  const [queryClient] = useState(() => createQueryClient());

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
        <QueryErrorBoundary showHomeButton>
          <DualAuthProvider siwbCanisterId={SIWB_CANISTER_ID}>
            {children}
            {/* Toast notifications */}
            <Toaster
              position="top-right"
              richColors
              expand={false}
              closeButton
              duration={4000}
            />
          </DualAuthProvider>
        </QueryErrorBoundary>
        {/* React Query DevTools (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} position="bottom" />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
