/**
 * QURI Protocol - Normalized Zustand Store
 * 
 * Performance optimizations:
 * - Normalized entities (O(1) lookups)
 * - Derived state with memoization
 * - Shallow equality checks
 * - Middleware: persist, devtools, immer
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  QURIStore,
  NormalizedState,
  RuneMetadata,
  EtchingProcess,
  UTXO,
  ProcessStatus,
  RuneKey,
} from './types';
import {
  runeKeyToString,
  utxoToString,
  principalToString,
} from './types';
import type { Principal } from '@dfinity/principal';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: NormalizedState = {
  entities: {
    runes: {},
    processes: {},
    utxos: {},
  },
  ui: {
    selectedRuneKey: null,
    selectedProcessId: null,
    filters: {
      search: '',
      creator: null,
      status: [],
    },
    pagination: {
      page: 0,
      pageSize: 20,
      total: 0,
    },
  },
  derived: {
    runesByCreator: {},
    processesByRune: {},
    utxosByAddress: {},
  },
  loading: {
    runes: false,
    processes: false,
    utxos: false,
  },
  errors: {
    runes: null,
    processes: null,
    utxos: null,
  },
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useQURIStore = create<QURIStore>()(
  devtools(
    immer((set, get) => ({
        ...initialState,

        // ====================================================================
        // ENTITY SELECTORS
        // ====================================================================

        getRuneByKey: (key: string) => {
          return get().entities.runes[key];
        },

        getProcessById: (id: string) => {
          return get().entities.processes[id];
        },

        getUtxoById: (id: string) => {
          return get().entities.utxos[id];
        },

        // ====================================================================
        // DERIVED SELECTORS
        // ====================================================================

        getRunesByCreator: (creator: Principal) => {
          const creatorKey = principalToString(creator);
          const runeKeys = get().derived.runesByCreator[creatorKey] || [];
          const runes = get().entities.runes;
          return runeKeys.map(key => runes[key]).filter(Boolean);
        },

        getProcessesByRune: (runeKey: string) => {
          const processIds = get().derived.processesByRune[runeKey] || [];
          const processes = get().entities.processes;
          return processIds.map(id => processes[id]).filter(Boolean);
        },

        getActiveProcesses: () => {
          const processes = Object.values(get().entities.processes);
          return processes.filter(p => 
            p.status === 'pending' || 
            p.status === 'signing' || 
            p.status === 'broadcasting' ||
            p.status === 'confirming'
          );
        },

        getConfirmedProcesses: () => {
          const processes = Object.values(get().entities.processes);
          return processes.filter(p => p.status === 'confirmed');
        },

        getFailedProcesses: () => {
          const processes = Object.values(get().entities.processes);
          return processes.filter(p => p.status === 'failed');
        },

        // ====================================================================
        // AGGREGATION SELECTORS
        // ====================================================================

        getTotalRunes: () => {
          return Object.keys(get().entities.runes).length;
        },

        getTotalSupply: () => {
          const runes = Object.values(get().entities.runes);
          return runes.reduce((sum, rune) => sum + rune.total_supply, 0n);
        },

        getUtxoBalance: (address: string) => {
          const utxoIds = get().derived.utxosByAddress[address] || [];
          const utxos = get().entities.utxos;
          return utxoIds.reduce((sum, id) => {
            const utxo = utxos[id];
            return utxo ? sum + utxo.amount : sum;
          }, 0n);
        },

        // ====================================================================
        // UI SELECTORS
        // ====================================================================

        getFilteredRunes: () => {
          const state = get();
          const { search, creator, status } = state.ui.filters;
          let runes = Object.values(state.entities.runes);

          // Filter by search
          if (search) {
            const searchLower = search.toLowerCase();
            runes = runes.filter(r => 
              r.name.toLowerCase().includes(searchLower) ||
              r.symbol.toLowerCase().includes(searchLower)
            );
          }

          // Filter by creator
          if (creator) {
            runes = runes.filter(r => 
              principalToString(r.creator) === creator
            );
          }

          // Filter by process status
          if (status.length > 0) {
            const runesWithStatus = new Set<string>();
            Object.values(state.entities.processes)
              .filter(p => status.includes(p.status))
              .forEach(p => runesWithStatus.add(runeKeyToString(p.rune_key)));
            
            runes = runes.filter(r => 
              runesWithStatus.has(runeKeyToString(r.key))
            );
          }

          return runes;
        },

        getPaginatedRunes: () => {
          const state = get();
          const filtered = state.getFilteredRunes();
          const { page, pageSize } = state.ui.pagination;
          const start = page * pageSize;
          const end = start + pageSize;
          return filtered.slice(start, end);
        },

        getSelectedRune: () => {
          const key = get().ui.selectedRuneKey;
          return key ? get().getRuneByKey(key) : null;
        },

        getSelectedProcess: () => {
          const id = get().ui.selectedProcessId;
          return id ? get().getProcessById(id) : null;
        },

        // ====================================================================
        // RUNE ACTIONS
        // ====================================================================

        addRune: (rune: RuneMetadata) => {
          set((state) => {
            const key = runeKeyToString(rune.key);
            const creatorKey = principalToString(rune.creator);

            // Add to entities
            state.entities.runes[key] = rune;

            // Update derived state
            if (!state.derived.runesByCreator[creatorKey]) {
              state.derived.runesByCreator[creatorKey] = [];
            }
            if (!state.derived.runesByCreator[creatorKey].includes(key)) {
              state.derived.runesByCreator[creatorKey].push(key);
            }

            // Update pagination total
            state.ui.pagination.total = Object.keys(state.entities.runes).length;
          });
        },

        addRunes: (runes: RuneMetadata[]) => {
          set((state) => {
            runes.forEach(rune => {
              const key = runeKeyToString(rune.key);
              const creatorKey = principalToString(rune.creator);

              state.entities.runes[key] = rune;

              if (!state.derived.runesByCreator[creatorKey]) {
                state.derived.runesByCreator[creatorKey] = [];
              }
              if (!state.derived.runesByCreator[creatorKey].includes(key)) {
                state.derived.runesByCreator[creatorKey].push(key);
              }
            });

            state.ui.pagination.total = Object.keys(state.entities.runes).length;
          });
        },

        updateRune: (key: string, updates: Partial<RuneMetadata>) => {
          set((state) => {
            const existing = state.entities.runes[key];
            if (existing) {
              state.entities.runes[key] = { ...existing, ...updates };
            }
          });
        },

        removeRune: (key: string) => {
          set((state) => {
            const rune = state.entities.runes[key];
            if (rune) {
              const creatorKey = principalToString(rune.creator);
              
              // Remove from entities
              delete state.entities.runes[key];

              // Update derived state
              if (state.derived.runesByCreator[creatorKey]) {
                state.derived.runesByCreator[creatorKey] = 
                  state.derived.runesByCreator[creatorKey].filter(k => k !== key);
              }

              // Update pagination
              state.ui.pagination.total = Object.keys(state.entities.runes).length;
            }
          });
        },

        // ====================================================================
        // PROCESS ACTIONS
        // ====================================================================

        addProcess: (process: EtchingProcess) => {
          set((state) => {
            const runeKey = runeKeyToString(process.rune_key);

            // Add to entities
            state.entities.processes[process.id] = process;

            // Update derived state
            if (!state.derived.processesByRune[runeKey]) {
              state.derived.processesByRune[runeKey] = [];
            }
            if (!state.derived.processesByRune[runeKey].includes(process.id)) {
              state.derived.processesByRune[runeKey].push(process.id);
            }
          });
        },

        updateProcess: (id: string, updates: Partial<EtchingProcess>) => {
          set((state) => {
            const existing = state.entities.processes[id];
            if (existing) {
              state.entities.processes[id] = {
                ...existing,
                ...updates,
                updated_at: Date.now(),
              };
            }
          });
        },

        removeProcess: (id: string) => {
          set((state) => {
            const process = state.entities.processes[id];
            if (process) {
              const runeKey = runeKeyToString(process.rune_key);
              
              delete state.entities.processes[id];

              if (state.derived.processesByRune[runeKey]) {
                state.derived.processesByRune[runeKey] = 
                  state.derived.processesByRune[runeKey].filter(pid => pid !== id);
              }
            }
          });
        },

        setProcessStatus: (id: string, status: ProcessStatus) => {
          get().updateProcess(id, { status });
        },

        incrementConfirmations: (id: string) => {
          set((state) => {
            const process = state.entities.processes[id];
            if (process) {
              state.entities.processes[id].confirmations += 1;
              state.entities.processes[id].updated_at = Date.now();

              // Auto-confirm at 6 confirmations
              if (state.entities.processes[id].confirmations >= 6) {
                state.entities.processes[id].status = 'confirmed';
              }
            }
          });
        },

        // ====================================================================
        // UTXO ACTIONS
        // ====================================================================

        addUtxo: (utxo: UTXO) => {
          set((state) => {
            const id = utxoToString(utxo);

            state.entities.utxos[id] = utxo;

            if (!state.derived.utxosByAddress[utxo.address]) {
              state.derived.utxosByAddress[utxo.address] = [];
            }
            if (!state.derived.utxosByAddress[utxo.address].includes(id)) {
              state.derived.utxosByAddress[utxo.address].push(id);
            }
          });
        },

        addUtxos: (utxos: UTXO[]) => {
          set((state) => {
            utxos.forEach(utxo => {
              const id = utxoToString(utxo);

              state.entities.utxos[id] = utxo;

              if (!state.derived.utxosByAddress[utxo.address]) {
                state.derived.utxosByAddress[utxo.address] = [];
              }
              if (!state.derived.utxosByAddress[utxo.address].includes(id)) {
                state.derived.utxosByAddress[utxo.address].push(id);
              }
            });
          });
        },

        removeUtxo: (id: string) => {
          set((state) => {
            const utxo = state.entities.utxos[id];
            if (utxo) {
              delete state.entities.utxos[id];

              if (state.derived.utxosByAddress[utxo.address]) {
                state.derived.utxosByAddress[utxo.address] = 
                  state.derived.utxosByAddress[utxo.address].filter(uid => uid !== id);
              }
            }
          });
        },

        updateUtxoConfirmations: (id: string, confirmations: number) => {
          set((state) => {
            const utxo = state.entities.utxos[id];
            if (utxo) {
              state.entities.utxos[id].confirmations = confirmations;
            }
          });
        },

        // ====================================================================
        // UI ACTIONS
        // ====================================================================

        setSelectedRune: (key: string | null) => {
          set((state) => {
            state.ui.selectedRuneKey = key;
          });
        },

        setSelectedProcess: (id: string | null) => {
          set((state) => {
            state.ui.selectedProcessId = id;
          });
        },

        setSearch: (search: string) => {
          set((state) => {
            state.ui.filters.search = search;
            state.ui.pagination.page = 0; // Reset to first page
          });
        },

        setCreatorFilter: (creator: string | null) => {
          set((state) => {
            state.ui.filters.creator = creator;
            state.ui.pagination.page = 0;
          });
        },

        setStatusFilter: (statuses: ProcessStatus[]) => {
          set((state) => {
            state.ui.filters.status = statuses;
            state.ui.pagination.page = 0;
          });
        },

        setPage: (page: number) => {
          set((state) => {
            state.ui.pagination.page = page;
          });
        },

        // ====================================================================
        // BATCH ACTIONS
        // ====================================================================

        reset: () => {
          set(initialState);
        },

        hydrate: (state: Partial<NormalizedState>) => {
          set((draft) => {
            Object.assign(draft, state);
          });
        },
      })),
    { name: 'QURI Store' }
  )
);

// ============================================================================
// SELECTOR HOOKS (Performance optimized)
// ============================================================================

/**
 * Hook to get a single rune by key
 * Memoized - only re-renders if the specific rune changes
 */
export function useRune(key: string | null) {
  return useQURIStore(
    (state) => key ? state.getRuneByKey(key) : null,
    (a, b) => a?.key === b?.key && a?.created_at === b?.created_at
  );
}

/**
 * Hook to get runes by creator
 * Memoized - only re-renders if creator's runes change
 */
export function useRunesByCreator(creator: Principal | null) {
  return useQURIStore(
    (state) => creator ? state.getRunesByCreator(creator) : [],
    (a, b) => a.length === b.length && a.every((r, i) => r.key === b[i]?.key)
  );
}

/**
 * Hook to get active processes
 * Memoized - only re-renders if active processes change
 */
export function useActiveProcesses() {
  return useQURIStore(
    (state) => state.getActiveProcesses(),
    (a, b) => a.length === b.length && a.every((p, i) => p.id === b[i]?.id && p.status === b[i]?.status)
  );
}

/**
 * Hook to get UTXO balance for address
 * Memoized - only re-renders if balance changes
 */
export function useUtxoBalance(address: string | null) {
  return useQURIStore(
    (state) => address ? state.getUtxoBalance(address) : 0n,
    (a, b) => a === b
  );
}
