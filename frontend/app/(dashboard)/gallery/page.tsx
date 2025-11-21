'use client';

/**
 * Ordinals Gallery Page
 * Visual gallery view of Bitcoin Ordinal Inscriptions
 */

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useOrdinals } from '@/hooks/useOrdinals';
import { Image, Loader2, ExternalLink, FileText, Music, Video, Code } from 'lucide-react';
import { staggerContainer, staggerItem, prefersReducedMotion } from '@/design-system/motion/presets';
import { useRef, useEffect, useState } from 'react';

// Content type icon mapper
function getContentIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('text/')) return FileText;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.includes('json')) return Code;
  return FileText;
}

// Rarity color mapper
function getRarityColor(rarity: string) {
  switch (rarity) {
    case 'mythic': return 'text-purple-500 bg-purple-50';
    case 'legendary': return 'text-orange-500 bg-orange-50';
    case 'epic': return 'text-pink-500 bg-pink-50';
    case 'rare': return 'text-blue-500 bg-blue-50';
    case 'uncommon': return 'text-green-500 bg-green-50';
    default: return 'text-gray-500 bg-gray-50';
  }
}

export default function GalleryPage() {
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mimeFilter, setMimeFilter] = useState<string[]>([]);

  const {
    ordinals,
    total,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useOrdinals({
    pageSize: 24,
    sortBy: 'genesis_block_height',
    sortOrder: 'desc',
    filters: mimeFilter.length > 0 ? { mime_type: mimeFilter } : undefined,
  });

  // Check reduced motion preference
  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  const handleOrdinalClick = (inscriptionId: string) => {
    router.push(`/gallery/${inscriptionId}`);
  };

  const filterOptions = [
    { label: 'All', value: [] },
    { label: 'Images', value: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'] },
    { label: 'Text', value: ['text/plain', 'text/html'] },
    { label: 'JSON', value: ['application/json'] },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
            Ordinals Gallery
          </h1>
          <p className="text-museum-dark-gray">
            Explore Bitcoin Ordinal Inscriptions ({total.toLocaleString()} total)
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.label}
              onClick={() => setMimeFilter(option.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                JSON.stringify(mimeFilter) === JSON.stringify(option.value)
                  ? 'bg-gold-500 text-white'
                  : 'bg-museum-white border border-museum-light-gray text-museum-dark-gray hover:border-gold-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && ordinals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 text-gold-500 animate-spin mb-4" />
          <p className="text-museum-dark-gray">Loading inscriptions...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-center py-16">
          <p className="text-red-600 mb-2">Failed to load inscriptions</p>
          <p className="text-sm text-museum-dark-gray">{error?.message}</p>
        </div>
      )}

      {/* Gallery Grid */}
      {ordinals.length > 0 && (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          variants={reducedMotion ? undefined : staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {ordinals.map((ordinal) => {
            const ContentIcon = getContentIcon(ordinal.content_type);
            const isImage = ordinal.content_type.startsWith('image/');
            const rarityClass = getRarityColor(ordinal.sat_rarity);

            return (
              <motion.button
                key={ordinal.id}
                onClick={() => handleOrdinalClick(ordinal.id)}
                className="group relative aspect-square bg-museum-white border border-museum-light-gray
                         rounded-xl overflow-hidden hover:border-gold-300 hover:shadow-lg
                         transition-all text-left"
                variants={reducedMotion ? undefined : staggerItem}
                whileHover={reducedMotion ? undefined : { y: -4, scale: 1.02 }}
              >
                {/* Content Preview */}
                <div className="absolute inset-0 flex items-center justify-center bg-museum-cream">
                  {isImage ? (
                    <img
                      src={`https://api.hiro.so/ordinals/v1/inscriptions/${ordinal.id}/content`}
                      alt={`Inscription #${ordinal.number}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback to icon if image fails
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <ContentIcon
                    className={`h-12 w-12 text-museum-light-gray ${isImage ? 'hidden' : ''}`}
                  />
                </div>

                {/* Overlay Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-museum-black/70 via-transparent to-transparent">
                  <p className="text-white font-semibold text-sm truncate">
                    #{ordinal.number.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${rarityClass}`}>
                      {ordinal.sat_rarity}
                    </span>
                  </div>
                </div>

                {/* Hover Icon */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-4 w-4 text-white drop-shadow-lg" />
                </div>

                {/* Content Type Badge */}
                <div className="absolute top-2 left-2">
                  <span className="text-xs px-1.5 py-0.5 bg-black/50 text-white rounded">
                    {ordinal.content_type.split('/')[1]?.toUpperCase() || 'FILE'}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Load More */}
      {ordinals.length > 0 && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div ref={loadMoreRef} className="h-10 w-full" />

          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-museum-dark-gray">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading more...</span>
            </div>
          )}

          {!hasMore && ordinals.length > 0 && (
            <p className="text-sm text-museum-dark-gray">
              You&apos;ve reached the end of the gallery
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && ordinals.length === 0 && !isError && (
        <div className="text-center py-16">
          <Image className="h-16 w-16 text-museum-light-gray mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-museum-black mb-2">
            No Inscriptions Found
          </h3>
          <p className="text-museum-dark-gray">
            {mimeFilter.length > 0
              ? 'Try adjusting your filters to see more results'
              : 'No ordinal inscriptions available'}
          </p>
        </div>
      )}
    </div>
  );
}
