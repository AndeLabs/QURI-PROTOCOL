/**
 * LoadingState Pattern Component
 * Consistent loading indicators and skeleton screens
 */

'use client';

export interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'dots' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingState({
  variant = 'spinner',
  size = 'md',
  text,
  className = '',
}: LoadingStateProps) {
  // Size variants
  const sizeStyles = {
    sm: { spinner: 'h-4 w-4', text: 'text-sm' },
    md: { spinner: 'h-8 w-8', text: 'text-base' },
    lg: { spinner: 'h-12 w-12', text: 'text-lg' },
  };

  const styles = sizeStyles[size];

  // Spinner
  if (variant === 'spinner') {
    return (
      <div className={`flex items-center justify-center gap-3 ${className}`}>
        <div
          className={`
            ${styles.spinner}
            border-3 border-gold-500 border-t-transparent rounded-full animate-spin
          `}
        />
        {text && <span className={`${styles.text} text-museum-dark-gray`}>{text}</span>}
      </div>
    );
  }

  // Dots
  if (variant === 'dots') {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <div
          className={`
            ${size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'}
            bg-gold-500 rounded-full animate-bounce
          `}
          style={{ animationDelay: '0ms' }}
        />
        <div
          className={`
            ${size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'}
            bg-gold-500 rounded-full animate-bounce
          `}
          style={{ animationDelay: '150ms' }}
        />
        <div
          className={`
            ${size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'}
            bg-gold-500 rounded-full animate-bounce
          `}
          style={{ animationDelay: '300ms' }}
        />
      </div>
    );
  }

  // Pulse
  if (variant === 'pulse') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div
          className={`
            ${styles.spinner}
            bg-gold-500 rounded-full animate-pulse
          `}
        />
      </div>
    );
  }

  // Skeleton (default return if variant doesn't match)
  return null;
}

/**
 * Skeleton Component
 * Loading placeholder for content
 */

export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle';
  width?: string;
  height?: string;
  count?: number;
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}: SkeletonProps) {
  const baseStyles = 'bg-gradient-to-r from-museum-cream via-museum-light-gray to-museum-cream bg-[length:200%_100%] animate-shimmer';

  const skeletonElement = (index: number) => {
    if (variant === 'circle') {
      return (
        <div
          key={index}
          className={`${baseStyles} rounded-full ${className}`}
          style={{
            width: width || '48px',
            height: height || width || '48px',
          }}
        />
      );
    }

    if (variant === 'rect') {
      return (
        <div
          key={index}
          className={`${baseStyles} rounded-lg ${className}`}
          style={{
            width: width || '100%',
            height: height || '120px',
          }}
        />
      );
    }

    // Text (default)
    return (
      <div
        key={index}
        className={`${baseStyles} rounded ${className}`}
        style={{
          width: width || '100%',
          height: height || '16px',
        }}
      />
    );
  };

  if (count === 1) {
    return skeletonElement(0);
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => skeletonElement(i))}
    </div>
  );
}

/**
 * SkeletonCard Component
 * Predefined skeleton for card layouts
 */

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`border border-museum-light-gray rounded-xl p-6 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circle" width="48px" />
        <div className="flex-1 space-y-2">
          <Skeleton width="40%" />
          <Skeleton width="60%" />
        </div>
      </div>
      <Skeleton count={3} className="mb-2" />
      <div className="flex gap-2 mt-4">
        <Skeleton variant="rect" height="36px" width="100px" />
        <Skeleton variant="rect" height="36px" width="100px" />
      </div>
    </div>
  );
}

/**
 * SkeletonTable Component
 * Predefined skeleton for table layouts
 */

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} width={`${100 / columns}%`} height="24px" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton key={colIndex} width={`${100 / columns}%`} height="40px" />
          ))}
        </div>
      ))}
    </div>
  );
}
