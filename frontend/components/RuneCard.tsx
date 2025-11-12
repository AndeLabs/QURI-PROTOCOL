'use client';

import { useState } from 'react';
import { Sparkles, User, Layers } from 'lucide-react';

/**
 * Museum-grade Rune Card Component
 * Inspired by Foundation.app, OpenSea, and MoMA digital galleries
 * Presents Runes as premium digital art pieces
 */

export interface RuneData {
  id: string;
  name: string;
  symbol: string;
  supply: string;
  divisibility: number;
  creator: string;
  blockHeight: number;
  timestamp: number;
  imageUrl?: string;
  description?: string;
}

interface RuneCardProps {
  rune: RuneData;
  onClick?: () => void;
  featured?: boolean;
}

export function RuneCard({ rune, onClick, featured = false }: RuneCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatDate = (timestamp: number): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(timestamp));
  };

  const formatSupply = (supply: string): string => {
    return new Intl.NumberFormat('en-US').format(parseInt(supply));
  };

  return (
    <article
      className={`
        group relative
        bg-museum-white
        rounded-none
        border border-museum-light-gray
        overflow-hidden
        transition-all duration-500 ease-out
        hover:shadow-art-hover
        hover:-translate-y-1
        cursor-pointer
        ${featured ? 'col-span-2 row-span-2' : ''}
        animate-fade-in
      `}
      onClick={onClick}
    >
      {/* Art Container - Museum Wall Effect */}
      <div className={`relative bg-museum-cream ${featured ? 'aspect-square' : 'aspect-[4/5]'}`}>
        {/* Artwork Placeholder / Generated Visual */}
        {!imageError ? (
          <div className="absolute inset-0 flex items-center justify-center p-12">
            {rune.imageUrl ? (
              <img
                src={rune.imageUrl}
                alt={rune.name}
                className={`
                  w-full h-full object-contain
                  transition-opacity duration-700
                  ${imageLoaded ? 'opacity-100' : 'opacity-0'}
                `}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              // Generative art placeholder
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-gold-200 via-bitcoin-200 to-gold-100 opacity-20" />
                <div className="relative z-10 text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-gold-600 opacity-40" />
                  <div className="font-serif text-4xl font-bold text-museum-charcoal opacity-30 tracking-wider">
                    {rune.symbol}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Error state
          <div className="absolute inset-0 flex items-center justify-center bg-museum-cream">
            <div className="text-center text-museum-gray">
              <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Artwork unavailable</p>
            </div>
          </div>
        )}

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-gold-500 text-white px-3 py-1 text-xs font-medium tracking-wide">
              FEATURED
            </div>
          </div>
        )}

        {/* Hover Overlay - Subtle */}
        <div
          className="
            absolute inset-0
            bg-museum-black
            opacity-0 group-hover:opacity-5
            transition-opacity duration-500
          "
        />
      </div>

      {/* Information Panel - Museum Label Style */}
      <div className="p-8 space-y-4">
        {/* Title - Elegant Serif */}
        <div className="space-y-2">
          <h3 className="font-serif text-2xl font-bold text-museum-black tracking-tight">
            {rune.name}
          </h3>
          <p className="text-museum-dark-gray text-sm font-mono tracking-wider">
            {rune.symbol}
          </p>
        </div>

        {/* Description (if available) */}
        {rune.description && (
          <p className="text-museum-charcoal text-sm leading-relaxed line-clamp-2">
            {rune.description}
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-museum-light-gray" />

        {/* Metadata - Clean Grid */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-museum-dark-gray flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Supply
            </span>
            <span className="font-mono text-museum-charcoal font-medium">
              {formatSupply(rune.supply)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-museum-dark-gray flex items-center gap-2">
              <User className="w-4 h-4" />
              Creator
            </span>
            <span className="font-mono text-museum-charcoal text-xs">
              {rune.creator.slice(0, 8)}...{rune.creator.slice(-6)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-museum-dark-gray">Block</span>
            <span className="font-mono text-museum-charcoal font-medium">
              #{rune.blockHeight.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Date - Small and Subtle */}
        <div className="pt-2 border-t border-museum-light-gray">
          <p className="text-xs text-museum-gray">
            {formatDate(rune.timestamp)}
          </p>
        </div>
      </div>

      {/* Subtle Bottom Accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
    </article>
  );
}

/**
 * Compact variant for lists
 */
export function RuneCardCompact({ rune, onClick }: RuneCardProps) {
  return (
    <article
      className="
        group
        flex items-center gap-6
        bg-museum-white
        border-b border-museum-light-gray
        p-6
        transition-all duration-300
        hover:bg-museum-cream
        cursor-pointer
      "
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 bg-museum-cream border border-museum-light-gray flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-8 h-8 text-gold-500 opacity-40" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-serif text-lg font-bold text-museum-black truncate">
          {rune.name}
        </h4>
        <p className="text-sm text-museum-dark-gray font-mono">{rune.symbol}</p>
      </div>

      {/* Stats */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-mono text-museum-charcoal font-medium">
          {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(
            parseInt(rune.supply)
          )}
        </p>
        <p className="text-xs text-museum-gray">supply</p>
      </div>
    </article>
  );
}
