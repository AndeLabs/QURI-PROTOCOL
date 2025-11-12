/**
 * Candid Interface Definition for Octopus Runes Indexer
 * Auto-generated types for the indexer canister API
 */

export const idlFactory = ({ IDL }: any) => {
  const RuneId = IDL.Text;

  const BlockInfo = IDL.Record({
    height: IDL.Nat64,
    hash: IDL.Text,
  });

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
    get_latest_block: IDL.Func([], [BlockInfo], ['query']),
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
