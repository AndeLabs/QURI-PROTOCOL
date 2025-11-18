/**
 * Candid Interface Definition for Octopus Runes Indexer
 * Auto-generated types for the indexer canister API
 */

export const idlFactory = ({ IDL }: any) => {
  const RuneId = IDL.Text;

  // BlockInfo is returned as a tuple, not a record
  // The API returns: (nat32, text) where first element is height, second is hash

  const Terms = IDL.Record({
    amount: IDL.Nat,
    cap: IDL.Nat,
    height_start: IDL.Opt(IDL.Nat64),
    height_end: IDL.Opt(IDL.Nat64),
    offset_start: IDL.Opt(IDL.Nat64),
    offset_end: IDL.Opt(IDL.Nat64),
  });

  const RuneEntry = IDL.Record({
    confirmations: IDL.Nat32,
    rune_id: RuneId,
    mints: IDL.Nat,
    terms: IDL.Opt(Terms),
    etching: IDL.Text,
    turbo: IDL.Bool,
    premine: IDL.Nat,
    divisibility: IDL.Nat8,
    spaced_rune: IDL.Text,
    sequence: IDL.Nat32,
    timestamp: IDL.Nat64,
    block: IDL.Nat64,
    burned: IDL.Nat,
    symbol: IDL.Opt(IDL.Text),
  });

  const OutPoint = IDL.Record({
    txid: IDL.Text,
    vout: IDL.Nat32,
  });

  const RuneBalance = IDL.Record({
    rune_id: RuneId,
    amount: IDL.Nat,
  });

  return IDL.Service({
    // FIXED: get_latest_block returns (nat32, text) tuple, not BlockInfo record
    // According to official documentation: returns (block_height: nat32, block_hash: text)
    get_latest_block: IDL.Func([], [IDL.Tuple(IDL.Nat32, IDL.Text)], ['query']),
    get_etching: IDL.Func([IDL.Text], [IDL.Opt(RuneId)], ['query']),
    get_rune: IDL.Func([IDL.Text], [IDL.Opt(RuneEntry)], ['query']),
    get_rune_by_id: IDL.Func([RuneId], [IDL.Opt(RuneEntry)], ['query']),
    get_rune_balances_for_outputs: IDL.Func(
      [IDL.Vec(OutPoint)],
      [IDL.Vec(IDL.Vec(RuneBalance))],
      ['query']
    ),
  });
};
