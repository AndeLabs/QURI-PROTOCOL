'use client';

import { useState, useEffect } from 'react';
import { RuneCard, RuneCardCompact, RuneData } from './RuneCard';
import { Grid3x3, List, Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-museum-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-gold-500 animate-spin" />
          <p className="text-museum-dark-gray font-serif text-lg">Loading collection...</p>
        </div>
      </div>
    );
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
              <RuneCard
                key={rune.id}
                rune={rune}
                onClick={() => setSelectedRune(rune)}
                featured={index === 0}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-0 border border-museum-light-gray">
            {filteredRunes.map((rune) => (
              <RuneCardCompact
                key={rune.id}
                rune={rune}
                onClick={() => setSelectedRune(rune)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Rune Detail Modal (placeholder) */}
      {selectedRune && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-museum-black bg-opacity-80 backdrop-blur-sm p-8"
          onClick={() => setSelectedRune(null)}
        >
          <div
            className="bg-museum-white max-w-4xl w-full max-h-[90vh] overflow-auto shadow-museum-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-12">
              <button
                onClick={() => setSelectedRune(null)}
                className="float-right text-museum-gray hover:text-museum-charcoal transition-colors"
              >
                ✕
              </button>
              <h2 className="font-serif text-4xl font-bold text-museum-black mb-4">
                {selectedRune.name}
              </h2>
              <p className="text-museum-dark-gray">
                Detailed view coming soon...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
