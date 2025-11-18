/**
 * Bitcoin Integration Canister - Candid IDL Factory
 * Handles UTXO management, transaction construction, and broadcasting
 */

export const idlFactory = ({ IDL }: any) => {
  const BitcoinNetwork = IDL.Variant({
    Mainnet: IDL.Null,
    Testnet: IDL.Null,
    Regtest: IDL.Null,
  });

  const BitcoinAddress = IDL.Record({
    address: IDL.Text,
    derivation_path: IDL.Vec(IDL.Vec(IDL.Nat8)),
  });

  const FeeEstimates = IDL.Record({
    slow: IDL.Nat64,
    medium: IDL.Nat64,
    fast: IDL.Nat64,
  });

  const MintTerms = IDL.Record({
    amount: IDL.Nat64,
    cap: IDL.Nat64,
    height_start: IDL.Opt(IDL.Nat64),
    height_end: IDL.Opt(IDL.Nat64),
    offset_start: IDL.Opt(IDL.Nat64),
    offset_end: IDL.Opt(IDL.Nat64),
  });

  const RuneEtching = IDL.Record({
    rune_name: IDL.Text,
    symbol: IDL.Text,
    divisibility: IDL.Nat8,
    premine: IDL.Nat64,
    terms: IDL.Opt(MintTerms),
  });

  const Outpoint = IDL.Record({
    txid: IDL.Vec(IDL.Nat8),
    vout: IDL.Nat32,
  });

  const Utxo = IDL.Record({
    outpoint: Outpoint,
    value: IDL.Nat64,
    height: IDL.Nat32,
  });

  const UtxoSelection = IDL.Record({
    selected: IDL.Vec(Utxo),
    total_value: IDL.Nat64,
    estimated_fee: IDL.Nat64,
    change: IDL.Nat64,
  });

  const Result = (T: any) => IDL.Variant({
    Ok: T,
    Err: IDL.Text,
  });

  return IDL.Service({
    // Address management
    get_p2tr_address: IDL.Func([], [Result(BitcoinAddress)], []),

    // Fee estimation
    get_fee_estimates: IDL.Func([], [Result(FeeEstimates)], []),

    // UTXO management
    select_utxos: IDL.Func(
      [IDL.Nat64, IDL.Nat64],
      [Result(UtxoSelection)],
      []
    ),

    // Transaction operations
    build_and_sign_etching_tx: IDL.Func(
      [RuneEtching, UtxoSelection],
      [Result(IDL.Vec(IDL.Nat8))],
      []
    ),
    broadcast_transaction: IDL.Func(
      [IDL.Vec(IDL.Nat8)],
      [Result(IDL.Text)],
      []
    ),

    // Blockchain queries
    get_block_height: IDL.Func([], [Result(IDL.Nat64)], []),

    // ckBTC operations
    get_ckbtc_balance: IDL.Func(
      [IDL.Principal],
      [Result(IDL.Nat64)],
      ['query']
    ),
  });
};
