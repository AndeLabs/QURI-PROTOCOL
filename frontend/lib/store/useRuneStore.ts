/**
 * Zustand Store for Runes
 * Manages cached runes data and local state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RegistryEntry, RuneId } from '@/types/canisters';

interface RuneState {
  // Cached runes (Map for O(1) lookups)
  runes: Map<string, RegistryEntry>;

  // Search/filter state
  searchQuery: string;
  selectedRune: RegistryEntry | null;

  // UI state
  viewMode: 'grid' | 'list';
  sortBy: 'created' | 'volume' | 'trending';

  // Actions - Rune management
  addRune: (rune: RegistryEntry) => void;
  addRunes: (runes: RegistryEntry[]) => void;
  updateRune: (id: string, rune: RegistryEntry) => void;
  getRune: (id: string) => RegistryEntry | undefined;
  removeRune: (id: string) => void;
  clearRunes: () => void;

  // Actions - Search & Filter
  setSearchQuery: (query: string) => void;
  setSelectedRune: (rune: RegistryEntry | null) => void;

  // Actions - UI
  setViewMode: (mode: 'grid' | 'list') => void;
  setSortBy: (sort: 'created' | 'volume' | 'trending') => void;

  // Computed
  getRunesBySearch: () => RegistryEntry[];
  getTotalRunes: () => number;
}

/**
 * Generate unique key for a Rune from its metadata key
 */
function getRuneKey(rune: RegistryEntry): string {
  return `${rune.metadata.key.block}-${rune.metadata.key.tx}`;
}

export const useRuneStore = create<RuneState>()(
  persist(
    (set, get) => ({
      // Initial state
      runes: new Map(),
      searchQuery: '',
      selectedRune: null,
      viewMode: 'grid',
      sortBy: 'created',

      // Rune management
      addRune: (rune) =>
        set((state) => {
          const newRunes = new Map(state.runes);
          const key = getRuneKey(rune);
          newRunes.set(key, rune);
          return { runes: newRunes };
        }),

      addRunes: (newRunes) =>
        set((state) => {
          const runesMap = new Map(state.runes);
          newRunes.forEach((rune) => {
            const key = getRuneKey(rune);
            runesMap.set(key, rune);
          });
          return { runes: runesMap };
        }),

      updateRune: (id, rune) =>
        set((state) => {
          const newRunes = new Map(state.runes);
          newRunes.set(id, rune);
          return { runes: newRunes };
        }),

      getRune: (id) => get().runes.get(id),

      removeRune: (id) =>
        set((state) => {
          const newRunes = new Map(state.runes);
          newRunes.delete(id);
          return { runes: newRunes };
        }),

      clearRunes: () => set({ runes: new Map() }),

      // Search & Filter
      setSearchQuery: (query) => set({ searchQuery: query }),

      setSelectedRune: (rune) => set({ selectedRune: rune }),

      // UI
      setViewMode: (mode) => set({ viewMode: mode }),

      setSortBy: (sort) => set({ sortBy: sort }),

      // Computed
      getRunesBySearch: () => {
        const { runes, searchQuery, sortBy } = get();
        let runeList = Array.from(runes.values());

        // Filter by search
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          runeList = runeList.filter(
            (rune) =>
              rune.metadata.name.toLowerCase().includes(query) ||
              rune.metadata.symbol.toLowerCase().includes(query)
          );
        }

        // Sort
        runeList.sort((a, b) => {
          switch (sortBy) {
            case 'volume':
              return Number(b.trading_volume_24h - a.trading_volume_24h);
            case 'trending':
              return Number(b.holder_count - a.holder_count);
            case 'created':
            default:
              return Number(b.metadata.created_at - a.metadata.created_at);
          }
        });

        return runeList;
      },

      getTotalRunes: () => get().runes.size,
    }),
    {
      name: 'quri-rune-storage',
      storage: {
        getItem: (name: string) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              runes: new Map(parsed.state.runes || []),
            },
          };
        },
        setItem: (name: string, value: unknown) => {
          const valueObj = value as { state: RuneState };
          const serialized = JSON.stringify({
            state: {
              ...valueObj.state,
              runes: Array.from(valueObj.state.runes.entries()),
            },
            version: (value as Record<string, unknown>).version,
          });
          localStorage.setItem(name, serialized);
        },
        removeItem: (name: string) => localStorage.removeItem(name),
      },
      // Only persist runes data, not UI state
      partialize: (state) => ({
        runes: state.runes,
      }),
    }
  )
);
