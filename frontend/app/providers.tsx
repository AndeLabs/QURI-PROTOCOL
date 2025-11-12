'use client';

import { ReactNode } from 'react';
import { ICPProvider } from '@/lib/icp/ICPProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';

export function Providers({ children }: { children: ReactNode }) {
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
      <ICPProvider>{children}</ICPProvider>
    </ErrorBoundary>
  );
}
