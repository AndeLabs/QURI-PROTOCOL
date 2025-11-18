/**
 * Bitcoin Integration Canister - Complete TypeScript Types
 * Handles Bitcoin operations, UTXO management, Schnorr signing, ckBTC
 */

import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

// ============================================================================
// ENUMS & VARIANTS
// ============================================================================

export type BitcoinNetwork =
  | { Mainnet: null }
  | { Testnet: null }
  | { Regtest: null };

export type Result<T = null> =
  | { Ok: T }
  | { Err: string };

// ============================================================================
// BITCOIN TYPES
// ============================================================================

export interface BitcoinAddress {
  address: string;
  derivation_path: Uint8Array[];
}

export interface FeeEstimates {
  slow: bigint;
  medium: bigint;
  fast: bigint;
}

export interface Outpoint {
  txid: Uint8Array;
  vout: number;
}

export interface Utxo {
  outpoint: Outpoint;
  value: bigint;
  height: number;
}

export interface UtxoSelection {
  selected: Utxo[];
  total_value: bigint;
  estimated_fee: bigint;
  change: bigint;
}

// ============================================================================
// RUNE TYPES (for Bitcoin transactions)
// ============================================================================

export interface MintTerms {
  amount: bigint;
  cap: bigint;
  height_start: [] | [bigint];
  height_end: [] | [bigint];
  offset_start: [] | [bigint];
  offset_end: [] | [bigint];
}

export interface RuneEtching {
  rune_name: string;
  symbol: string;
  divisibility: number;
  premine: bigint;
  terms: [] | [MintTerms];
}

// ============================================================================
// ACTOR INTERFACE
// ============================================================================

export interface BitcoinIntegrationActor {
  // Address management
  get_p2tr_address: ActorMethod<[], Result<BitcoinAddress>>;

  // Fee estimation
  get_fee_estimates: ActorMethod<[], Result<FeeEstimates>>;

  // UTXO management
  select_utxos: ActorMethod<[bigint, bigint], Result<UtxoSelection>>;

  // Transaction operations
  build_and_sign_etching_tx: ActorMethod<[RuneEtching, UtxoSelection], Result<Uint8Array>>;
  broadcast_transaction: ActorMethod<[Uint8Array], Result<string>>;

  // Blockchain queries
  get_block_height: ActorMethod<[], Result<bigint>>;

  // ckBTC operations
  get_ckbtc_balance: ActorMethod<[Principal], Result<bigint>>;
}

// ============================================================================
// UTILITY TYPES FOR FRONTEND
// ============================================================================

/** Fee priority for user selection */
export type FeePriority = 'slow' | 'medium' | 'fast';

/** Fee estimate with USD equivalent */
export interface FeeEstimateWithUSD {
  satoshisPerVByte: number;
  estimatedSats: number;
  estimatedUSD: number;
  estimatedTime: string;
}

/** Bitcoin transaction info for display */
export interface BitcoinTransactionInfo {
  txid: string;
  confirmations: number;
  blockHeight?: number;
  timestamp?: Date;
  fee: bigint;
}

/** UTXO with formatted display data */
export interface FormattedUtxo {
  id: string;
  value: number;
  valueBTC: string;
  height: number;
  confirmations: number;
}
