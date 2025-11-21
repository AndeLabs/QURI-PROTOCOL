/**
 * Omnity Runes Indexer IDL
 * Canister IDs:
 * - Mainnet: kzrva-ziaaa-aaaar-qamyq-cai
 * - Testnet4: f2dwm-caaaa-aaaao-qjxlq-cai
 */

export const idlFactory = ({ IDL }: { IDL: any }) => {
  const Terms = IDL.Record({
    amount: IDL.Opt(IDL.Nat),
    cap: IDL.Opt(IDL.Nat),
    height: IDL.Tuple(IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)),
    offset: IDL.Tuple(IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)),
  });

  const RuneEntry = IDL.Record({
    confirmations: IDL.Nat32,
    rune_id: IDL.Text,
    block: IDL.Nat64,
    burned: IDL.Nat,
    divisibility: IDL.Nat8,
    etching: IDL.Text,
    mints: IDL.Nat,
    number: IDL.Nat64,
    premine: IDL.Nat,
    spaced_rune: IDL.Text,
    symbol: IDL.Opt(IDL.Text),
    terms: IDL.Opt(Terms),
    timestamp: IDL.Nat64,
    turbo: IDL.Bool,
  });

  const GetEtchingResult = IDL.Record({
    confirmations: IDL.Nat32,
    rune_id: IDL.Text,
  });

  const RuneBalance = IDL.Record({
    confirmations: IDL.Nat32,
    rune_id: IDL.Text,
    amount: IDL.Nat,
    divisibility: IDL.Nat8,
    symbol: IDL.Opt(IDL.Text),
  });

  const Error = IDL.Variant({
    MaxOutpointsExceeded: IDL.Null,
  });

  const Result = IDL.Variant({
    Ok: IDL.Vec(IDL.Vec(RuneBalance)),
    Err: Error,
  });

  return IDL.Service({
    get_latest_block: IDL.Func([], [IDL.Nat32, IDL.Text], ['query']),
    get_etching: IDL.Func([IDL.Text], [IDL.Opt(GetEtchingResult)], ['query']),
    get_rune: IDL.Func([IDL.Text], [IDL.Opt(RuneEntry)], ['query']),
    get_rune_by_id: IDL.Func([IDL.Text], [IDL.Opt(RuneEntry)], ['query']),
    get_rune_balances_for_outputs: IDL.Func([IDL.Vec(IDL.Text)], [Result], ['query']),
  });
};

export const init = ({ IDL }: { IDL: any }) => {
  return [];
};
