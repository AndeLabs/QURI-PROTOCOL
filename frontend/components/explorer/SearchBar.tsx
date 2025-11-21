'use client';

/**
 * Global Search Bar Component
 * Hybrid search: instant local + registry canister search
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useInstantSearch } from '@/hooks/useSearchService';
import { getRegistryActor } from '@/lib/icp/actors';
import { formatSupply } from '@/lib/utils/format';
import type { RegistryEntry } from '@/types/canisters';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onSelect?: (rune: RegistryEntry) => void;
  showResults?: boolean;
  /** Pre-loaded runes for instant local search */
  localRunes?: RegistryEntry[];
}

export function SearchBar({
  className = '',
  placeholder = 'Search runes by name, symbol, or ID...',
  onSelect,
  showResults = true,
  localRunes = [],
}: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Instant local search for already loaded runes
  const { search: localSearch, indexSize } = useInstantSearch(localRunes);

  // Debounce for canister search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Canister search for complete results (uses indexed_runes storage)
  const isEnabled = debouncedQuery.length >= 2;

  const {
    data: canisterResults,
    isLoading: isCanisterLoading,
    isError,
  } = useQuery({
    queryKey: ['search', 'indexed', debouncedQuery],
    queryFn: async () => {
      const actor = await getRegistryActor();
      // Use search_indexed_runes which has the synced data
      const result = await actor.search_indexed_runes(debouncedQuery, 0n, 30n);

      // Convert IndexedRune to RegistryEntry format
      return result.results.map((rune: any): RegistryEntry => {
        // Handle terms which comes as optional array [terms] or []
        const terms = rune.terms && rune.terms.length > 0 ? rune.terms[0] : null;
        const timestamp = typeof rune.timestamp === 'bigint' ? rune.timestamp : BigInt(rune.timestamp);

        return {
          metadata: {
            key: {
              block: typeof rune.id.block === 'bigint' ? rune.id.block : BigInt(rune.id.block),
              tx: Number(rune.id.tx_index),
            },
            name: rune.name,
            symbol: rune.symbol,
            divisibility: Number(rune.decimals),
            total_supply: typeof rune.total_supply === 'bigint' ? rune.total_supply : BigInt(rune.total_supply),
            premine: typeof rune.premine === 'bigint' ? rune.premine : BigInt(rune.premine),
            terms: terms ? [{
              amount: typeof terms.amount === 'bigint' ? terms.amount : BigInt(terms.amount || 0),
              cap: typeof terms.cap === 'bigint' ? terms.cap : BigInt(terms.cap || 0),
              height_start: terms.height_start ? [BigInt(terms.height_start)] : [],
              height_end: terms.height_end ? [BigInt(terms.height_end)] : [],
              offset_start: [],
              offset_end: [],
            }] as [any] : [],
            creator: rune.etcher || 'unknown',
            created_at: timestamp,
          },
          bonding_curve: [],
          trading_volume_24h: 0n,
          holder_count: 0n,
          indexed_at: timestamp * 1000000n,
        };
      });
    },
    enabled: isEnabled,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Combine local + canister results
  const runes: RegistryEntry[] = useMemo(() => {
    // First, get instant local results
    const localResults = query.length >= 2
      ? localSearch(query)
          .map(result => result.item.originalData as RegistryEntry)
          .filter(Boolean)
      : [];

    // If we have canister results, merge them
    if (canisterResults && canisterResults.length > 0) {
      const seenKeys = new Set(
        localResults.map(r => `${r.metadata.key.block}:${r.metadata.key.tx}`)
      );

      const combined = [...localResults];
      for (const rune of canisterResults) {
        const key = `${rune.metadata.key.block}:${rune.metadata.key.tx}`;
        if (!seenKeys.has(key)) {
          combined.push(rune);
          seenKeys.add(key);
        }
      }
      return combined;
    }

    return localResults;
  }, [query, localSearch, canisterResults]);

  // Show loading only when canister is fetching and no local results
  const isLoading = isCanisterLoading && runes.length === 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || runes.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < runes.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && runes[selectedIndex]) {
          handleSelect(runes[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle selection
  const handleSelect = (rune: RegistryEntry) => {
    if (onSelect) {
      onSelect(rune);
    } else {
      // Navigate to rune detail page
      router.push(`/explorer/rune/${rune.metadata.key.block}:${rune.metadata.key.tx}`);
    }
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-museum-dark-gray" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-10 py-3 bg-museum-white border border-museum-light-gray rounded-xl
                     text-museum-black placeholder:text-museum-dark-gray
                     focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400
                     transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-museum-cream rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-museum-dark-gray" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <AnimatePresence>
          {isOpen && (query.length >= 2 || indexSize > 0) && (
            <motion.div
              className="absolute top-full left-0 right-0 mt-2 bg-museum-white border border-museum-light-gray
                         rounded-xl shadow-lg overflow-hidden z-50"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-museum-dark-gray">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Searching...</span>
                </div>
              )}

              {/* Error State */}
              {isError && (
                <div className="py-4 px-4 text-center text-red-600 text-sm">
                  Failed to search. Please try again.
                </div>
              )}

              {/* Results */}
              {!isLoading && !isError && runes.length > 0 && (
                <ul className="py-2">
                  {runes.map((rune, index) => (
                    <li key={`${rune.metadata.key.block}:${rune.metadata.key.tx}`}>
                      <button
                        onClick={() => handleSelect(rune)}
                        className={`w-full px-4 py-3 text-left hover:bg-museum-cream transition-colors
                                   ${selectedIndex === index ? 'bg-museum-cream' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{rune.metadata.symbol}</span>
                              <span className="font-semibold text-museum-black truncate">
                                {rune.metadata.name}
                              </span>
                            </div>
                            <p className="text-xs text-museum-dark-gray font-mono mt-1">
                              ID: {rune.metadata.key.block.toString()}:{rune.metadata.key.tx}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium text-museum-black">
                              {rune.metadata.terms[0]
                                ? formatSupply(rune.metadata.terms[0].amount, rune.metadata.divisibility)
                                : formatSupply(rune.metadata.premine, rune.metadata.divisibility)}
                            </p>
                            <p className="text-xs text-museum-dark-gray">
                              Supply
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* No Results */}
              {!isLoading && !isError && runes.length === 0 && query.length >= 2 && (
                <div className="py-8 text-center">
                  <p className="text-museum-dark-gray">No runes found for &quot;{query}&quot;</p>
                  <p className="text-xs text-museum-dark-gray mt-1">
                    Try a different search term
                  </p>
                </div>
              )}

              {/* Search hint */}
              {query.length < 2 && (
                <div className="py-4 px-4 text-center text-museum-dark-gray text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="h-4 w-4 text-gold-500" />
                    <span>Instant search • {indexSize} runes indexed</span>
                  </div>
                  <p className="mt-1 text-xs">Type at least 2 characters</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/**
 * Compact Search Bar for header/navbar
 */
export function SearchBarCompact({ className = '' }: { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`p-2 hover:bg-museum-cream rounded-lg transition-colors ${className}`}
      >
        <Search className="h-5 w-5 text-museum-dark-gray" />
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <SearchBar
        className="w-64"
        placeholder="Search runes..."
      />
      <button
        onClick={() => setIsExpanded(false)}
        className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-museum-cream rounded-full"
      >
        <X className="h-4 w-4 text-museum-dark-gray" />
      </button>
    </div>
  );
}
