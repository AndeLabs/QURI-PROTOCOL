'use client';

/**
 * Query Error Boundary
 * Professional error handling with retry capability for TanStack Query
 */

import { ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  showHomeButton?: boolean;
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}

function ErrorFallback({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  description = 'An error occurred while loading this content.',
  showHomeButton = false,
}: ErrorFallbackProps) {
  // Parse error for user-friendly message
  const getErrorMessage = () => {
    if (error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error.message.includes('429')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.message.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    return description;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
        {/* Error Icon */}
        <div className="bg-red-50 rounded-full p-4 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        {/* Title */}
        <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-museum-dark-gray mb-6">
          {getErrorMessage()}
        </p>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left mb-6 bg-museum-cream rounded-lg p-4">
            <summary className="text-sm text-museum-dark-gray cursor-pointer hover:text-museum-black">
              Technical Details
            </summary>
            <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-40 whitespace-pre-wrap">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={resetErrorBoundary}
            className="bg-gold-500 hover:bg-gold-600 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>

          {showHomeButton && (
            <Link href="/dashboard">
              <Button variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function QueryErrorBoundary({
  children,
  fallbackTitle,
  fallbackDescription,
  showHomeButton = false,
}: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorFallback
              error={error}
              resetErrorBoundary={resetErrorBoundary}
              title={fallbackTitle}
              description={fallbackDescription}
              showHomeButton={showHomeButton}
            />
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

// Compact version for inline use
export function QueryErrorBoundaryCompact({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-red-600 mb-2">Failed to load</p>
                <button
                  onClick={resetErrorBoundary}
                  className="text-xs text-red-700 underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

export default QueryErrorBoundary;
