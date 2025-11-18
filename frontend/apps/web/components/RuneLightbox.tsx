'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Share2, Heart } from 'lucide-react';
import { RuneData } from './RuneCard';

/**
 * Museum-Grade Lightbox Component
 * Full-screen art viewing with zoom capabilities
 * Inspired by Foundation.app and high-end gallery experiences
 */

interface RuneLightboxProps {
  rune: RuneData;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onFavorite?: (runeId: string) => void;
  onShare?: (rune: RuneData) => void;
  isFavorited?: boolean;
}

export function RuneLightbox({
  rune,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  onFavorite,
  onShare,
  isFavorited = false,
}: RuneLightboxProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageError, setImageError] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrev && onPrev) onPrev();
          break;
        case 'ArrowRight':
          if (hasNext && onNext) onNext();
          break;
        case '+':
        case '=':
          setZoomLevel((prev) => Math.min(prev + 0.25, 3));
          break;
        case '-':
          setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

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
    <div
      className="fixed inset-0 z-50 bg-museum-black animate-fade-in"
      onClick={onClose}
    >
      {/* Header Controls */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-museum-black/80 to-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <h2 className="font-serif text-2xl font-bold text-museum-white">
              {rune.name}
            </h2>
            <p className="text-museum-light-gray text-sm font-mono mt-1">
              {rune.symbol}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-museum-charcoal/80 backdrop-blur-sm rounded-full px-3 py-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomOut();
                }}
                className="text-museum-white hover:text-gold-500 transition-colors"
                disabled={zoomLevel <= 0.5}
                aria-label="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetZoom();
                }}
                className="text-museum-white text-sm font-mono px-2"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomIn();
                }}
                className="text-museum-white hover:text-gold-500 transition-colors"
                disabled={zoomLevel >= 3}
                aria-label="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>

            {/* Action Buttons */}
            {onFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite(rune.id);
                }}
                className={`p-3 rounded-full backdrop-blur-sm transition-colors ${
                  isFavorited
                    ? 'bg-gold-500 text-white'
                    : 'bg-museum-charcoal/80 text-museum-white hover:bg-gold-500/20'
                }`}
                aria-label="Add to favorites"
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            )}

            {onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(rune);
                }}
                className="p-3 rounded-full bg-museum-charcoal/80 backdrop-blur-sm text-museum-white hover:bg-museum-charcoal transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-3 rounded-full bg-museum-charcoal/80 backdrop-blur-sm text-museum-white hover:bg-museum-white hover:text-museum-black transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Art Display */}
      <div className="absolute inset-0 flex items-center justify-center p-24">
        <div
          className="relative max-w-7xl max-h-full transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
          onClick={(e) => e.stopPropagation()}
        >
          {!imageError && rune.imageUrl ? (
            <div className="relative w-full h-full min-w-[600px] min-h-[600px] max-w-[1200px] max-h-[800px]">
              <Image
                src={rune.imageUrl}
                alt={rune.name}
                fill
                className="object-contain"
                sizes="100vw"
                priority
                quality={100}
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="w-[600px] h-[600px] bg-museum-charcoal/50 backdrop-blur-sm flex items-center justify-center border border-museum-gray/20">
              <div className="text-center text-museum-light-gray">
                <p className="text-lg mb-2">Artwork unavailable</p>
                <p className="text-sm opacity-60">No image found for this rune</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Arrows */}
      {hasPrev && onPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-museum-charcoal/80 backdrop-blur-sm text-museum-white rounded-full hover:bg-museum-white hover:text-museum-black transition-all duration-300 group"
          aria-label="Previous rune"
        >
          <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
        </button>
      )}

      {hasNext && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-museum-charcoal/80 backdrop-blur-sm text-museum-white rounded-full hover:bg-museum-white hover:text-museum-black transition-all duration-300 group"
          aria-label="Next rune"
        >
          <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* Footer Info Panel */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-museum-black/80 to-transparent backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-museum-white">
            <div>
              <p className="text-xs text-museum-light-gray uppercase tracking-wider mb-1">
                Supply
              </p>
              <p className="font-mono font-medium">{formatSupply(rune.supply)}</p>
            </div>
            <div>
              <p className="text-xs text-museum-light-gray uppercase tracking-wider mb-1">
                Divisibility
              </p>
              <p className="font-mono font-medium">{rune.divisibility}</p>
            </div>
            <div>
              <p className="text-xs text-museum-light-gray uppercase tracking-wider mb-1">
                Block Height
              </p>
              <p className="font-mono font-medium">#{rune.blockHeight.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-museum-light-gray uppercase tracking-wider mb-1">
                Created
              </p>
              <p className="font-medium text-sm">{formatDate(rune.timestamp)}</p>
            </div>
          </div>

          {rune.description && (
            <div className="mt-6 pt-6 border-t border-museum-gray/20">
              <p className="text-museum-light-gray leading-relaxed">{rune.description}</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-museum-gray/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-museum-light-gray uppercase tracking-wider mb-1">
                  Creator
                </p>
                <p className="font-mono text-sm">
                  {rune.creator.slice(0, 12)}...{rune.creator.slice(-8)}
                </p>
              </div>
              <div className="text-xs text-museum-gray">
                <p>Use arrow keys to navigate • ESC to close • +/- to zoom</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
