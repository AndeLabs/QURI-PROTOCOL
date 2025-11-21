/**
 * Omnity Runes Indexer IDL
 *
 * Canister ID (Mainnet): kzrva-ziaaa-aaaar-qamyq-cai
 * Canister ID (Testnet): f2dwm-caaaa-aaaao-qjxlq-cai
 *
 * Docs: https://docs.omnity.network/docs/Runes-Indexer/apis
 */

export const idlFactory = ({ IDL }: { IDL: any }) => {
  // Rune Terms for minting
  const Terms = IDL.Record({
    cap: IDL.Opt(IDL.Nat),
    amount: IDL.Opt(IDL.Nat),
    height: IDL.Tuple(IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)),
    offset: IDL.Tuple(IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)),
  });

  // Complete Rune Entry with all metadata
  const RuneEntry = IDL.Record({
    confirmations: IDL.Nat32,
    mints: IDL.Nat,
    terms: IDL.Opt(Terms),
    divisibility: IDL.Nat8,
    premine: IDL.Nat,
    spaced_rune: IDL.Text,
    burned: IDL.Nat,
    etching: IDL.Text,
    symbol: IDL.Opt(IDL.Text),
    rune_id: IDL.Text,
    timestamp: IDL.Nat64,
    turbo: IDL.Bool,
    block: IDL.Nat64,
    supply: IDL.Nat,
  });

  // Result from get_etching
  const GetEtchingResult = IDL.Record({
    confirmations: IDL.Nat32,
    rune_id: IDL.Text,
  });

  // Rune balance for a specific output
  const RuneBalance = IDL.Record({
    rune_id: IDL.Text,
    amount: IDL.Nat,
    divisibility: IDL.Nat8,
    symbol: IDL.Opt(IDL.Text),
    spaced_rune: IDL.Text,
    confirmations: IDL.Nat32,
  });

  // Result type for balance queries
  const BalanceResult = IDL.Variant({
    Ok: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(RuneBalance))),
    Err: IDL.Text,
  });

  return IDL.Service({
    // Get rune_id from transaction ID
    get_etching: IDL.Func(
      [IDL.Text],
      [IDL.Opt(GetEtchingResult)],
      ['query']
    ),

    // Get latest indexed block
    get_latest_block: IDL.Func(
      [],
      [IDL.Nat32, IDL.Text],
      ['query']
    ),

    // Get rune by spaced name (e.g., "HOPE•YOU•GET•RICH")
    get_rune: IDL.Func(
      [IDL.Text],
      [IDL.Opt(RuneEntry)],
      ['query']
    ),

    // Get rune by ID (e.g., "840000:846")
    get_rune_by_id: IDL.Func(
      [IDL.Text],
      [IDL.Opt(RuneEntry)],
      ['query']
    ),

    // Get rune balances for transaction outputs
    get_rune_balances_for_outputs: IDL.Func(
      [IDL.Vec(IDL.Text)],
      [BalanceResult],
      ['query']
    ),
  });
};

// TypeScript types for Omnity Runes Indexer
export interface OmnityTerms {
  cap: [] | [bigint];
  amount: [] | [bigint];
  height: [[] | [bigint], [] | [bigint]];
  offset: [[] | [bigint], [] | [bigint]];
}

export interface OmnityRuneEntry {
  confirmations: number;
  mints: bigint;
  terms: [] | [OmnityTerms];
  divisibility: number;
  premine: bigint;
  spaced_rune: string;
  burned: bigint;
  etching: string; // txid
  symbol: [] | [string];
  rune_id: string;
  timestamp: bigint;
  turbo: boolean;
  block: bigint;
  supply: bigint;
}

export interface OmnityGetEtchingResult {
  confirmations: number;
  rune_id: string;
}

export interface OmnityRuneBalance {
  rune_id: string;
  amount: bigint;
  divisibility: number;
  symbol: [] | [string];
  spaced_rune: string;
  confirmations: number;
}

export type OmnityBalanceResult =
  | { Ok: Array<[string, OmnityRuneBalance[]]> }
  | { Err: string };

// Canister IDs
export const OMNITY_RUNES_CANISTER_ID = 'kzrva-ziaaa-aaaar-qamyq-cai';
export const OMNITY_RUNES_TESTNET_ID = 'f2dwm-caaaa-aaaao-qjxlq-cai';
