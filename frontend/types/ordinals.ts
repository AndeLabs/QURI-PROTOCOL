/**
 * Ordinals Types
 * Types for Bitcoin Ordinals/Inscriptions
 */

export interface OrdinalInscription {
  id: string;
  number: number;
  address: string;
  genesis_address: string;
  genesis_block_height: number;
  genesis_block_hash: string;
  genesis_tx_id: string;
  genesis_fee: number;
  genesis_timestamp: number;
  tx_id: string;
  location: string;
  output: string;
  value: number;
  offset: number;
  sat_ordinal: number;
  sat_rarity: string;
  sat_coinbase_height: number;
  mime_type: string;
  content_type: string;
  content_length: number;
  timestamp: number;
  curse_type: string | null;
  recursive: boolean;
  recursion_refs: string[] | null;
}

export interface OrdinalsResponse {
  limit: number;
  offset: number;
  total: number;
  results: OrdinalInscription[];
}

export interface OrdinalFilters {
  mime_type?: string[];
  rarity?: string[];
  from_number?: number;
  to_number?: number;
  from_genesis_block_height?: number;
  to_genesis_block_height?: number;
  from_genesis_timestamp?: number;
  to_genesis_timestamp?: number;
  from_sat_ordinal?: number;
  to_sat_ordinal?: number;
  from_sat_coinbase_height?: number;
  to_sat_coinbase_height?: number;
  address?: string;
  recursive?: boolean;
  cursed?: boolean;
}

export interface IndexedOrdinal {
  id: string;
  number: bigint;
  content_type: string;
  content_length: bigint;
  genesis_block: bigint;
  genesis_tx: string;
  sat_ordinal: bigint;
  sat_rarity: string;
  timestamp: bigint;
  owner: string;
}

export type OrdinalSortBy = 'number' | 'genesis_block_height' | 'ordinal' | 'rarity';
export type SortOrder = 'asc' | 'desc';

export interface OrdinalStats {
  total_inscriptions: number;
  total_by_mime_type: Record<string, number>;
  latest_inscription_number: number;
  latest_block_height: number;
}

// Rarity levels for sat ordinals
export const SAT_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
] as const;

export type SatRarity = typeof SAT_RARITIES[number];

// Common MIME types for inscriptions
export const INSCRIPTION_MIME_TYPES = {
  IMAGE: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  TEXT: ['text/plain', 'text/html', 'text/markdown'],
  JSON: ['application/json'],
  VIDEO: ['video/mp4', 'video/webm'],
  AUDIO: ['audio/mpeg', 'audio/wav'],
} as const;
