/**
 * Omnity Runes Indexer Types
 * Types for interacting with the on-chain Bitcoin Runes indexer
 */

export interface Terms {
  amount: bigint | null;
  cap: bigint | null;
  height: [bigint | null, bigint | null];
  offset: [bigint | null, bigint | null];
}

export interface RuneEntry {
  confirmations: number;
  rune_id: string;
  block: bigint;
  burned: bigint;
  divisibility: number;
  etching: string;
  mints: bigint;
  number: bigint;
  premine: bigint;
  spaced_rune: string;
  symbol: string | null;
  terms: Terms | null;
  timestamp: bigint;
  turbo: boolean;
}

export interface GetEtchingResult {
  confirmations: number;
  rune_id: string;
}

export interface RuneBalance {
  confirmations: number;
  rune_id: string;
  amount: bigint;
  divisibility: number;
  symbol: string | null;
}

export type RuneBalancesResult =
  | { Ok: RuneBalance[][] }
  | { Err: { MaxOutpointsExceeded: null } };

/**
 * Formatted rune entry for display
 */
export interface FormattedRuneEntry {
  id: string;
  name: string;
  symbol: string;
  block: number;
  txIndex: number;
  confirmations: number;
  divisibility: number;
  premine: string;
  mints: string;
  burned: string;
  turbo: boolean;
  timestamp: Date;
  etching: string;
  terms: {
    amount: string | null;
    cap: string | null;
    heightStart: number | null;
    heightEnd: number | null;
    offsetStart: number | null;
    offsetEnd: number | null;
  } | null;
}

/**
 * Rune balance for display
 */
export interface FormattedRuneBalance {
  runeId: string;
  amount: string;
  symbol: string;
  divisibility: number;
  confirmations: number;
}
