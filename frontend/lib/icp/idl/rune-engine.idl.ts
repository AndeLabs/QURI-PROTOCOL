import { IDL } from '@dfinity/candid';

const BitcoinNetwork = IDL.Variant({
  Mainnet: IDL.Null,
  Testnet: IDL.Null,
  Regtest: IDL.Null,
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

const EtchingProcessView = IDL.Record({
  id: IDL.Text,
  rune_name: IDL.Text,
  state: IDL.Text,
  created_at: IDL.Nat64,
  updated_at: IDL.Nat64,
  retry_count: IDL.Nat32,
  txid: IDL.Opt(IDL.Text),
});

const EtchingConfigView = IDL.Record({
  network: BitcoinNetwork,
  fee_rate: IDL.Nat64,
  required_confirmations: IDL.Nat32,
  enable_retries: IDL.Bool,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Result = (ok: any, err: any) =>
  IDL.Variant({
    Ok: ok,
    Err: err,
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const idlFactory = ({ IDL }: { IDL: any }) => {
  return IDL.Service({
    create_rune: IDL.Func([RuneEtching], [Result(IDL.Text, IDL.Text)], []),
    get_etching_status: IDL.Func([IDL.Text], [IDL.Opt(EtchingProcessView)], ['query']),
    get_my_etchings: IDL.Func([], [IDL.Vec(EtchingProcessView)], ['query']),
    configure_canisters: IDL.Func([IDL.Principal, IDL.Principal], [Result(IDL.Null, IDL.Text)], []),
    update_etching_config: IDL.Func([EtchingConfigView], [Result(IDL.Null, IDL.Text)], []),
    cleanup_old_processes: IDL.Func([IDL.Nat64], [IDL.Nat64], []),
  });
};
