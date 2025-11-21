'use client';

/**
 * Global Search Modal with Keyboard Shortcut
 * Press Cmd+K or Ctrl+K to open
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Command, ArrowRight } from 'lucide-react';
import { useInfiniteRuneSearch } from '@/hooks/useInfiniteRunes';
import { formatSupply } from '@/lib/utils/format';
import type { RegistryEntry } from '@/types/canisters';

interface GlobalSearchProps {
  children?: React.ReactNode;
}

export function GlobalSearchProvider({ children }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {children}
      <GlobalSearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search hook
  const { runes, isLoading } = useInfiniteRuneSearch(debouncedQuery, {
    pageSize: 8,
    enabled: debouncedQuery.length >= 2,
  });

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (runes.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < runes.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : runes.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (runes[selectedIndex]) {
          handleSelect(runes[selectedIndex]);
        }
        break;
    }
  };

  // Handle selection
  const handleSelect = (rune: RegistryEntry) => {
    router.push(`/explorer/rune/${rune.metadata.key.block}:${rune.metadata.key.tx}`);
    onClose();
  };

  // Quick actions
  const quickActions = [
    { label: 'All Runes', path: '/explorer', icon: '📋' },
    { label: 'Create Rune', path: '/create', icon: '✨' },
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Bridge', path: '/bridge', icon: '🌉' },
    { label: 'Swap', path: '/swap', icon: '🔄' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-museum-white border border-museum-light-gray rounded-2xl shadow-2xl overflow-hidden mx-4">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-museum-light-gray">
                <Search className="h-5 w-5 text-museum-dark-gray flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search runes, pages, or actions..."
                  className="flex-1 bg-transparent text-lg text-museum-black placeholder:text-museum-dark-gray
                           focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setDebouncedQuery('');
                      inputRef.current?.focus();
                    }}
                    className="p-1 hover:bg-museum-cream rounded transition-colors"
                  >
                    <X className="h-4 w-4 text-museum-dark-gray" />
                  </button>
                )}
                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-museum-cream rounded text-xs
                             text-museum-dark-gray font-mono">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {/* Loading */}
                {isLoading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-museum-dark-gray">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Searching...</span>
                  </div>
                )}

                {/* Search Results */}
                {!isLoading && runes.length > 0 && (
                  <div className="py-2">
                    <p className="px-4 py-2 text-xs font-semibold text-museum-dark-gray uppercase">
                      Runes
                    </p>
                    {runes.map((rune, index) => (
                      <button
                        key={`${rune.metadata.key.block}:${rune.metadata.key.tx}`}
                        onClick={() => handleSelect(rune)}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3
                                   hover:bg-museum-cream transition-colors
                                   ${selectedIndex === index ? 'bg-museum-cream' : ''}`}
                      >
                        <span className="text-2xl flex-shrink-0">{rune.metadata.symbol}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-museum-black truncate">
                            {rune.metadata.name}
                          </p>
                          <p className="text-xs text-museum-dark-gray font-mono">
                            {rune.metadata.key.block.toString()}:{rune.metadata.key.tx}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-museum-black">
                            {rune.metadata.terms[0]
                              ? formatSupply(rune.metadata.terms[0].amount, rune.metadata.divisibility)
                              : formatSupply(rune.metadata.premine, rune.metadata.divisibility)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-museum-dark-gray flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {!isLoading && debouncedQuery.length >= 2 && runes.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-museum-dark-gray">No runes found</p>
                  </div>
                )}

                {/* Quick Actions (when no search) */}
                {!query && (
                  <div className="py-2">
                    <p className="px-4 py-2 text-xs font-semibold text-museum-dark-gray uppercase">
                      Quick Actions
                    </p>
                    {quickActions.map((action) => (
                      <button
                        key={action.path}
                        onClick={() => {
                          router.push(action.path);
                          onClose();
                        }}
                        className="w-full px-4 py-3 text-left flex items-center gap-3
                                 hover:bg-museum-cream transition-colors"
                      >
                        <span className="text-lg">{action.icon}</span>
                        <span className="font-medium text-museum-black">{action.label}</span>
                        <ArrowRight className="h-4 w-4 text-museum-dark-gray ml-auto" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-museum-cream/50 border-t border-museum-light-gray
                            flex items-center justify-between text-xs text-museum-dark-gray">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-museum-white rounded border border-museum-light-gray font-mono">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-museum-white rounded border border-museum-light-gray font-mono">↓</kbd>
                    to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-museum-white rounded border border-museum-light-gray font-mono">↵</kbd>
                    to select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <Command className="h-3 w-3" />K to search
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Search Trigger Button
 * Shows keyboard shortcut hint
 */
export function SearchTrigger({ className = '' }: { className?: string }) {
  const [, setIsOpen] = useState(false);

  return (
    <button
      onClick={() => setIsOpen(true)}
      className={`flex items-center gap-3 px-4 py-2.5 bg-museum-white border border-museum-light-gray
                 rounded-xl hover:border-gold-300 transition-colors ${className}`}
    >
      <Search className="h-4 w-4 text-museum-dark-gray" />
      <span className="text-museum-dark-gray">Search...</span>
      <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 bg-museum-cream rounded
                    text-xs text-museum-dark-gray font-mono ml-auto">
        <Command className="h-3 w-3" />K
      </kbd>
    </button>
  );
}
