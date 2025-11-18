'use client';

/**
 * Museum-Grade Loading Skeleton Components
 * Elegant placeholder states matching the premium aesthetic
 */

export function RuneCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <article
      className={`
        bg-museum-white
        rounded-none
        border border-museum-light-gray
        overflow-hidden
        ${featured ? 'col-span-2 row-span-2' : ''}
        animate-pulse
      `}
    >
      {/* Image Skeleton */}
      <div className={`relative bg-museum-cream ${featured ? 'aspect-square' : 'aspect-[4/5]'}`}>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="w-full h-full bg-gradient-to-br from-museum-light-gray via-museum-cream to-museum-light-gray" />
        </div>
      </div>

      {/* Info Skeleton */}
      <div className="p-8 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-8 bg-museum-light-gray w-3/4" />
          <div className="h-4 bg-museum-cream w-1/2" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-3 bg-museum-cream w-full" />
          <div className="h-3 bg-museum-cream w-5/6" />
        </div>

        <div className="h-px bg-museum-light-gray" />

        {/* Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-museum-light-gray w-1/4" />
            <div className="h-4 bg-museum-light-gray w-1/3" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 bg-museum-light-gray w-1/4" />
            <div className="h-4 bg-museum-light-gray w-2/5" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 bg-museum-light-gray w-1/4" />
            <div className="h-4 bg-museum-light-gray w-1/3" />
          </div>
        </div>

        <div className="pt-2 border-t border-museum-light-gray">
          <div className="h-3 bg-museum-cream w-1/2" />
        </div>
      </div>
    </article>
  );
}

export function RuneCardCompactSkeleton() {
  return (
    <article className="flex items-center gap-6 bg-museum-white border-b border-museum-light-gray p-6 animate-pulse">
      {/* Thumbnail */}
      <div className="w-20 h-20 bg-museum-light-gray flex-shrink-0" />

      {/* Info */}
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-museum-light-gray w-2/3" />
        <div className="h-4 bg-museum-cream w-1/3" />
      </div>

      {/* Stats */}
      <div className="text-right flex-shrink-0 space-y-2">
        <div className="h-4 bg-museum-light-gray w-20 ml-auto" />
        <div className="h-3 bg-museum-cream w-16 ml-auto" />
      </div>

      {/* Favorite Button */}
      <div className="w-10 h-10 bg-museum-light-gray rounded-full flex-shrink-0" />
    </article>
  );
}

export function RuneGallerySkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  return (
    <div className="min-h-screen bg-museum-white">
      {/* Header Skeleton */}
      <header className="border-b border-museum-light-gray bg-museum-cream">
        <div className="max-w-screen-2xl mx-auto px-8 py-16 lg:px-16 lg:py-24 animate-pulse">
          <div className="max-w-3xl space-y-4">
            <div className="h-14 bg-museum-light-gray w-3/4" />
            <div className="h-6 bg-museum-cream w-full" />
            <div className="h-6 bg-museum-cream w-5/6" />
          </div>
        </div>
      </header>

      {/* Filters Skeleton */}
      <div className="border-b border-museum-light-gray bg-museum-white">
        <div className="max-w-screen-2xl mx-auto px-8 py-6 lg:px-16 animate-pulse">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Search */}
            <div className="h-12 bg-museum-cream border border-museum-light-gray flex-1 max-w-md" />

            {/* Controls */}
            <div className="flex items-center gap-4">
              <div className="h-10 bg-museum-cream border border-museum-light-gray w-48" />
              <div className="h-10 bg-museum-cream border border-museum-light-gray w-24" />
            </div>
          </div>

          <div className="mt-4">
            <div className="h-4 bg-museum-cream w-32" />
          </div>
        </div>
      </div>

      {/* Gallery Grid/List Skeleton */}
      <main className="max-w-screen-2xl mx-auto px-8 py-12 lg:px-16 lg:py-16">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <RuneCardSkeleton key={i} featured={i === 0} />
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-0 border border-museum-light-gray">
            {Array.from({ length: 8 }).map((_, i) => (
              <RuneCardCompactSkeleton key={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative bg-museum-white animate-pulse">
      {/* Nav Skeleton */}
      <nav className="border-b border-museum-light-gray bg-museum-white">
        <div className="max-w-screen-2xl mx-auto px-8 py-6 lg:px-16">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-museum-light-gray w-32" />
            <div className="flex items-center gap-6">
              <div className="h-6 bg-museum-cream w-16" />
              <div className="h-6 bg-museum-cream w-20" />
              <div className="h-10 bg-museum-light-gray w-24 rounded" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Content Skeleton */}
      <header className="relative min-h-[70vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-museum-cream via-museum-white to-museum-white opacity-50" />

        <div className="relative z-10 max-w-screen-2xl mx-auto px-8 py-24 lg:px-16 lg:py-32 w-full">
          <div className="max-w-4xl space-y-8">
            {/* Label */}
            <div className="h-4 bg-museum-light-gray w-48" />

            {/* Title */}
            <div className="space-y-4">
              <div className="h-16 lg:h-20 bg-museum-light-gray w-full" />
              <div className="h-16 lg:h-20 bg-museum-light-gray w-4/5" />
              <div className="h-16 lg:h-20 bg-museum-light-gray w-3/4" />
            </div>

            {/* Subtitle */}
            <div className="space-y-3 max-w-2xl">
              <div className="h-6 bg-museum-cream w-full" />
              <div className="h-6 bg-museum-cream w-5/6" />
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="h-14 bg-museum-light-gray w-48 rounded" />
              <div className="h-14 bg-museum-cream border-2 border-museum-light-gray w-40 rounded" />
            </div>
          </div>
        </div>
      </header>

      {/* Features Skeleton */}
      <section className="border-t border-museum-light-gray bg-museum-cream">
        <div className="max-w-screen-2xl mx-auto px-8 py-16 lg:px-16 lg:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
            {Array.from({ length: 3 }).map((_, i) => (
              <article key={i} className="space-y-4">
                <div className="w-12 h-12 bg-museum-light-gray border border-museum-gray" />
                <div className="h-8 bg-museum-light-gray w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-museum-cream w-full" />
                  <div className="h-4 bg-museum-cream w-5/6" />
                  <div className="h-4 bg-museum-cream w-4/5" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-museum-white p-8 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="h-12 bg-museum-light-gray w-1/3" />
          <div className="h-6 bg-museum-cream w-1/2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-museum-cream border border-museum-light-gray p-6 space-y-3">
              <div className="h-4 bg-museum-light-gray w-1/2" />
              <div className="h-10 bg-museum-light-gray w-3/4" />
              <div className="h-3 bg-museum-cream w-2/3" />
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Large Card */}
          <div className="lg:col-span-2 bg-museum-cream border border-museum-light-gray p-8 space-y-6">
            <div className="h-8 bg-museum-light-gray w-1/3" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-museum-light-gray flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-museum-light-gray w-3/4" />
                    <div className="h-3 bg-museum-cream w-1/2" />
                  </div>
                  <div className="h-8 bg-museum-light-gray w-20" />
                </div>
              ))}
            </div>
          </div>

          {/* Side Card */}
          <div className="bg-museum-cream border border-museum-light-gray p-8 space-y-6">
            <div className="h-8 bg-museum-light-gray w-2/3" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-museum-light-gray w-full" />
                  <div className="h-3 bg-museum-cream w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline skeleton for small components
 */
export function InlineSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-museum-light-gray ${className}`} />
  );
}

/**
 * Text skeleton with multiple lines
 */
export function TextSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-museum-light-gray animate-pulse ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}
