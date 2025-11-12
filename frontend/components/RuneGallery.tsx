'use client';

import { useState, useEffect } from 'react';
import { RuneCard, RuneCardCompact, RuneData } from './RuneCard';
import { RuneLightbox } from './RuneLightbox';
import { RuneGallerySkeleton } from './LoadingSkeletons';
import { RevealOnScroll } from './Parallax';
import { Grid3x3, List, Search, SlidersHorizontal } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { shareRune } from '@/lib/utils/share';

/**
 * Museum-Grade Rune Gallery Component
 * Inspired by Foundation.app curated collections and MoMA digital exhibitions
 * Features generous white space, elegant grid, and sophisticated filtering
 */

type ViewMode = 'grid' | 'list';
type SortOption = 'recent' | 'oldest' | 'supply-high' | 'supply-low' | 'name';

interface RuneGalleryProps {
  initialRunes?: RuneData[];
  title?: string;
  subtitle?: string;
  showFilters?: boolean;
}

export function RuneGallery({
  initialRunes = [],
  title = 'Runes Collection',
  subtitle = 'Explore the finest Bitcoin Runes',
  showFilters = true,
}: RuneGalleryProps) {
  const [runes, setRunes] = useState<RuneData[]>(initialRunes);
  const [filteredRunes, setFilteredRunes] = useState<RuneData[]>(initialRunes);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [loading, setLoading] = useState(false);
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

  // Load runes from API (placeholder for now)
  useEffect(() => {
    if (initialRunes.length === 0) {
      loadRunes();
    }
  }, []);

  const loadRunes = async () => {
    try {
      setLoading(true);
      logger.info('Loading runes from registry');

      // TODO: Replace with actual API call to registry canister
      // const result = await actor.list_runes({ offset: 0, limit: 50 });

      // Mock data for demonstration
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockRunes: RuneData[] = Array.from({ length: 12 }, (_, i) => ({
        id: `1:${1000 + i}`,
        name: `QUANTUM•${['LEAP', 'WAVE', 'FLUX', 'NOVA', 'PRIME', 'VISION', 'DAWN', 'ECHO', 'ZENITH', 'CORE', 'PULSE', 'SPARK'][i]}`,
        symbol: ['QLEP', 'QWAV', 'QFLX', 'QNOV', 'QPRM', 'QVIS', 'QDWN', 'QECH', 'QZEN', 'QCOR', 'QPLS', 'QSPK'][i],
        supply: `${(Math.random() * 10000000).toFixed(0)}`,
        divisibility: Math.floor(Math.random() * 9),
        creator: 'bc1q' + Math.random().toString(36).substring(2, 15),
        blockHeight: 830000 + i * 100,
        timestamp: Date.now() - i * 86400000 * 2,
        description: 'A unique Bitcoin Rune representing digital scarcity and artistic expression on the blockchain.',
      }));

      setRunes(mockRunes);
      setFilteredRunes(mockRunes);
      logger.info('Loaded runes successfully', { count: mockRunes.length });
    } catch (error) {
      logger.error('Failed to load runes', error instanceof Error ? error : undefined);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort
  useEffect(() => {
    let filtered = [...runes];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (rune) =>
          rune.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rune.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'supply-high':
        filtered.sort((a, b) => parseInt(b.supply) - parseInt(a.supply));
        break;
      case 'supply-low':
        filtered.sort((a, b) => parseInt(a.supply) - parseInt(b.supply));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredRunes(filtered);
    logger.userAction('Filter/Sort Runes', { query: searchQuery, sort: sortBy, count: filtered.length });
  }, [runes, searchQuery, sortBy]);

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

  const handleShare = async (rune: RuneData) => {
    const success = await shareRune(rune);
    if (success) {
      logger.userAction('Share Rune', { runeId: rune.id });
    }
  };

  if (loading) {
    return <RuneGallerySkeleton viewMode={viewMode} />;
  }

  return (
    <div className="min-h-screen bg-museum-white">
      {/* Header - Museum Title Wall */}
      <header className="border-b border-museum-light-gray bg-museum-cream">
        <div className="max-w-screen-2xl mx-auto px-8 py-16 lg:px-16 lg:py-24">
          <div className="max-w-3xl">
            <h1 className="font-serif text-5xl lg:text-6xl font-bold text-museum-black mb-4 tracking-tight">
              {title}
            </h1>
            <p className="text-xl text-museum-dark-gray leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>
      </header>

      {/* Filters & Controls - Minimal Design */}
      {showFilters && (
        <div className="border-b border-museum-light-gray bg-museum-white sticky top-0 z-10 backdrop-blur-sm bg-opacity-95">
          <div className="max-w-screen-2xl mx-auto px-8 py-6 lg:px-16">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-museum-gray" />
                <input
                  type="text"
                  placeholder="Search runes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="
                    w-full pl-12 pr-4 py-3
                    bg-museum-cream
                    border border-museum-light-gray
                    text-museum-charcoal
                    placeholder-museum-gray
                    focus:outline-none focus:border-gold-400
                    transition-colors duration-200
                  "
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {/* Sort */}
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-museum-gray" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="
                      bg-museum-cream
                      border border-museum-light-gray
                      text-museum-charcoal text-sm
                      px-4 py-2
                      focus:outline-none focus:border-gold-400
                      transition-colors duration-200
                    "
                  >
                    <option value="recent">Recently Added</option>
                    <option value="oldest">Oldest First</option>
                    <option value="supply-high">Highest Supply</option>
                    <option value="supply-low">Lowest Supply</option>
                    <option value="name">Alphabetical</option>
                  </select>
                </div>

                {/* View Toggle */}
                <div className="flex border border-museum-light-gray">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`
                      p-2 transition-colors duration-200
                      ${viewMode === 'grid' ? 'bg-museum-charcoal text-museum-white' : 'bg-museum-cream text-museum-gray hover:text-museum-charcoal'}
                    `}
                    aria-label="Grid view"
                  >
                    <Grid3x3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`
                      p-2 transition-colors duration-200 border-l border-museum-light-gray
                      ${viewMode === 'list' ? 'bg-museum-charcoal text-museum-white' : 'bg-museum-cream text-museum-gray hover:text-museum-charcoal'}
                    `}
                    aria-label="List view"
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4">
              <p className="text-sm text-museum-dark-gray">
                {filteredRunes.length} {filteredRunes.length === 1 ? 'rune' : 'runes'}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery - Museum Grid Layout */}
      <main className="max-w-screen-2xl mx-auto px-8 py-12 lg:px-16 lg:py-16">
        {filteredRunes.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-museum-dark-gray font-serif text-xl mb-2">No runes found</p>
            <p className="text-museum-gray text-sm">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-12">
            {filteredRunes.map((rune, index) => (
              <RevealOnScroll key={rune.id} animation="fade" delay={index * 50}>
                <RuneCard
                  rune={rune}
                  onClick={() => handleRuneClick(rune, index)}
                  featured={index === 0}
                  onFavorite={handleFavoriteToggle}
                  onShare={handleShare}
                  isFavorited={isFavorited(rune.id)}
                />
              </RevealOnScroll>
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-0 border border-museum-light-gray">
            {filteredRunes.map((rune, index) => (
              <RuneCardCompact
                key={rune.id}
                rune={rune}
                onClick={() => handleRuneClick(rune, index)}
                onFavorite={handleFavoriteToggle}
                isFavorited={isFavorited(rune.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Lightbox - Full-screen Art Viewing */}
      {selectedRune && (
        <RuneLightbox
          rune={selectedRune}
          onClose={() => {
            setSelectedRune(null);
            setSelectedRuneIndex(-1);
          }}
          onNext={handleNextRune}
          onPrev={handlePrevRune}
          hasNext={selectedRuneIndex < filteredRunes.length - 1}
          hasPrev={selectedRuneIndex > 0}
          onFavorite={handleFavoriteToggle}
          onShare={handleShare}
          isFavorited={isFavorited(selectedRune.id)}
        />
      )}
    </div>
  );
}
