/**
 * Rune Engine Canister Interface
 * Auto-generated from rune_engine.did
 */

import type { Principal } from '@dfinity/principal';

export const idlFactory = ({ IDL }: any) => {
  const BitcoinNetwork = IDL.Variant({
    'Mainnet' : IDL.Null,
    'Testnet' : IDL.Null,
    'Regtest' : IDL.Null,
  });
  
  const MintTerms = IDL.Record({
    'amount' : IDL.Nat64,
    'cap' : IDL.Nat64,
    'height_start' : IDL.Opt(IDL.Nat64),
    'height_end' : IDL.Opt(IDL.Nat64),
    'offset_start' : IDL.Opt(IDL.Nat64),
    'offset_end' : IDL.Opt(IDL.Nat64),
  });
  
  const RuneEtching = IDL.Record({
    'rune_name' : IDL.Text,
    'symbol' : IDL.Text,
    'divisibility' : IDL.Nat8,
    'premine' : IDL.Nat64,
    'terms' : IDL.Opt(MintTerms),
  });
  
  const EtchingProcessView = IDL.Record({
    'id' : IDL.Text,
    'rune_name' : IDL.Text,
    'state' : IDL.Text,
    'created_at' : IDL.Nat64,
    'updated_at' : IDL.Nat64,
    'retry_count' : IDL.Nat32,
    'txid' : IDL.Opt(IDL.Text),
  });
  
  const EtchingConfigView = IDL.Record({
    'network' : BitcoinNetwork,
    'fee_rate' : IDL.Nat64,
    'required_confirmations' : IDL.Nat32,
    'enable_retries' : IDL.Bool,
  });
  
  const HealthStatus = IDL.Record({
    'healthy' : IDL.Bool,
    'etching_config_initialized' : IDL.Bool,
    'bitcoin_integration_configured' : IDL.Bool,
    'registry_configured' : IDL.Bool,
    'canister_id' : IDL.Principal,
  });
  
  const Result = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  
  return IDL.Service({
    'cleanup_old_processes' : IDL.Func([IDL.Nat64], [IDL.Nat64], []),
    'configure_canisters' : IDL.Func([IDL.Principal, IDL.Principal], [Result_1], []),
    'create_rune' : IDL.Func([RuneEtching], [Result], []),
    'get_etching_status' : IDL.Func([IDL.Text], [IDL.Opt(EtchingProcessView)], ['query']),
    'get_my_etchings' : IDL.Func([], [IDL.Vec(EtchingProcessView)], ['query']),
    'health_check' : IDL.Func([], [HealthStatus], ['query']),
    'update_etching_config' : IDL.Func([EtchingConfigView], [Result_1], []),
  });
};

export interface _SERVICE {
  'cleanup_old_processes' : (arg_0: bigint) => Promise<bigint>,
  'configure_canisters' : (arg_0: Principal, arg_1: Principal) => Promise<{ 'Ok' : null } | { 'Err' : string }>,
  'create_rune' : (arg_0: RuneEtching) => Promise<{ 'Ok' : string } | { 'Err' : string }>,
  'get_etching_status' : (arg_0: string) => Promise<[] | [EtchingProcessView]>,
  'get_my_etchings' : () => Promise<Array<EtchingProcessView>>,
  'health_check' : () => Promise<HealthStatus>,
  'update_etching_config' : (arg_0: EtchingConfigView) => Promise<{ 'Ok' : null } | { 'Err' : string }>,
}

export interface BitcoinNetwork {
  'Mainnet' : null,
  'Testnet' : null,
  'Regtest' : null,
}

export interface MintTerms {
  'amount' : bigint,
  'cap' : bigint,
  'height_start' : [] | [bigint],
  'height_end' : [] | [bigint],
  'offset_start' : [] | [bigint],
  'offset_end' : [] | [bigint],
}

export interface RuneEtching {
  'rune_name' : string,
  'symbol' : string,
  'divisibility' : number,
  'premine' : bigint,
  'terms' : [] | [MintTerms],
}

export interface EtchingProcessView {
  'id' : string,
  'rune_name' : string,
  'state' : string,
  'created_at' : bigint,
  'updated_at' : bigint,
  'retry_count' : number,
  'txid' : [] | [string],
}

export interface EtchingConfigView {
  'network' : BitcoinNetwork,
  'fee_rate' : bigint,
  'required_confirmations' : number,
  'enable_retries' : boolean,
}

export interface HealthStatus {
  'healthy' : boolean,
  'etching_config_initialized' : boolean,
  'bitcoin_integration_configured' : boolean,
  'registry_configured' : boolean,
  'canister_id' : Principal,
}
