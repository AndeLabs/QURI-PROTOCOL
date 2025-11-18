/**
 * QURI Protocol - Normalized State Types
 * 
 * Normalized state design following Redux best practices:
 * - Entities stored by ID in flat maps
 * - References stored as IDs, not full objects
 * - Single source of truth for each entity
 * - O(1) lookups by ID
 * - Efficient updates without deep cloning
 */

import type { Principal } from '@dfinity/principal';

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export interface RuneKey {
  block: bigint;
  tx: number;
}

export interface RuneMetadata {
  key: RuneKey;
  name: string;
  symbol: string;
  divisibility: number;
  creator: Principal;
  created_at: bigint;
  total_supply: bigint;
  premine: bigint;
  terms?: MintTerms;
}

export interface MintTerms {
  amount: bigint;
  cap: bigint;
  height_start?: bigint;
  height_end?: bigint;
  offset_start?: bigint;
  offset_end?: bigint;
}

export interface EtchingProcess {
  id: string;
  rune_key: RuneKey;
  status: ProcessStatus;
  created_at: number;
  updated_at: number;
  tx_hash?: string;
  confirmations: number;
  error?: string;
}

export type ProcessStatus = 
  | 'pending'
  | 'signing'
  | 'broadcasting'
  | 'confirming'
  | 'confirmed'
  | 'failed';

export interface UTXO {
  txid: string;
  vout: number;
  amount: bigint;
  confirmations: number;
  address: string;
}

// ============================================================================
// NORMALIZED STATE SHAPE
// ============================================================================

/**
 * Normalized state - all entities stored by ID
 */
export interface NormalizedState {
  // Entity tables (normalized)
  entities: {
    runes: Record<string, RuneMetadata>;          // key: RuneKey.toString()
    processes: Record<string, EtchingProcess>;    // key: process.id
    utxos: Record<string, UTXO>;                  // key: `${txid}:${vout}`
  };

  // UI state (denormalized - cheap to rebuild)
  ui: {
    selectedRuneKey: string | null;
    selectedProcessId: string | null;
    filters: {
      search: string;
      creator: string | null;
      status: ProcessStatus[];
    };
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  };

  // Derived state (computed from entities)
  derived: {
    runesByCreator: Record<string, string[]>;     // Principal -> RuneKey[]
    processesByRune: Record<string, string[]>;    // RuneKey -> processId[]
    utxosByAddress: Record<string, string[]>;     // address -> UTXO IDs
  };

  // Loading states
  loading: {
    runes: boolean;
    processes: boolean;
    utxos: boolean;
  };

  // Error states
  errors: {
    runes: string | null;
    processes: string | null;
    utxos: string | null;
  };
}

// ============================================================================
// SELECTORS (Type-safe getters)
// ============================================================================

export interface Selectors {
  // Entity selectors
  getRuneByKey: (key: string) => RuneMetadata | undefined;
  getProcessById: (id: string) => EtchingProcess | undefined;
  getUtxoById: (id: string) => UTXO | undefined;

  // Derived selectors
  getRunesByCreator: (creator: Principal) => RuneMetadata[];
  getProcessesByRune: (runeKey: string) => EtchingProcess[];
  getActiveProcesses: () => EtchingProcess[];
  getConfirmedProcesses: () => EtchingProcess[];
  getFailedProcesses: () => EtchingProcess[];
  
  // Aggregation selectors
  getTotalRunes: () => number;
  getTotalSupply: () => bigint;
  getUtxoBalance: (address: string) => bigint;

  // UI selectors
  getFilteredRunes: () => RuneMetadata[];
  getPaginatedRunes: () => RuneMetadata[];
  getSelectedRune: () => RuneMetadata | null;
  getSelectedProcess: () => EtchingProcess | null;
}

// ============================================================================
// ACTIONS (State mutations)
// ============================================================================

export interface Actions {
  // Rune actions
  addRune: (rune: RuneMetadata) => void;
  addRunes: (runes: RuneMetadata[]) => void;
  updateRune: (key: string, updates: Partial<RuneMetadata>) => void;
  removeRune: (key: string) => void;

  // Process actions
  addProcess: (process: EtchingProcess) => void;
  updateProcess: (id: string, updates: Partial<EtchingProcess>) => void;
  removeProcess: (id: string) => void;
  setProcessStatus: (id: string, status: ProcessStatus) => void;
  incrementConfirmations: (id: string) => void;

  // UTXO actions
  addUtxo: (utxo: UTXO) => void;
  addUtxos: (utxos: UTXO[]) => void;
  removeUtxo: (id: string) => void;
  updateUtxoConfirmations: (id: string, confirmations: number) => void;

  // UI actions
  setSelectedRune: (key: string | null) => void;
  setSelectedProcess: (id: string | null) => void;
  setSearch: (search: string) => void;
  setCreatorFilter: (creator: string | null) => void;
  setStatusFilter: (statuses: ProcessStatus[]) => void;
  setPage: (page: number) => void;

  // Batch actions
  reset: () => void;
  hydrate: (state: Partial<NormalizedState>) => void;
}

// ============================================================================
// STORE TYPE
// ============================================================================

export type QURIStore = NormalizedState & Selectors & Actions;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Convert RuneKey to string ID
 */
export function runeKeyToString(key: RuneKey): string {
  return `${key.block}:${key.tx}`;
}

/**
 * Convert string ID to RuneKey
 */
export function stringToRuneKey(id: string): RuneKey {
  const [block, tx] = id.split(':');
  return {
    block: BigInt(block),
    tx: parseInt(tx, 10),
  };
}

/**
 * Convert UTXO to string ID
 */
export function utxoToString(utxo: UTXO | { txid: string; vout: number }): string {
  return `${utxo.txid}:${utxo.vout}`;
}

/**
 * Principal to string (for indexing)
 */
export function principalToString(principal: Principal): string {
  return principal.toText();
}
