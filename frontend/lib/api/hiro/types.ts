/**
 * Hiro API Types
 * Shared types for Ordinals, Runes, and BRC-20 APIs
 */

// ============================================
// Pagination
// ============================================

export interface PaginatedResponse<T> {
  limit: number;
  offset: number;
  total: number;
  results: T[];
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ============================================
// Ordinals / Inscriptions
// ============================================

export interface Inscription {
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

export interface InscriptionTransfer {
  block_height: number;
  block_hash: string;
  address: string;
  tx_id: string;
  location: string;
  output: string;
  value: number;
  offset: number;
  timestamp: number;
}

export interface InscriptionsFilters extends PaginationParams {
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
  address?: string[];
  recursive?: boolean;
  cursed?: boolean;
  order_by?: 'genesis_block_height' | 'ordinal' | 'rarity';
  order?: 'asc' | 'desc';
}

// ============================================
// Runes
// ============================================

export interface RuneEtching {
  id: string;
  name: string;
  spaced_name: string;
  number: number;
  divisibility: number;
  symbol: string;
  turbo: boolean;
  mint_terms?: {
    amount: string | null;
    cap: string | null;
    height_start: number | null;
    height_end: number | null;
    offset_start: number | null;
    offset_end: number | null;
  };
  supply: {
    current: string;
    minted: string;
    total_mints: string;
    mint_percentage: string;
    mintable: boolean;
    burned: string;
    premine: string;
    total_burns: string;
  };
  location: {
    block_hash: string;
    block_height: number;
    tx_id: string;
    tx_index: number;
    timestamp: number;
  };
}

export interface RuneHolder {
  address: string;
  balance: string;
}

export interface RuneActivity {
  rune: {
    id: string;
    name: string;
    spaced_name: string;
  };
  address: string;
  receiver_address?: string;
  amount: string;
  operation: 'etching' | 'mint' | 'burn' | 'send' | 'receive';
  location: {
    block_hash: string;
    block_height: number;
    tx_id: string;
    tx_index: number;
    timestamp: number;
    output?: string;
    vout?: number;
  };
}

export interface RuneBalance {
  rune: {
    id: string;
    name: string;
    spaced_name: string;
  };
  address: string;
  balance: string;
}

export interface RunesFilters extends PaginationParams {
  order_by?: 'name' | 'number' | 'block_height' | 'timestamp';
  order?: 'asc' | 'desc';
}

// ============================================
// BRC-20
// ============================================

export interface BRC20Token {
  ticker: string;
  max_supply: string;
  mint_limit: string;
  decimals: number;
  deploy_timestamp: number;
  minted_supply: string;
  tx_count: number;
  address: string;
  inscription_id: string;
  self_mint: boolean;
}

export interface BRC20TokenDetails extends BRC20Token {
  holders: number;
}

export interface BRC20Holder {
  address: string;
  overall_balance: string;
}

export interface BRC20Balance {
  ticker: string;
  available_balance: string;
  transferrable_balance: string;
  overall_balance: string;
}

export interface BRC20Activity {
  ticker: string;
  operation: 'deploy' | 'mint' | 'transfer' | 'transfer_send';
  address: string;
  to_address?: string;
  amount: string;
  inscription_id: string;
  block_height: number;
  timestamp: number;
  tx_id: string;
}

export interface BRC20Filters extends PaginationParams {
  ticker?: string;
  order_by?: 'deploy_timestamp' | 'tx_count' | 'minted_supply';
  order?: 'asc' | 'desc';
}

// ============================================
// Satoshis
// ============================================

export interface SatoshiInfo {
  ordinal: number;
  decimal: string;
  degree: string;
  name: string;
  block: number;
  cycle: number;
  epoch: number;
  period: number;
  offset: number;
  rarity: string;
  percentile: string;
  coinbase_height: number;
  inscriptions: string[];
}

// ============================================
// Statistics
// ============================================

export interface InscriptionStats {
  inscription_count: number;
  inscription_count_per_block: number;
}

export interface ApiStatus {
  server_version: string;
  status: string;
  block_height?: number;
}
