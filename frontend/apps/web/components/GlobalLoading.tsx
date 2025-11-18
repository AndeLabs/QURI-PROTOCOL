'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Global loading indicator for route transitions
 * Provides visual feedback during navigation
 */
export function GlobalLoading() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  if (!loading) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-bitcoin-500 animate-pulse" />
      <div className="flex items-center justify-center gap-2 bg-white/95 backdrop-blur-sm shadow-lg py-3 px-6 rounded-b-xl mx-auto w-fit">
        <Loader2 className="w-5 h-5 animate-spin text-bitcoin-500" />
        <span className="text-sm font-medium text-gray-700">Loading...</span>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for content areas
 */
export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded"
          style={{ width: `${100 - i * 10}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Card loading skeleton
 */
export function CardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
      <div className="mt-6 h-10 bg-gray-200 rounded w-32" />
    </div>
  );
}

/**
 * Full-page loading spinner
 */
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bitcoin-50 to-orange-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bitcoin-100 mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-bitcoin-600" />
        </div>
        <p className="text-lg font-medium text-gray-700">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loader for buttons and small sections
 */
export function InlineLoader({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return <Loader2 className={`animate-spin ${sizeClasses[size]}`} />;
}
