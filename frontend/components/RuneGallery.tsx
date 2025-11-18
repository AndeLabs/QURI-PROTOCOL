'use client';

import { useState, useEffect } from 'react';
import { RuneCard, RuneCardCompact, RuneData } from './RuneCard';
import { RuneLightbox } from './RuneLightbox';
import { RuneGallerySkeleton } from './LoadingSkeletons';
import { RevealOnScroll } from './Parallax';
import { Grid3x3, List, Search, ArrowLeft } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { shareRune } from '@/lib/utils/share';
import Link from 'next/link';

/**
 * Rune Gallery Component
 * Shows real Runes from Registry canister
 */

type ViewMode = 'grid' | 'list';
type SortOption = 'recent' | 'oldest' | 'name';

interface RuneGalleryProps {
  title?: string;
  subtitle?: string;
  showFilters?: boolean;
  showBackButton?: boolean;
}

export function RuneGallery({
  title = 'Runes Collection',
  subtitle = 'Bitcoin Runes registered on the Internet Computer',
  showFilters = true,
  showBackButton = false,
}: RuneGalleryProps) {
  const [runes, setRunes] = useState<RuneData[]>([]);
  const [filteredRunes, setFilteredRunes] = useState<RuneData[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRune, setSelectedRune] = useState<RuneData | null>(null);
  const [selectedRuneIndex, setSelectedRuneIndex] = useState<number>(-1);

  // Favorites functionality
  const { toggleFavorite, isFavorited } = useFavorites();

  const handleFavoriteToggle = (runeId: string) => {
    const rune = filteredRunes.find((r) => r.id === runeId);
    if (rune) {
      toggleFavorite(rune);
    }
  };

  // Load runes from Registry
  useEffect(() => {
    loadRunes();
  }, []);

  const loadRunes = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info('Loading runes from Registry');

      const { getRegistryActor } = await import('@/lib/icp/actors');
      const actor = getRegistryActor();
      
      // Load all runes (offset 0, limit 100)
      const registryEntries = await actor.list_runes(0n, 100n);
      
      logger.info('Loaded registry entries', { count: registryEntries.length });
      
      // Convert RegistryEntry to RuneData format
      const runesData: RuneData[] = registryEntries.map((entry) => ({
        id: `${entry.rune_id.block}:${entry.rune_id.tx}`,
        name: entry.metadata.name,
        symbol: entry.metadata.symbol,
        supply: entry.metadata.total_supply.toString(),
        divisibility: Number(entry.metadata.divisibility),
        creator: entry.metadata.creator.toString(),
        blockHeight: Number(entry.rune_id.block),
        timestamp: Number(entry.metadata.created_at) / 1_000_000, // nanoseconds to ms
        txid: entry.rune_id.name,
        imageUrl: '',
        verified: true,
        description: `Rune ${entry.metadata.name} on block ${entry.rune_id.block}`,
        holdersCount: Number(entry.holder_count),
        volume24h: Number(entry.trading_volume_24h),
      }));

      setRunes(runesData);
      setFilteredRunes(runesData);
      
      if (runesData.length === 0) {
        setError('No Runes registered yet. Be the first to register one!');
      }
      
      logger.info('Loaded runes successfully', { count: runesData.length });
    } catch (error) {
      logger.error('Failed to load runes', error instanceof Error ? error : undefined);
      setError('Failed to load Runes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Search and filter with debounce
  useEffect(() => {
    const searchRunes = async () => {
      if (!searchQuery.trim()) {
        // No search, show all with sorting
        const filtered = [...runes];
        
        switch (sortBy) {
          case 'recent':
            filtered.sort((a, b) => b.timestamp - a.timestamp);
            break;
          case 'oldest':
            filtered.sort((a, b) => a.timestamp - b.timestamp);
            break;
          case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
        }
        
        setFilteredRunes(filtered);
        return;
      }

      // Use Registry search API
      try {
        const { getRegistryActor } = await import('@/lib/icp/actors');
        const actor = getRegistryActor();
        
        const searchResults = await actor.search_runes(searchQuery);
        
        const searchData: RuneData[] = searchResults.map((entry) => ({
          id: `${entry.rune_id.block}:${entry.rune_id.tx}`,
          name: entry.metadata.name,
          symbol: entry.metadata.symbol,
          supply: entry.metadata.total_supply.toString(),
          divisibility: Number(entry.metadata.divisibility),
          creator: entry.metadata.creator.toString(),
          blockHeight: Number(entry.rune_id.block),
          timestamp: Number(entry.metadata.created_at) / 1_000_000,
          txid: entry.rune_id.name,
          imageUrl: '',
          verified: true,
          description: `Rune ${entry.metadata.name} on block ${entry.rune_id.block}`,
          holdersCount: Number(entry.holder_count),
          volume24h: Number(entry.trading_volume_24h),
        }));
        
        setFilteredRunes(searchData);
        logger.userAction('Search Runes', { query: searchQuery, results: searchData.length });
      } catch (error) {
        logger.error('Search failed, using local filter', error instanceof Error ? error : undefined);
        // Fallback to local search
        const filtered = runes.filter(
          (rune) =>
            rune.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rune.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rune.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredRunes(filtered);
      }
    };

    // Debounce search - 300ms
    const timeoutId = setTimeout(() => {
      searchRunes();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, runes, sortBy]);

  // Handle rune selection for lightbox
  const handleRuneClick = (rune: RuneData, index: number) => {
    setSelectedRune(rune);
    setSelectedRuneIndex(index);
  };

  const handleNextRune = () => {
    if (selectedRuneIndex < filteredRunes.length - 1) {
      const nextIndex = selectedRuneIndex + 1;
      setSelectedRune(filteredRunes[nextIndex]);
      setSelectedRuneIndex(nextIndex);
    }
  };

  const handlePrevRune = () => {
    if (selectedRuneIndex > 0) {
      const prevIndex = selectedRuneIndex - 1;
      setSelectedRune(filteredRunes[prevIndex]);
      setSelectedRuneIndex(prevIndex);
    }
  };

  if (loading) {
    return <RuneGallerySkeleton />;
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        {showBackButton && (
          <div className="flex justify-start mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        )}
        <h1 className="text-5xl font-serif tracking-tight">{title}</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          {subtitle}
        </p>
      </div>

      {/* Filters & Controls */}
      {showFilters && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name, symbol, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>

          {/* View & Sort Controls */}
          <div className="flex items-center gap-3">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <option value="recent">Recent First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
            </select>

            {/* View Mode */}
            <div className="flex border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
                aria-label="Grid view"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-neutral-600 dark:text-neutral-400">
        {filteredRunes.length} {filteredRunes.length === 1 ? 'Rune' : 'Runes'}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-20">
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">{error}</p>
          <Link
            href="/create"
            className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            Register Your First Rune
          </Link>
        </div>
      )}

      {/* Empty State */}
      {!error && filteredRunes.length === 0 && (
        <div className="text-center py-20">
          <p className="text-neutral-600 dark:text-neutral-400 mb-2">No Runes found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-orange-500 hover:text-orange-600 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Gallery Grid */}
      {!error && filteredRunes.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRunes.map((rune, index) => (
                <RevealOnScroll key={rune.id} delay={index * 0.05}>
                  <RuneCard
                    rune={rune}
                    onClick={() => handleRuneClick(rune, index)}
                    isFavorited={isFavorited(rune.id)}
                    onFavoriteToggle={() => handleFavoriteToggle(rune.id)}
                    onShare={() => shareRune(rune)}
                  />
                </RevealOnScroll>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRunes.map((rune, index) => (
                <RevealOnScroll key={rune.id} delay={index * 0.03}>
                  <RuneCardCompact
                    rune={rune}
                    onClick={() => handleRuneClick(rune, index)}
                    isFavorited={isFavorited(rune.id)}
                    onFavoriteToggle={() => handleFavoriteToggle(rune.id)}
                    onShare={() => shareRune(rune)}
                  />
                </RevealOnScroll>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {selectedRune && (
        <RuneLightbox
          rune={selectedRune}
          isOpen={!!selectedRune}
          onClose={() => {
            setSelectedRune(null);
            setSelectedRuneIndex(-1);
          }}
          onNext={selectedRuneIndex < filteredRunes.length - 1 ? handleNextRune : undefined}
          onPrev={selectedRuneIndex > 0 ? handlePrevRune : undefined}
          isFavorited={isFavorited(selectedRune.id)}
          onFavoriteToggle={() => handleFavoriteToggle(selectedRune.id)}
          onShare={() => shareRune(selectedRune)}
        />
      )}
    </div>
  );
}
