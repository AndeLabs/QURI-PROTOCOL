/**
 * Registry Canister - Complete TypeScript Types
 * Handles Rune indexing, search, and discovery
 */

import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

// ============================================================================
// ENUMS & VARIANTS
// ============================================================================

export type Result<T = null> =
  | { Ok: T }
  | { Err: string };

export type SortBy =
  | { CreatedAt: null }
  | { TotalSupply: null }
  | { Name: null }
  | { Symbol: null };

export type SortOrder =
  | { Asc: null }
  | { Desc: null };

// ============================================================================
// RUNE TYPES
// ============================================================================

export interface RuneId {
  block: bigint;
  tx: number;
}

export interface MintTerms {
  amount: bigint;
  cap: bigint;
  height_start: [] | [bigint];
  height_end: [] | [bigint];
  offset_start: [] | [bigint];
  offset_end: [] | [bigint];
}

export interface RuneMetadata {
  id: RuneId;
  name: string;
  symbol: string;
  divisibility: number;
  premine: bigint;
  terms: [] | [MintTerms];
  total_supply: bigint;
  burned: bigint;
  mints: bigint;
  etcher: string; // Bitcoin address
  created_at: bigint;
  block_height: bigint;
  txid: string;
}

export interface RuneListItem {
  id: RuneId;
  name: string;
  symbol: string;
  total_supply: bigint;
  created_at: bigint;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface SearchFilters {
  name_contains: [] | [string];
  symbol_contains: [] | [string];
  min_supply: [] | [bigint];
  max_supply: [] | [bigint];
  has_mint_terms: [] | [boolean];
}

export interface PaginationParams {
  offset: bigint;
  limit: bigint;
  sort_by: SortBy;
  sort_order: SortOrder;
}

export interface SearchResult {
  runes: RuneListItem[];
  total_count: bigint;
  has_more: boolean;
}

// ============================================================================
// ACTOR INTERFACE
// ============================================================================

export interface RegistryActor {
  // Core queries
  get_rune: ActorMethod<[RuneId], [] | [RuneMetadata]>;
  get_rune_by_name: ActorMethod<[string], [] | [RuneMetadata]>;
  total_runes: ActorMethod<[], bigint>;

  // List & Search
  list_runes: ActorMethod<[PaginationParams], Result<SearchResult>>;
  search_runes: ActorMethod<[SearchFilters, PaginationParams], Result<SearchResult>>;

  // Popular & Trending
  get_popular_runes: ActorMethod<[bigint], Result<RuneListItem[]>>;
  get_recent_runes: ActorMethod<[bigint], Result<RuneListItem[]>>;

  // User queries
  get_runes_by_creator: ActorMethod<[string, bigint], Result<RuneListItem[]>>;

  // Admin (indexer updates)
  index_rune: ActorMethod<[RuneMetadata], Result>;
  update_rune_stats: ActorMethod<[RuneId, bigint, bigint], Result>;
}

// ============================================================================
// UTILITY TYPES FOR FRONTEND
// ============================================================================

/** Simplified Rune for display in lists */
export interface RuneDisplayData {
  id: string;
  name: string;
  symbol: string;
  totalSupply: number;
  totalSupplyFormatted: string;
  createdAt: Date;
  createdAtFormatted: string;
  hasImage?: boolean;
  imageUrl?: string;
}

/** Detailed Rune data for individual pages */
export interface RuneDetailData extends RuneDisplayData {
  divisibility: number;
  premine: number;
  burned: number;
  mints: number;
  etcher: string;
  blockHeight: number;
  txid: string;
  mintTerms?: {
    amount: number;
    cap: number;
    heightStart?: number;
    heightEnd?: number;
    offsetStart?: number;
    offsetEnd?: number;
    remaining: number;
    progress: number; // 0-100
  };
}

/** Search/filter state for UI */
export interface RuneSearchState {
  query: string;
  filters: {
    nameContains?: string;
    symbolContains?: string;
    minSupply?: number;
    maxSupply?: number;
    hasMintTerms?: boolean;
  };
  sort: {
    by: 'createdAt' | 'totalSupply' | 'name' | 'symbol';
    order: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    pageSize: number;
  };
}
